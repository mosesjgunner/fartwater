'use client';

import { useEffect, useState } from 'react';

type LeaderboardMember = {
  rank: number;
  userId: number;
  discordId: string | null;
  discordName: string | null;
  xp: number;
  totalBounties: number;
  walletDiscordFivePackBounties: number;
  manualAdminBounties: number;
};

export function CommunityLeaderboard() {
  const [members, setMembers] = useState<LeaderboardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/leaderboard/community', { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to load leaderboard');
        }

        const next = Array.isArray(data?.members) ? (data.members as LeaderboardMember[]) : [];
        if (active) {
          setMembers(next);
        }
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Failed to load leaderboard';
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      id="community"
      className="py-20 bg-[radial-gradient(1000px_500px_at_0%_0%,rgba(0,255,195,.12),transparent_55%),radial-gradient(1000px_500px_at_100%_100%,rgba(217,70,239,.12),transparent_55%)]"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold diamond-text">Community Leaderboard</h2>
          <p className="mt-2 text-zinc-300">
            Ranked by bounties first, then XP.
          </p>
        </div>

        <div className="mt-8 card chrome-border p-4 md:p-6">
          {loading && (
            <p className="text-zinc-300 text-sm">Loading leaderboard...</p>
          )}

          {!loading && error && (
            <p className="text-red-300 text-sm">{error}</p>
          )}

          {!loading && !error && members.length === 0 && (
            <p className="text-zinc-300 text-sm">No community members yet.</p>
          )}

          {!loading && !error && members.length > 0 && (
            <>
              <p className="text-zinc-400 text-xs mb-3">
                {members.length} community members
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-zinc-300">
                      <th className="text-left py-2 pr-3 font-semibold">Rank</th>
                      <th className="text-left py-2 pr-3 font-semibold">Member</th>
                      <th className="text-right py-2 pr-3 font-semibold">Bounties</th>
                      <th className="text-right py-2 font-semibold">XP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.userId} className="border-b border-white/5">
                        <td className="py-2 pr-3 text-cyan-300 font-semibold">#{member.rank}</td>
                        <td className="py-2 pr-3 text-zinc-100">
                          {member.discordName || `Community User #${member.userId}`}
                        </td>
                        <td className="py-2 pr-3 text-right text-yellow-300 font-semibold">
                          {member.totalBounties}
                        </td>
                        <td className="py-2 text-right text-green-300 font-semibold">
                          {member.xp}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
