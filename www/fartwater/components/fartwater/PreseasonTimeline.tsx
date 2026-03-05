"use client";

import Script from "next/script";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { arcKey, characterKey, type PreseasonIndexItem } from "@/lib/preseason";

type EmbedState = {
  loading: boolean;
  html?: string;
  error?: string;
};

type PreseasonTimelineProps = {
  entries: PreseasonIndexItem[];
  initialDay: number | null;
  initialArc: string | null;
  initialPost: string | null;
};

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PreseasonTimeline({
  entries,
  initialDay,
  initialArc,
  initialPost,
}: PreseasonTimelineProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [dayFilter, setDayFilter] = useState<number | null>(initialDay);
  const [arcFilter, setArcFilter] = useState<string | null>(initialArc);
  const [characterFilters, setCharacterFilters] = useState<string[]>([]);
  const [openPostId, setOpenPostId] = useState<string | null>(initialPost);
  const [embedStateById, setEmbedStateById] = useState<Record<string, EmbedState>>({});

  const maxDay = useMemo(
    () => entries.reduce((max, item) => Math.max(max, item.day), 1),
    [entries]
  );
  const dayOptions = useMemo(
    () => Array.from({ length: maxDay }, (_, index) => index + 1),
    [maxDay]
  );
  const arcOptions = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const item of entries) {
      byKey.set(arcKey(item.arc), item.arc);
    }
    return Array.from(byKey.entries()).map(([key, label]) => ({ key, label }));
  }, [entries]);
  const characterOptions = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const item of entries) {
      for (const character of item.characters) {
        byKey.set(characterKey(character), character);
      }
    }
    return Array.from(byKey.entries()).map(([key, label]) => ({ key, label }));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((item) => {
      if (dayFilter !== null && item.day !== dayFilter) return false;
      if (arcFilter !== null && arcKey(item.arc) !== arcFilter) return false;
      if (characterFilters.length > 0) {
        const characters = item.characters.map((character) => characterKey(character));
        if (!characterFilters.some((filter) => characters.includes(filter))) return false;
      }
      return true;
    });
  }, [arcFilter, characterFilters, dayFilter, entries]);

  const syncQuery = useCallback(
    (next: { day?: number | null; arc?: string | null; post?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (next.day) params.set("day", String(next.day));
      else params.delete("day");

      if (next.arc) params.set("arc", next.arc);
      else params.delete("arc");

      if (next.post) params.set("post", next.post);
      else params.delete("post");

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const loadEmbed = useCallback(
    async (entry: PreseasonIndexItem) => {
      if (!entry.tweet_url) return;

      setEmbedStateById((current) => ({
        ...current,
        [entry.id]: { loading: true },
      }));

      try {
        const params = new URLSearchParams();
        params.set("url", entry.tweet_url);
        params.set("maxwidth", "560");

        const response = await fetch(`/api/x/oembed?${params.toString()}`);
        const body = (await response.json()) as {
          error?: string;
          payload?: { html?: string };
        };

        if (!response.ok || !body.payload?.html) {
          throw new Error(body.error ?? "Unable to load embed");
        }

        setEmbedStateById((current) => ({
          ...current,
          [entry.id]: { loading: false, html: body.payload?.html },
        }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load post embed";
        setEmbedStateById((current) => ({
          ...current,
          [entry.id]: { loading: false, error: message },
        }));
      }
    },
    []
  );

  useEffect(() => {
    if (!openPostId) return;
    const entry = entries.find((item) => item.id === openPostId);
    const state = openPostId ? embedStateById[openPostId] : undefined;
    if (entry?.tweet_url && !state?.html && !state?.loading) {
      void loadEmbed(entry);
    }
  }, [embedStateById, entries, loadEmbed, openPostId]);

  useEffect(() => {
    const twttr = (window as any).twttr;
    if (!openPostId || !twttr?.widgets?.load) return;
    const state = embedStateById[openPostId];
    if (state?.html) twttr.widgets.load();
  }, [embedStateById, openPostId]);

  useEffect(() => {
    if (!openPostId) return;
    const stillVisible = filteredEntries.some((item) => item.id === openPostId);
    if (!stillVisible) {
      setOpenPostId(null);
      syncQuery({ day: dayFilter, arc: arcFilter, post: null });
    }
  }, [arcFilter, dayFilter, filteredEntries, openPostId, syncQuery]);

  return (
    <section id="preseason" className="py-20 tone-casino">
      <Script src="https://platform.twitter.com/widgets.js" strategy="afterInteractive" />
      <div className="mx-auto max-w-7xl px-4">
        <h1 className="text-3xl md:text-5xl font-extrabold diamond-text">Preseason Timeline</h1>
        <p className="mt-3 text-zinc-300 max-w-3xl">
          Navigate the canon map by day, arc, and characters. Cards load real X embeds on
          demand for fast browsing and stable ordering.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[300px,1fr]">
          <aside className="card chrome-border p-5 h-fit lg:sticky lg:top-24">
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-400">Day Selector</div>
              <div className="mt-3 grid grid-cols-5 gap-2">
                <button
                  onClick={() => {
                    setDayFilter(null);
                    syncQuery({ day: null, arc: arcFilter, post: openPostId });
                  }}
                  className={`rounded-lg px-2 py-1 text-xs font-bold ${
                    dayFilter === null
                      ? "bg-yellow-400 text-black"
                      : "bg-white/10 text-zinc-200 hover:bg-white/20"
                  }`}
                >
                  All
                </button>
                {dayOptions.map((day) => (
                  <button
                    key={day}
                    onClick={() => {
                      setDayFilter(day);
                      syncQuery({ day, arc: arcFilter, post: openPostId });
                    }}
                    className={`rounded-lg px-2 py-1 text-xs font-bold ${
                      dayFilter === day
                        ? "bg-yellow-400 text-black"
                        : "bg-white/10 text-zinc-200 hover:bg-white/20"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="text-xs uppercase tracking-wide text-zinc-400">Arcs</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setArcFilter(null);
                    syncQuery({ day: dayFilter, arc: null, post: openPostId });
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    arcFilter === null
                      ? "bg-teal-300 text-black"
                      : "bg-white/10 text-zinc-200 hover:bg-white/20"
                  }`}
                >
                  All Arcs
                </button>
                {arcOptions.map((arc) => (
                  <button
                    key={arc.key}
                    onClick={() => {
                      setArcFilter(arc.key);
                      syncQuery({ day: dayFilter, arc: arc.key, post: openPostId });
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      arcFilter === arc.key
                        ? "bg-teal-300 text-black"
                        : "bg-white/10 text-zinc-200 hover:bg-white/20"
                    }`}
                  >
                    {arc.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="text-xs uppercase tracking-wide text-zinc-400">Characters</div>
              <div className="mt-3 space-y-2">
                {characterOptions.map((character) => {
                  const selected = characterFilters.includes(character.key);
                  return (
                    <label
                      key={character.key}
                      className="flex items-center justify-between text-sm text-zinc-200 cursor-pointer"
                    >
                      <span>{character.label}</span>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          setCharacterFilters((current) =>
                            selected
                              ? current.filter((item) => item !== character.key)
                              : [...current, character.key]
                          )
                        }
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className="space-y-4">
            {filteredEntries.length === 0 && (
              <div className="card chrome-border p-6">
                <h2 className="text-xl font-bold">No Posts Match Current Filters</h2>
                <p className="mt-2 text-zinc-300">
                  Clear one or more filters to restore timeline cards.
                </p>
              </div>
            )}

            {filteredEntries.map((entry) => {
              const state = embedStateById[entry.id];
              const isOpen = openPostId === entry.id;
              return (
                <article key={entry.id} className="card chrome-border p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm text-zinc-300">
                      Day {entry.day} · {formatDate(entry.date)}
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{entry.arc}</span>
                  </div>

                  <h3 className="mt-3 text-2xl text-[var(--gold)]">{entry.title}</h3>
                  <p className="mt-2 text-zinc-200">{entry.summary}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {entry.characters.map((character) => (
                      <span
                        key={character}
                        className="rounded-full bg-black/35 border border-white/10 px-3 py-1 text-xs text-zinc-200"
                      >
                        {character}
                      </span>
                    ))}
                  </div>

                  {entry.thumb && (
                    <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
                      <img
                        src={entry.thumb}
                        alt={`${entry.title} thumbnail`}
                        className="w-full h-44 object-cover"
                      />
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        const nextOpen = isOpen ? null : entry.id;
                        setOpenPostId(nextOpen);
                        syncQuery({ day: dayFilter, arc: arcFilter, post: nextOpen });
                        if (!isOpen && entry.tweet_url && !state?.html && !state?.loading) {
                          void loadEmbed(entry);
                        }
                      }}
                      className="px-4 py-2 rounded-lg font-bold text-black bg-[linear-gradient(90deg,var(--gold),#fff)] disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!entry.tweet_url}
                    >
                      {entry.tweet_url ? (isOpen ? "Hide Post" : "Load Post") : "Post URL Pending"}
                    </button>
                    <a
                      href={entry.tweet_url ?? "https://x.com/6fartwater9"}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-lg font-bold border border-white/20 text-zinc-100 hover:bg-white/10"
                    >
                      Open on X
                    </a>
                  </div>

                  {isOpen && (
                    <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-4">
                      {state?.loading && <p className="text-sm text-zinc-300">Loading embed...</p>}
                      {state?.error && (
                        <p className="text-sm text-red-300">
                          {state.error}. Retry from the button above.
                        </p>
                      )}
                      {state?.html && (
                        <div dangerouslySetInnerHTML={{ __html: state.html }} />
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
