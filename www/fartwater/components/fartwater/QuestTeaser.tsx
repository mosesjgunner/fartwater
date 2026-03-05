import Link from 'next/link';

export function QuestTeaser() {
  return (
    <section
      id="quests"
      className="py-20 bg-[radial-gradient(1200px_500px_at_0%_0%,rgba(0,255,195,.14),transparent_55%),radial-gradient(1200px_500px_at_100%_100%,rgba(217,70,239,.14),transparent_55%)]"
    >
      <div className="mx-auto max-w-7xl px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold diamond-text">Airdrop + Contests Board</h2>
        <p className="mt-2 text-zinc-300">Farm XP, stack bounties, and climb the weekly race.</p>
        <div className="mt-8 mx-auto max-w-3xl card chrome-border p-6 text-left">
          <ul className="text-zinc-300 space-y-2">
            <li>* Verify wallet + Discord, then unlock your full quest board</li>
            <li>* Run daily check-ins and complete social quests for XP</li>
            <li>* Use referrals to earn bounties and bonus rewards</li>
            <li>* Submit meme entries for high-XP contest payouts</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="inline-block px-6 py-3 text-black rounded-lg font-bold bg-[linear-gradient(90deg,var(--purple),var(--pink))]"
              href="/quests"
            >
              Open Quest Board
            </Link>
            <a
              className="inline-block px-6 py-3 rounded-lg font-bold border border-white/20 text-zinc-100 hover:bg-white/5 transition-colors"
              href="#community"
            >
              View Leaderboard
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
