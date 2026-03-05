#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_HANDLE = '6fartwater9';
const DEFAULT_INDEX_PATH = 'data/preseason-index.json';
const DEFAULT_ARC = 'PreBonded';
const FETCH_TIMEOUT_MS = 15000;
const TWITTER_EPOCH_MS = 1288834974657n;

function printHelp() {
  console.log(`Usage: node scripts/sync-prebonding-archive.mjs [options]

Options:
  --handle <name>      X handle to scrape (default: ${DEFAULT_HANDLE})
  --index <path>       Index file path (default: ${DEFAULT_INDEX_PATH})
  --arc <name>         Arc name to update (default: ${DEFAULT_ARC})
  --urls-file <path>   Optional text file with one or more X status URLs
  --force              Replace existing tweet_url values for matching arc
  --dry-run            Print proposed changes without writing file
  --verbose            Print source-by-source fetch details
  -h, --help           Show this help
`);
}

function parseArgs(argv) {
  const options = {
    handle: DEFAULT_HANDLE,
    indexPath: DEFAULT_INDEX_PATH,
    arc: DEFAULT_ARC,
    urlsFilePath: null,
    force: false,
    dryRun: false,
    verbose: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      options.help = true;
      continue;
    }
    if (arg === '--force') {
      options.force = true;
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--verbose') {
      options.verbose = true;
      continue;
    }

    const [name, inlineValue] = arg.split('=', 2);
    if (name === '--handle') {
      options.handle = inlineValue ?? argv[++i];
      continue;
    }
    if (name === '--index') {
      options.indexPath = inlineValue ?? argv[++i];
      continue;
    }
    if (name === '--arc') {
      options.arc = inlineValue ?? argv[++i];
      continue;
    }
    if (name === '--urls-file') {
      options.urlsFilePath = inlineValue ?? argv[++i];
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.handle) throw new Error('Missing value for --handle');
  if (!options.indexPath) throw new Error('Missing value for --index');
  if (!options.arc) throw new Error('Missing value for --arc');
  if (options.urlsFilePath === '') {
    throw new Error('Missing value for --urls-file');
  }

  return options;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; FartWaterArchiveSync/1.0)',
      },
      redirect: 'follow',
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function readTextFileAuto(filePath) {
  const buffer = await readFile(filePath);
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.slice(2).toString('utf16le');
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    const swapped = Buffer.allocUnsafe(buffer.length - 2);
    for (let i = 2; i + 1 < buffer.length; i += 2) {
      swapped[i - 2] = buffer[i + 1];
      swapped[i - 1] = buffer[i];
    }
    return swapped.toString('utf16le');
  }
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.slice(3).toString('utf8');
  }
  return buffer.toString('utf8');
}

function normalizeCdata(value) {
  return value.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
}

function extractXmlTag(block, tagName) {
  const pattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i');
  const match = block.match(pattern);
  if (!match) return null;
  return normalizeCdata(match[1]);
}

function canonicalStatusUrl(rawUrl, fallbackHandle = null) {
  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname !== 'x.com' &&
      hostname !== 'www.x.com' &&
      hostname !== 'twitter.com' &&
      hostname !== 'www.twitter.com' &&
      hostname !== 'mobile.twitter.com'
    ) {
      return null;
    }

    const profileMatch = parsed.pathname.match(/^\/([A-Za-z0-9_]+)\/status\/(\d+)/);
    if (profileMatch) {
      const handle = profileMatch[1];
      const statusId = profileMatch[2];
      return `https://x.com/${handle}/status/${statusId}`;
    }

    const genericMatch = parsed.pathname.match(/^\/i(?:\/web)?\/status\/(\d+)/);
    if (genericMatch) {
      const statusId = genericMatch[1];
      if (fallbackHandle) return `https://x.com/${fallbackHandle}/status/${statusId}`;
      return `https://x.com/i/web/status/${statusId}`;
    }

    return null;
  } catch {
    return null;
  }
}

function statusIdFromUrl(url) {
  const match = url.match(/\/status\/(\d+)/);
  return match ? match[1] : null;
}

function snowflakeToDate(statusId) {
  try {
    const value = BigInt(statusId);
    const timestampMs = Number((value >> 22n) + TWITTER_EPOCH_MS);
    if (!Number.isFinite(timestampMs)) return null;
    const date = new Date(timestampMs);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

function toDateKey(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function mergePost(existing, incoming) {
  if (!existing) return incoming;
  if (!existing.publishedAt && incoming.publishedAt) {
    return incoming;
  }
  return existing;
}

function dedupePosts(posts) {
  const byId = new Map();
  for (const post of posts) {
    const merged = mergePost(byId.get(post.statusId), post);
    byId.set(post.statusId, merged);
  }
  return Array.from(byId.values());
}

function parseRssPosts(xml, sourceLabel, fallbackHandle) {
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  const posts = [];

  for (const item of items) {
    const candidates = [
      extractXmlTag(item, 'link'),
      extractXmlTag(item, 'guid'),
      extractXmlTag(item, 'id'),
    ].filter(Boolean);

    let url = null;
    for (const candidate of candidates) {
      const maybe = canonicalStatusUrl(candidate, fallbackHandle);
      if (maybe) {
        url = maybe;
        break;
      }
    }
    if (!url) continue;

    const statusId = statusIdFromUrl(url);
    if (!statusId) continue;

    const publishedAt =
      parseDateValue(extractXmlTag(item, 'pubDate')) ??
      parseDateValue(extractXmlTag(item, 'dc:date')) ??
      snowflakeToDate(statusId);

    posts.push({ source: sourceLabel, url, statusId, publishedAt });
  }

  return posts;
}

function parseTextPosts(text, sourceLabel, fallbackHandle) {
  const regex =
    /https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/(?:[A-Za-z0-9_]+\/status\/\d+|i(?:\/web)?\/status\/\d+)/gi;
  const matches = text.match(regex) ?? [];
  const posts = [];

  for (const match of matches) {
    const url = canonicalStatusUrl(match, fallbackHandle);
    if (!url) continue;
    const statusId = statusIdFromUrl(url);
    if (!statusId) continue;
    posts.push({
      source: sourceLabel,
      url,
      statusId,
      publishedAt: snowflakeToDate(statusId),
    });
  }

  return posts;
}

async function scrapePosts(handle, verbose) {
  const rssSources = [
    `https://nitter.net/${handle}/rss`,
    `https://nitter.poast.org/${handle}/rss`,
    `https://rsshub.app/twitter/user/${handle}`,
  ];
  const textSources = [`https://r.jina.ai/http://x.com/${handle}`];

  const posts = [];

  for (const url of rssSources) {
    try {
      const xml = await fetchText(url);
      const parsed = parseRssPosts(xml, url, handle);
      if (verbose) {
        console.log(`[rss] ${url}: ${parsed.length} candidate posts`);
      }
      posts.push(...parsed);
    } catch (error) {
      if (verbose) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`[rss] ${url}: failed (${message})`);
      }
    }
  }

  if (posts.length === 0) {
    for (const url of textSources) {
      try {
        const text = await fetchText(url);
        const parsed = parseTextPosts(text, url, handle);
        if (verbose) {
          console.log(`[text] ${url}: ${parsed.length} candidate posts`);
        }
        posts.push(...parsed);
      } catch (error) {
        if (verbose) {
          const message = error instanceof Error ? error.message : String(error);
          console.log(`[text] ${url}: failed (${message})`);
        }
      }
    }
  }

  return dedupePosts(posts);
}

function sortByPublishedTimeAscending(posts) {
  return [...posts].sort((a, b) => {
    const aTime = a.publishedAt ? a.publishedAt.getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.publishedAt ? b.publishedAt.getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
}

function bucketPostsByDate(posts) {
  const buckets = new Map();
  for (const post of sortByPublishedTimeAscending(posts)) {
    if (!post.publishedAt) continue;
    const dayKey = toDateKey(post.publishedAt);
    const list = buckets.get(dayKey) ?? [];
    list.push(post);
    buckets.set(dayKey, list);
  }
  return buckets;
}

function normalizeArc(value) {
  return String(value).trim().toLowerCase();
}

function cloneEntry(entry) {
  return JSON.parse(JSON.stringify(entry));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const indexPath = resolve(options.indexPath);
  const raw = await readFile(indexPath, 'utf8');
  const index = JSON.parse(raw);

  if (!Array.isArray(index)) {
    throw new Error(`Index file is not an array: ${indexPath}`);
  }

  const arcKey = normalizeArc(options.arc);
  const targetEntries = index
    .filter((entry) => normalizeArc(entry?.arc) === arcKey)
    .sort((a, b) => Number(a.day) - Number(b.day));

  if (targetEntries.length === 0) {
    throw new Error(`No entries found for arc "${options.arc}" in ${indexPath}`);
  }

  const scrapedPosts = await scrapePosts(options.handle, options.verbose);

  let filePosts = [];
  if (options.urlsFilePath) {
    const filePath = resolve(options.urlsFilePath);
    const fileText = await readTextFileAuto(filePath);
    filePosts = dedupePosts(parseTextPosts(fileText, `file:${filePath}`, options.handle));
    if (options.verbose) {
      console.log(`[file] ${filePath}: ${filePosts.length} candidate posts`);
    }
  }
  const posts = dedupePosts([...scrapedPosts, ...filePosts]);
  if (posts.length === 0) {
    throw new Error(
      'No X posts discovered. Try --urls-file data/prebonding-urls.txt with one status URL per line.'
    );
  }

  const postBuckets = bucketPostsByDate(posts);
  const usedStatusIds = new Set();

  for (const entry of index) {
    const id = entry?.tweet_url ? statusIdFromUrl(String(entry.tweet_url)) : null;
    if (id) usedStatusIds.add(id);
  }

  const updates = [];
  for (const entry of targetEntries) {
    const currentUrl = entry.tweet_url ? String(entry.tweet_url) : null;
    if (currentUrl && !options.force) {
      continue;
    }

    const candidates = postBuckets.get(String(entry.date)) ?? [];
    const next = candidates.find((post) => !usedStatusIds.has(post.statusId));
    if (!next) continue;

    if (currentUrl && options.force) {
      const currentId = statusIdFromUrl(currentUrl);
      if (currentId) usedStatusIds.delete(currentId);
    }

    entry.tweet_url = next.url;
    usedStatusIds.add(next.statusId);
    updates.push({
      id: entry.id,
      day: entry.day,
      date: entry.date,
      title: entry.title,
      tweet_url: next.url,
      source: next.source,
    });
  }

  const pending = targetEntries
    .filter((entry) => !entry.tweet_url)
    .map((entry) => cloneEntry(entry));

  const summary = {
    runAt: new Date().toISOString(),
    handle: options.handle,
    arc: options.arc,
    totalArcEntries: targetEntries.length,
    discoveredPosts: posts.length,
    scrapedPosts: scrapedPosts.length,
    filePosts: filePosts.length,
    updatedEntries: updates.length,
    pendingEntries: pending.length,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (updates.length > 0) {
    console.log('\nUpdated entries:');
    for (const update of updates) {
      console.log(
        `- Day ${update.day} (${update.date}) ${update.id}: ${update.tweet_url} [${update.source}]`
      );
    }
  } else {
    console.log('\nNo arc entries were updated.');
  }

  if (pending.length > 0) {
    console.log('\nStill pending tweet_url:');
    for (const entry of pending) {
      console.log(`- Day ${entry.day} (${entry.date}) ${entry.id}`);
    }
  }

  if (options.dryRun) {
    console.log('\nDry run enabled. No files written.');
    return;
  }

  await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  console.log(`\nWrote updated index: ${indexPath}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`sync-prebonding-archive failed: ${message}`);
  process.exitCode = 1;
});
