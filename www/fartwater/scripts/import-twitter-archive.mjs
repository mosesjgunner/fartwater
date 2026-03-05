#!/usr/bin/env node

import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, relative, resolve } from 'node:path';

const DEFAULT_HANDLE = '6fartwater9';
const DEFAULT_INDEX_PATH = 'data/preseason-index.json';
const DEFAULT_MEDIA_OUT_DIR = 'public/img/archive';
const PREBONDING_SEASON_START = '2026-02-02';
const PREBONDING_SEASON_ARC = 'PreBonding Season';
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function printHelp() {
  console.log(`Usage: node scripts/import-twitter-archive.mjs --archive <folder> [options]

Options:
  --archive <path>            Path to extracted X archive folder (required)
  --index <path>              Path to preseason index JSON (default: ${DEFAULT_INDEX_PATH})
  --handle <name>             X handle for status links (default: ${DEFAULT_HANDLE})
  --media-out <path>          Output media folder under /public (default: ${DEFAULT_MEDIA_OUT_DIR})
  --max-day-distance <n>      Match fallback window by day distance (default: 0)
  --rebuild-index             Regenerate index from archive tweets (ignores existing rows)
  --include-replies           Include replies when matching tweets to entries
  --allow-no-media            Allow entries to map to tweets without local image media
  --replace-existing          Replace existing tweet_url/thumb values
  --force                     Alias for --replace-existing
  --dry-run                   Print changes without writing files
  --verbose                   Print extra diagnostics
  -h, --help                  Show help
`);
}

function parseArgs(argv) {
  const options = {
    archiveRoot: null,
    indexPath: DEFAULT_INDEX_PATH,
    handle: DEFAULT_HANDLE,
    mediaOutDir: DEFAULT_MEDIA_OUT_DIR,
    maxDayDistance: 0,
    rebuildIndex: false,
    includeReplies: false,
    requireMedia: true,
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
    if (arg === '--include-replies') {
      options.includeReplies = true;
      continue;
    }
    if (arg === '--rebuild-index') {
      options.rebuildIndex = true;
      continue;
    }
    if (arg === '--allow-no-media') {
      options.requireMedia = false;
      continue;
    }
    if (arg === '--force' || arg === '--replace-existing') {
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
    const value = inlineValue ?? argv[++i];

    if (name === '--archive') {
      options.archiveRoot = value;
      continue;
    }
    if (name === '--index') {
      options.indexPath = value;
      continue;
    }
    if (name === '--handle') {
      options.handle = value;
      continue;
    }
    if (name === '--media-out') {
      options.mediaOutDir = value;
      continue;
    }
    if (name === '--max-day-distance') {
      options.maxDayDistance = Number(value);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.archiveRoot && !options.help) {
    throw new Error('Missing required --archive path');
  }
  if (!Number.isInteger(options.maxDayDistance) || options.maxDayDistance < 0) {
    throw new Error('--max-day-distance must be a non-negative integer');
  }

  return options;
}

function toDateKey(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseTwitterDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractTweetsArray(raw) {
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('Unable to parse tweets.js payload');
  }
  const payload = raw.slice(start, end + 1);
  const parsed = JSON.parse(payload);
  if (!Array.isArray(parsed)) {
    throw new Error('tweets.js payload is not an array');
  }
  return parsed;
}

function statusIdFromTweetUrl(value) {
  if (!value) return null;
  const match = String(value).match(/\/status\/(\d+)/);
  return match ? match[1] : null;
}

function addDays(dateKey, offset) {
  const base = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return null;
  base.setUTCDate(base.getUTCDate() + offset);
  return toDateKey(base);
}

function isImageFileName(fileName) {
  return IMAGE_EXTENSIONS.has(extname(fileName).toLowerCase());
}

function extractTweetId(tweet) {
  const value = tweet?.id_str ?? tweet?.id;
  if (!value) return null;
  const id = String(value).trim();
  return /^\d+$/.test(id) ? id : null;
}

async function buildMediaIndex(mediaDir) {
  const map = new Map();
  let files = [];
  try {
    files = await readdir(mediaDir, { withFileTypes: true });
  } catch {
    return map;
  }

  for (const entry of files) {
    if (!entry.isFile()) continue;
    const fullName = entry.name;
    const dash = fullName.indexOf('-');
    if (dash <= 0) continue;
    const statusId = fullName.slice(0, dash);
    if (!/^\d+$/.test(statusId)) continue;
    const list = map.get(statusId) ?? [];
    list.push(resolve(mediaDir, fullName));
    map.set(statusId, list);
  }

  for (const list of map.values()) {
    list.sort((a, b) => a.localeCompare(b));
  }

  return map;
}

function firstImageMedia(mediaFiles) {
  if (!mediaFiles || mediaFiles.length === 0) return null;
  const image = mediaFiles.find((filePath) => isImageFileName(basename(filePath)));
  return image ?? null;
}

function publicUrlFromAbsoluteFile(publicRoot, targetFile) {
  const rel = relative(publicRoot, targetFile);
  if (!rel || rel.startsWith('..')) {
    throw new Error(`Media output path must be inside /public: ${targetFile}`);
  }
  return `/${rel.split('\\').join('/')}`;
}

function selectCandidate(dateKey, byDate, usedStatusIds, maxDayDistance) {
  for (let distance = 0; distance <= maxDayDistance; distance += 1) {
    const offsets = distance === 0 ? [0] : [distance, -distance];
    for (const offset of offsets) {
      const key = addDays(dateKey, offset);
      if (!key) continue;
      const list = byDate.get(key);
      if (!list || list.length === 0) continue;
      const found = list.find((item) => !usedStatusIds.has(item.statusId));
      if (found) return found;
    }
  }
  return null;
}

function normalizeText(raw) {
  return String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildTweetRecord(tweet, handle, mediaByStatusId) {
  const statusId = extractTweetId(tweet);
  const createdAt = parseTwitterDate(tweet?.created_at);
  if (!statusId || !createdAt) return null;

  const mediaFiles = mediaByStatusId.get(statusId) ?? [];
  const thumbSource = firstImageMedia(mediaFiles);
  const hasMedia = Boolean(
    (tweet?.extended_entities?.media?.length ?? 0) > 0 ||
      (tweet?.entities?.media?.length ?? 0) > 0
  );
  const mentions =
    tweet?.entities?.user_mentions?.map((mention) => String(mention?.screen_name ?? '').trim()) ??
    [];

  return {
    statusId,
    createdAt,
    dateKey: toDateKey(createdAt),
    url: `https://x.com/${handle}/status/${statusId}`,
    text: normalizeText(tweet?.full_text),
    isReply: Boolean(tweet?.in_reply_to_status_id_str),
    retweeted: Boolean(tweet?.retweeted),
    hasMedia,
    mentions,
    thumbSource,
  };
}

function monthArcLabel(date) {
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    year: 'numeric',
  });
}

function arcLabelForDate(dateKey, date) {
  if (dateKey >= PREBONDING_SEASON_START) {
    return PREBONDING_SEASON_ARC;
  }
  return monthArcLabel(date);
}

function stripUrls(text) {
  return text.replace(/https?:\/\/\S+/gi, '').replace(/\s+/g, ' ').trim();
}

function buildTitle(text, statusId) {
  const cleaned = stripUrls(text).replace(/^@\w+\s+/g, '').trim();
  if (!cleaned) return `Post ${statusId}`;
  const max = 70;
  return cleaned.length > max ? `${cleaned.slice(0, max - 1).trimEnd()}...` : cleaned;
}

function buildSummary(text, statusId) {
  const cleaned = stripUrls(text).trim();
  if (!cleaned) return `Archive post ${statusId}.`;
  const max = 220;
  return cleaned.length > max ? `${cleaned.slice(0, max - 1).trimEnd()}...` : cleaned;
}

function buildCharacters(mentions) {
  const set = new Set(['Moses']);
  for (const mention of mentions) {
    if (!mention) continue;
    if (set.size >= 4) break;
    set.add(`@${mention}`);
  }
  return Array.from(set);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const archiveRoot = resolve(options.archiveRoot);
  const indexPath = resolve(options.indexPath);
  const mediaOutDir = resolve(options.mediaOutDir);
  const publicRoot = resolve('public');
  const relToPublic = relative(publicRoot, mediaOutDir);
  if (relToPublic.startsWith('..')) {
    throw new Error(`--media-out must stay under /public (got: ${options.mediaOutDir})`);
  }

  const tweetsJsPath = resolve(archiveRoot, 'data', 'tweets.js');
  const tweetsMediaDir = resolve(archiveRoot, 'data', 'tweets_media');

  const [tweetsJsRaw, indexRaw, mediaByStatusId] = await Promise.all([
    readFile(tweetsJsPath, 'utf8'),
    readFile(indexPath, 'utf8'),
    buildMediaIndex(tweetsMediaDir),
  ]);

  const tweetWrapper = extractTweetsArray(tweetsJsRaw);
  const allTweetRecords = tweetWrapper
    .map((item) => buildTweetRecord(item?.tweet, options.handle, mediaByStatusId))
    .filter(Boolean)
    .sort((a, b) => {
      const timeDelta = a.createdAt.getTime() - b.createdAt.getTime();
      return timeDelta !== 0 ? timeDelta : a.statusId.localeCompare(b.statusId);
    });

  const candidates = allTweetRecords.filter((record) => {
    if (record.retweeted) return false;
    if (!options.includeReplies && record.isReply) return false;
    if (options.requireMedia && !record.hasMedia) return false;
    return true;
  });

  const candidatesByDate = new Map();
  for (const record of candidates) {
    const list = candidatesByDate.get(record.dateKey) ?? [];
    list.push(record);
    candidatesByDate.set(record.dateKey, list);
  }

  const byStatusId = new Map(allTweetRecords.map((record) => [record.statusId, record]));

  if (options.rebuildIndex) {
    if (!options.dryRun) {
      await mkdir(mediaOutDir, { recursive: true });
    }

    const generated = [];
    let copiedMediaFiles = 0;

    for (let i = 0; i < candidates.length; i += 1) {
      const record = candidates[i];
      let thumb = null;

      if (record.thumbSource) {
        const destinationName = basename(record.thumbSource);
        const destinationPath = resolve(mediaOutDir, destinationName);
        if (!options.dryRun) {
          await copyFile(record.thumbSource, destinationPath);
        }
        thumb = publicUrlFromAbsoluteFile(publicRoot, destinationPath);
        copiedMediaFiles += 1;
      }

      generated.push({
        id: `post-${record.statusId}`,
        day: i + 1,
        date: record.dateKey,
        arc: arcLabelForDate(record.dateKey, record.createdAt),
        characters: buildCharacters(record.mentions),
        tweet_url: record.url,
        title: buildTitle(record.text, record.statusId),
        summary: buildSummary(record.text, record.statusId),
        thumb,
      });
    }

    const summary = {
      runAt: new Date().toISOString(),
      archiveRoot,
      tweetsInArchive: allTweetRecords.length,
      candidateTweets: candidates.length,
      generatedEntries: generated.length,
      copiedMediaFiles,
      dryRun: options.dryRun,
    };

    console.log(JSON.stringify(summary, null, 2));

    if (options.verbose) {
      console.log('\nFirst 10 generated entries:');
      for (const entry of generated.slice(0, 10)) {
        console.log(`- Day ${entry.day} ${entry.date} ${entry.id} (${entry.arc})`);
      }
    }

    if (options.dryRun) {
      console.log('\nDry run enabled. No files written.');
      return;
    }

    await writeFile(indexPath, `${JSON.stringify(generated, null, 2)}\n`, 'utf8');
    console.log(`\nWrote rebuilt index: ${indexPath}`);
    return;
  }

  const index = JSON.parse(indexRaw);
  if (!Array.isArray(index)) {
    throw new Error(`Index file is not an array: ${indexPath}`);
  }

  const usedStatusIds = new Set();
  if (!options.force) {
    for (const entry of index) {
      const statusId = statusIdFromTweetUrl(entry?.tweet_url);
      if (statusId) usedStatusIds.add(statusId);
    }
  }

  if (!options.dryRun) {
    await mkdir(mediaOutDir, { recursive: true });
  }

  const entriesByDay = [...index]
    .filter((entry) => Number.isFinite(Number(entry?.day)))
    .sort((a, b) => Number(a.day) - Number(b.day));

  let updatedCount = 0;
  let mediaCopiedCount = 0;
  const updates = [];

  for (const entry of entriesByDay) {
    const shouldUpdateUrl = options.force || !entry.tweet_url;
    const shouldUpdateThumb = options.force || !entry.thumb;
    if (!shouldUpdateUrl && !shouldUpdateThumb) continue;

    const existingStatusId = statusIdFromTweetUrl(entry.tweet_url);
    let candidate = existingStatusId ? byStatusId.get(existingStatusId) ?? null : null;

    if (!candidate && shouldUpdateUrl) {
      candidate = selectCandidate(
        String(entry.date),
        candidatesByDate,
        usedStatusIds,
        options.maxDayDistance
      );
    }

    if (!candidate) continue;

    const previousUrl = entry.tweet_url ?? null;
    const previousThumb = entry.thumb ?? null;

    if (shouldUpdateUrl) {
      entry.tweet_url = candidate.url;
      usedStatusIds.add(candidate.statusId);
    }

    if (shouldUpdateThumb && candidate.thumbSource) {
      const destinationName = basename(candidate.thumbSource);
      const destinationPath = resolve(mediaOutDir, destinationName);
      if (!options.dryRun) {
        await copyFile(candidate.thumbSource, destinationPath);
      }
      entry.thumb = publicUrlFromAbsoluteFile(publicRoot, destinationPath);
      mediaCopiedCount += 1;
    }

    const changed = entry.tweet_url !== previousUrl || entry.thumb !== previousThumb;
    if (!changed) continue;

    updatedCount += 1;
    updates.push({
      id: entry.id,
      day: entry.day,
      date: entry.date,
      statusId: candidate.statusId,
      tweet_url: entry.tweet_url ?? null,
      thumb: entry.thumb ?? null,
      textPreview: candidate.text.slice(0, 90),
    });
  }

  const summary = {
    runAt: new Date().toISOString(),
    archiveRoot,
    tweetsInArchive: allTweetRecords.length,
    candidateTweets: candidates.length,
    updatedEntries: updatedCount,
    copiedMediaFiles: mediaCopiedCount,
    dryRun: options.dryRun,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (updates.length > 0) {
    console.log('\nUpdated entries:');
    for (const update of updates) {
      console.log(
        `- Day ${update.day} (${update.date}) ${update.id} -> ${update.tweet_url ?? 'null'} | ${update.thumb ?? 'null'}`
      );
      if (options.verbose && update.textPreview) {
        console.log(`  text: ${update.textPreview}`);
      }
    }
  } else {
    console.log('\nNo entries were updated.');
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
  console.error(`import-twitter-archive failed: ${message}`);
  process.exitCode = 1;
});
