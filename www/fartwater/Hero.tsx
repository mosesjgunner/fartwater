export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_10%_0%,#facc15,transparent_35%),radial-gradient(circle_at_90%_0%,#00ffc3,transparent_35%),radial-gradient(circle_at_30%_100%,#a855f7,transparent_35%)]" />
      <div className="mx-auto max-w-7xl px-4 py-16 md:py-20 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight diamond-text">Hydration meets Finance</h1>
          <p className="mt-4 text-zinc-300 max-w-xl">The official $FRTWTR site. Satire vibes, real utility. Clear CTAs above the fold.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a className="px-5 py-3 rounded-xl bg-yellow-300 text-black font-semibold" href="#vip">VIP Check</a>
            <a className="px-5 py-3 rounded-xl border border-white/20 hover:bg-white/10" href="/quests">Quests</a>
            <a className="px-5 py-3 rounded-xl border border-white/20 hover:bg-white/10" href="#token">Token Info</a>
          </div>
          <ul className="mt-6 text-sm text-zinc-400 grid grid-cols-2 gap-y-1 max-w-md">
            <li>* Ticker: $FRTWTR</li>
            <li>* Chain: Solana</li>
            <li>* Launch: Dec 12, 2025</li>
            <li>* Blog: fartwater.fun/blog</li>
          </ul>
        </div>
        <div className="relative mx-auto w-full max-w-xl">
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40">
            <img src="/img/fartwaterdope.jpg" alt="FARTWATER jeweled logo" className="w-full h-auto object-cover"/>
          </div>
          <div className="absolute -inset-2 -z-10 rounded-3xl blur-2xl bg-[radial-gradient(600px_300px_at_70%_0%,rgba(217,70,239,.35),transparent_60%),radial-gradient(600px_300px_at_0%_100%,rgba(0,255,195,.35),transparent_60%)]" />
        </div>
      </div>
    </section>
  );
}
