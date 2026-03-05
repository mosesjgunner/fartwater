"use client";

import XFeed from "./xfeed";

export default function PreseasonLiveFeed() {
  return (
    <section id="preseason" className="py-20 tone-casino">
      <div className="mx-auto max-w-7xl px-4">
        <div className="card chrome-border p-6">
          <h1 className="text-3xl md:text-5xl font-extrabold diamond-text">
            Preseason Live Feed
          </h1>
          <p className="mt-3 text-zinc-300 max-w-3xl">
            This view is fully driven by X. New posts appear here automatically without
            redeploying the website.
          </p>
          <div className="mt-5">
            <XFeed screenName="6fartwater9" height={1200} />
          </div>
        </div>
      </div>
    </section>
  );
}
