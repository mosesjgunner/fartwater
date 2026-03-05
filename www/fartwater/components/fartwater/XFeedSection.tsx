import XFeed from "./xfeed";

export function XFeedSection() {
  return (
    <section
      id="xfeed"
      className="py-20 bg-[radial-gradient(900px_500px_at_0%_0%,rgba(168,85,247,.10),transparent_60%),radial-gradient(900px_500px_at_100%_100%,rgba(0,255,195,.10),transparent_60%)]"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="card p-6 chrome-border">
          <h2 className="text-3xl md:text-4xl font-extrabold diamond-text">$FRTWTR X Feed</h2>
          <p className="mt-2 text-zinc-300 text-sm">
            Live dispatches from @6fartwater9. Follow for drops, clips, and episode alerts.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <a
              href="https://x.com/6fartwater9"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-lg font-bold text-black bg-[linear-gradient(90deg,var(--gold),#fff)]"
            >
              Follow on X
            </a>
            <a
              href="#episodes"
              className="px-4 py-2 rounded-lg font-bold border border-white/20 text-zinc-100 hover:bg-white/10"
            >
              Jump to Season 1
            </a>
          </div>
          <div className="mt-4">
            <XFeed />
          </div>
        </div>
      </div>
    </section>
  );
}
