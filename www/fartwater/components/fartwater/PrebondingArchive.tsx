import Link from 'next/link';
import { getPreseasonIndex } from '@/lib/preseason';

function formatDate(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PrebondingArchive() {
  const entries = getPreseasonIndex().filter(
    (entry) => entry.arc.toLowerCase() === 'prebonded'
  );
  const linkedCount = entries.filter((entry) => Boolean(entry.tweet_url)).length;
  const pendingCount = entries.length - linkedCount;

  if (entries.length === 0) return null;

  return (
    <section
      id="prebonding-archive"
      className="py-20 bg-[radial-gradient(900px_500px_at_0%_0%,rgba(250,204,21,.12),transparent_60%),radial-gradient(900px_500px_at_100%_100%,rgba(20,184,166,.14),transparent_60%)]"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold diamond-text">
              PreBonding Archive
            </h2>
            <p className="mt-2 text-zinc-300 max-w-2xl">
              Locked timeline for the PreBonded run. Each day maps to the canon post
              once the X URL is synced.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/preseason"
              className="px-4 py-2 rounded-lg font-bold text-black bg-[linear-gradient(90deg,var(--gold),#fff)]"
            >
              Open Live Feed
            </Link>
            <a
              href="https://x.com/6fartwater9"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-lg font-bold border border-white/20 text-zinc-100 hover:bg-white/10"
            >
              Profile on X
            </a>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[320px,1fr] items-start">
          <aside className="card chrome-border p-5 xl:sticky xl:top-24">
            <h3 className="text-lg font-semibold text-[var(--gold)]">Archive Status</h3>
            <div className="mt-3 text-sm text-zinc-300">
              <div>Total days indexed: {entries.length}</div>
              <div className="mt-1">Posts linked: {linkedCount}</div>
              <div className="mt-1">Posts pending: {pendingCount}</div>
            </div>
            <p className="mt-4 text-xs text-zinc-400">
              URLs come from your X timeline and can be refreshed without changing the UI.
            </p>
          </aside>

          <div className="space-y-3">
            {entries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-xl border border-white/10 bg-black/25 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-zinc-400">
                    Day {entry.day} | {formatDate(entry.date)}
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                    {entry.arc}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-bold text-zinc-100">{entry.title}</h3>
                <p className="mt-1 text-sm text-zinc-300">{entry.summary}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {entry.characters.map((character) => (
                    <span
                      key={character}
                      className="rounded-full bg-black/35 border border-white/10 px-2 py-1 text-[11px] text-zinc-200"
                    >
                      {character}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <a
                    href={entry.tweet_url ?? 'https://x.com/6fartwater9'}
                    target="_blank"
                    rel="noreferrer"
                    className={`px-4 py-2 rounded-lg font-bold ${
                      entry.tweet_url
                        ? 'text-black bg-[linear-gradient(90deg,var(--gold),#fff)]'
                        : 'border border-white/20 text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    {entry.tweet_url ? 'Open Post' : 'Post URL Pending'}
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
