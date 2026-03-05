"use client";

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

type XFeedProps = {
  screenName?: string;
  height?: number;
};

function profileUrl(screenName: string) {
  return `https://twitter.com/${screenName}?ref_src=twsrc%5Etfw`;
}

export default function XFeed({ screenName = '6fartwater9', height = 600 }: XFeedProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [embedded, setEmbedded] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20;
    const pollMs = 700;

    setEmbedded(false);
    setUseIframeFallback(false);

    const tryRender = (): boolean => {
      const container = containerRef.current;
      if (!container) return false;

      const twttr = (window as any).twttr;
      if (twttr?.widgets?.load) {
        try {
          twttr.widgets.load(container);
        } catch {
          // Ignore transient runtime failures and retry.
        }
        if (container.querySelector('iframe')) {
          setEmbedded(true);
          setUseIframeFallback(false);
          return true;
        }
      }

      attempts += 1;
      if (attempts >= maxAttempts) {
        setEmbedded(false);
        setUseIframeFallback(true);
        return true;
      }
      return false;
    };

    if (tryRender()) return;
    const timer = window.setInterval(() => {
      if (tryRender()) {
        window.clearInterval(timer);
      }
    }, pollMs);

    return () => window.clearInterval(timer);
  }, [height, screenName]);

  return (
    <div className="w-full">
      <Script
        src="https://platform.twitter.com/widgets.js"
        strategy="afterInteractive"
        onError={() => setUseIframeFallback(true)}
      />
      <div ref={containerRef} className={useIframeFallback ? 'hidden' : undefined}>
        <a
          className="twitter-timeline"
          data-theme="dark"
          data-height={height}
          data-chrome="nofooter noborders"
          data-dnt="true"
          href={profileUrl(screenName)}
        >
          Tweets by @{screenName}
        </a>
      </div>

      {useIframeFallback && (
        <iframe
          title={`X feed for @${screenName}`}
          src={`https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(screenName)}?dnt=true`}
          className="w-full rounded-lg border border-white/10 bg-black"
          style={{ height }}
          loading="lazy"
        />
      )}

      {!embedded && !useIframeFallback && (
        <div className="mt-3 text-sm text-zinc-400">
          Feed loading. If it does not appear, open on X:{' '}
          <a
            href={`https://x.com/${screenName}`}
            target="_blank"
            rel="noreferrer"
            className="text-zinc-200 hover:text-white underline underline-offset-2"
          >
            @{screenName}
          </a>
        </div>
      )}
      <noscript>
        <a href={`https://x.com/${screenName}`} target="_blank" rel="noreferrer">
          View @{screenName} on X
        </a>
      </noscript>
    </div>
  );
}
