'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import preseasonIndex from '@/data/preseason-index.json';
import XFeed from './xfeed';

type FutureEpisode = {
  code: string;
  city: string;
  beats: string[];
  imgs: { src: string; cap: string }[];
};

type ArchiveEntry = {
  id: string;
  day: number;
  date: string;
  arc: string;
  characters: string[];
  tweet_url: string | null;
  thumb?: string | null;
  title: string;
  summary: string;
};

type Track = {
  id: 'live' | 'archive' | 'future';
  label: string;
  title: string;
  description: string;
};

const tracks: Track[] = [
  {
    id: 'live',
    label: 'PreBonded Live',
    title: 'PreBonded Season (Live Now)',
    description: 'Real-time feed from X. This is the active season stream.',
  },
  {
    id: 'archive',
    label: 'Preseason Archive',
    title: 'Preseason Archive',
    description: 'Canon archive for preseason posts up through February 22.',
  },
  {
    id: 'future',
    label: 'Future Preview',
    title: 'Future Season Preview',
    description: 'Current image/data set as a look ahead for upcoming season drops.',
  },
];

const futureEpisodes: FutureEpisode[] = [
  {
    code: 'S1E1',
    city: 'Atlanta',
    beats: ['Glizzy Gravy', 'BTC ATM omen slips', 'Coupon Treasury'],
    imgs: [
      { src: '/img/s1e1-1.jpg', cap: 'Gas station prophecy' },
      { src: '/img/s1e1-2.jpg', cap: 'BTC ATM omen slips' },
      { src: '/img/s1e1-3.jpg', cap: 'Coupon Treasury sketch' },
    ],
  },
  {
    code: 'S1E2',
    city: 'St. Louis',
    beats: ['Gateway liquidity', 'Busch chaos', 'Geyser baptism'],
    imgs: [
      { src: '/img/s1e2-1.jpg', cap: 'Arch liquidity' },
      { src: '/img/s1e2-2.jpg', cap: 'Geyser baptism' },
      { src: '/img/s1e2-3.jpg', cap: 'Busch chaos' },
    ],
  },
  {
    code: 'S1E3',
    city: 'New York City',
    beats: ['Bootleg phones', 'Hydration Minutes', 'Tow + raid'],
    imgs: [
      { src: '/img/s1e3-1.jpg', cap: 'Bootleg phones' },
      { src: '/img/s1e3-2.jpg', cap: 'Hydration Minutes' },
      { src: '/img/s1e3-3.jpg', cap: 'Tow + raid' },
    ],
  },
  {
    code: 'S1E4',
    city: 'Los Angeles',
    beats: ['Wellness velvet', 'Sauna Antenna', 'Popeyes Break Down'],
    imgs: [
      { src: '/img/s1e4-1.jpg', cap: 'Wellness Tent' },
      { src: '/img/s1e4-2.png', cap: 'Del Taco Tears' },
      { src: '/img/s1e4-3.jpg', cap: 'Luda County Fair' },
    ],
  },
];

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function EpisodesGallery() {
  const [trackIndex, setTrackIndex] = useState(0);
  const [episodeIndex, setEpisodeIndex] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);

  const currentTrack = tracks[trackIndex];
  const currentEpisode = futureEpisodes[episodeIndex];

  const archiveEntries = useMemo(() => {
    const cutoff = new Date('2026-02-22T23:59:59Z').getTime();
    return (preseasonIndex as ArchiveEntry[])
      .filter((entry) => {
        const timestamp = new Date(entry.date).getTime();
        return Number.isNaN(timestamp) || timestamp <= cutoff;
      })
      .sort((a, b) => a.day - b.day);
  }, []);

  const latestArchiveDay = archiveEntries.reduce((max, entry) => Math.max(max, entry.day), 0);

  function prevTrack() {
    setTrackIndex((previous) => (previous - 1 + tracks.length) % tracks.length);
  }

  function nextTrack() {
    setTrackIndex((previous) => (previous + 1) % tracks.length);
  }

  function prevFutureFrame() {
    setFrameIndex((previous) => (previous - 1 + currentEpisode.imgs.length) % currentEpisode.imgs.length);
  }

  function nextFutureFrame() {
    setFrameIndex((previous) => (previous + 1) % currentEpisode.imgs.length);
  }

  return (
    <section id="episodes" className="py-20 tone-casino">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold diamond-text">Season Carousel</h2>
            <p className="mt-2 text-zinc-300">{currentTrack.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={prevTrack}
              className="px-3 py-2 rounded-lg font-bold text-black bg-[linear-gradient(90deg,var(--gold),#fff)]"
            >
              Prev
            </button>
            <button
              onClick={nextTrack}
              className="px-3 py-2 rounded-lg font-bold text-black bg-[linear-gradient(90deg,var(--gold),#fff)]"
            >
              Next
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {tracks.map((track, index) => (
            <button
              key={track.id}
              onClick={() => setTrackIndex(index)}
              className={`px-4 py-2 rounded-full font-bold transition-all ${
                trackIndex === index ? 'bg-yellow-400 text-black' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {track.label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          <div className="card chrome-border p-6">
            <h3 className="text-2xl text-[var(--gold)]">{currentTrack.title}</h3>

            {currentTrack.id === 'live' && (
              <div className="mt-5 grid gap-6 xl:grid-cols-[1fr,320px] items-start">
                <XFeed screenName="6fartwater9" height={860} />
                <div className="card chrome-border p-5">
                  <div className="text-sm text-zinc-300">
                    This feed updates from X automatically. No site update required when new posts
                    go live.
                  </div>
                  <a
                    href="https://x.com/6fartwater9"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-block px-4 py-2 rounded-lg font-bold text-black bg-[linear-gradient(90deg,var(--gold),#fff)]"
                  >
                    Open Profile on X
                  </a>
                </div>
              </div>
            )}

            {currentTrack.id === 'archive' && (
              <div className="mt-5 grid gap-6 xl:grid-cols-[340px,1fr] items-start">
                <div className="card chrome-border p-5">
                  <div className="text-sm text-zinc-300">
                    Archive coverage target: February 22, 2026.
                  </div>
                  <div className="mt-3 text-sm text-zinc-400">
                    Current indexed entries: {archiveEntries.length} (through Day {latestArchiveDay || '--'}).
                  </div>
                  <a
                    href="https://x.com/6fartwater9"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-block px-4 py-2 rounded-lg font-bold border border-white/20 text-zinc-100 hover:bg-white/10"
                  >
                    Browse Full X Timeline
                  </a>
                </div>

                <div className="max-h-[860px] overflow-y-auto pr-2 space-y-3">
                  {archiveEntries.map((entry) => (
                    <article key={entry.id} className="rounded-xl border border-white/10 bg-black/25 p-4">
                      <div className="text-xs text-zinc-400">
                        Day {entry.day} - {formatDate(entry.date)} - {entry.arc}
                      </div>
                      <h4 className="mt-1 text-lg font-bold text-zinc-100">{entry.title}</h4>
                      <p className="mt-1 text-sm text-zinc-300">{entry.summary}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {entry.characters.map((character) => (
                          <span
                            key={character}
                            className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-zinc-200"
                          >
                            {character}
                          </span>
                        ))}
                      </div>
                      {entry.thumb && (
                        <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
                          <Image
                            src={entry.thumb}
                            alt={`${entry.title} thumbnail`}
                            width={640}
                            height={360}
                            className="h-44 w-full object-cover"
                          />
                        </div>
                      )}
                      <div className="mt-3">
                        {entry.tweet_url ? (
                          <a
                            href={entry.tweet_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block rounded-lg border border-white/20 px-3 py-2 text-xs font-bold text-zinc-100 hover:bg-white/10"
                          >
                            Open Post
                          </a>
                        ) : (
                          <span className="inline-block rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400">
                            Post URL Pending
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {currentTrack.id === 'future' && (
              <div className="mt-5 grid lg:grid-cols-2 gap-8 items-start">
                <div className="relative">
                  <div className="rounded-2xl overflow-hidden chrome-border card">
                    <div className="relative aspect-video bg-black/40 grid place-items-center">
                      <Image
                        src={currentEpisode.imgs[frameIndex]?.src}
                        alt={currentEpisode.imgs[frameIndex]?.cap || `${currentEpisode.code} still ${frameIndex + 1}`}
                        width={640}
                        height={360}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-3 text-sm bg-gradient-to-t from-black/70 to-transparent">
                        {currentEpisode.imgs[frameIndex]?.cap}
                      </div>
                      <button
                        aria-label="Prev Future Frame"
                        onClick={prevFutureFrame}
                        className="absolute left-2 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg font-bold text-black bg-[linear-gradient(90deg,var(--gold),#fff)]"
                      >
                        Prev
                      </button>
                      <button
                        aria-label="Next Future Frame"
                        onClick={nextFutureFrame}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg font-bold text-black bg-[linear-gradient(90deg,var(--gold),#fff)]"
                      >
                        Next
                      </button>
                    </div>
                    <div className="p-3 flex gap-2 overflow-x-auto snap-x">
                      {currentEpisode.imgs.map((img, index) => (
                        <button
                          key={`${img.src}-${index}`}
                          onClick={() => setFrameIndex(index)}
                          className={`snap-start shrink-0 w-24 h-16 rounded-md overflow-hidden border ${
                            frameIndex === index ? 'border-yellow-300' : 'border-white/10'
                          }`}
                        >
                          <Image
                            src={img.src}
                            alt={img.cap}
                            width={96}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="card chrome-border p-6">
                  <div className="mt-1 flex flex-wrap gap-3">
                    {futureEpisodes.map((episode, index) => (
                      <button
                        key={episode.code}
                        onClick={() => {
                          setEpisodeIndex(index);
                          setFrameIndex(0);
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-bold ${
                          episodeIndex === index
                            ? 'bg-yellow-400 text-black'
                            : 'bg-white/10 text-zinc-200 hover:bg-white/20'
                        }`}
                      >
                        {episode.city}
                      </button>
                    ))}
                  </div>

                  <h4 className="mt-5 text-2xl text-[var(--gold)]">
                    {currentEpisode.code} - {currentEpisode.city}
                  </h4>
                  <ul className="mt-4 text-zinc-100 space-y-2">
                    {currentEpisode.beats.map((beat) => (
                      <li key={beat}>* {beat}</li>
                    ))}
                  </ul>
                  <div className="mt-4 text-xs text-zinc-400">
                    Future look preview using current season image/data set.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
