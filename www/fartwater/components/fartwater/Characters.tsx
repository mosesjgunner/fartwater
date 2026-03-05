'use client';

import Image from 'next/image';
import { useState } from 'react';

type Profile = {
  name: string;
  x: string;
  title: string;
  bio: string;
  core: string;
  vision: string;
  img: string;
};

export function Characters() {
  const roster: Profile[] = [
    {
      name: 'Cornell "Nelly" Haynes Jr.',
      x: 'https://x.com/fartwaternelly',
      title: 'Chief Treasury Officer & Bond Strategist',
      bio: `Mr. Haynes manages the FartWater Coupon Treasury, the world's first pancake-backed sovereign wealth fund. A hawk on fiscal policy, he pioneered BOGOFi (Buy-One-Get-One Finance), a deflationary model that utilizes laminated casual-dining vouchers as stable collateral. He is committed to strict austerity measures and believes that true yield is found not in crypto, but in the sticky reliability of syrup-based assets.`,
      core: 'Asset-Backed Securities (Breakfast Class) & Coupon Clipping.',
      vision:
        'Markets crash. Gold fluctuates. But a short stack is a store of value. That is utility you can eat.',
      img: '/img/profile/nelly.png',
    },
    {
      name: 'Trevor "Busta Rhymes" Smith Jr.',
      x: 'https://x.com/fartwaterbusta',
      title: 'Director of Velocity & Consensus Throughput',
      bio: `Mr. Smith serves as the primary validator node for the FartWater network. He operates on a high-bandwidth frequency that guarantees transaction finality through pure acoustic volume. He oversees the HSL-401 (Hydration Speed Layer), a logistical grid designed to accelerate liquidity events faster than the human eye—or local power grids—can perceive. He believes that if you cannot hear the consensus, the transaction did not happen.`,
      core: 'High-Decibel Logistics & Grid Overloads.',
      vision:
        'SPEED IS SECURITY! CONSENSUS MUST BE AUDIBLE! WE ARE MOVING AT THE SPEED OF SOUND! LOOK AT THE CHART!',
      img: '/img/profile/busta.png',
    },
    {
      name: 'Jeffrey "Ja Rule" Atkins',
      x: 'https://x.com/FartwaterJaRule',
      title: 'Head of Physical Decentralization (ATM Operations)',
      bio: `Mr. Atkins bridges the gap between digital assets and physical reality through his proprietary "Fyre-Side" liquidity nodes. He oversees our fleet of autonomous transaction machines (ATMs), managing the complex algorithms of "Slippage" and "Wait Times." A visionary in the field of delayed gratification, Mr. Atkins ensures that user funds are kept safe by making them extremely difficult to withdraw.`,
      core: 'Hype-Based Banking & Indefinite Holds.',
      vision:
        "It is not a 'failed transaction.' It is a 'pre-order for future wealth.' The machine is simply thinking. Trust the process.",
      img: '/img/profile/jarule.png',
    },
    {
      name: 'Christopher "Ludacris" Bridges',
      x: 'https://x.com/69Ludacris3105',
      title: 'Head of Global Residencies & Stadium Relations',
      bio: `Mr. Bridges is a macro-scale event specialist who refuses to operate in micro-cap environments. He treats every FartWater activation—whether situated in a Class-A Arena or a Class-C Parking Lot—as a sold-out stadium residency. His proprietary "Headliner Doctrine" ensures that the brand maintains blue-chip visibility via pyrotechnics and crowd control protocols, regardless of actual attendance numbers.`,
      core: 'Venue Agnosticism & Crowd Size Inflation.',
      vision:
        'The zip code does not matter. The energy is the asset. If I am standing there, it is a stadium. That is the valuation.',
      img: '/img/profile/luda.png',
    },
    {
      name: 'Shad "Bow Wow" Moss',
      x: 'https://x.com/bowwowfartwater',
      title: 'VP of Strategic Partnerships & Caloric Acquisition',
      bio: `Mr. Moss spearheads our "Flex Meal" initiative, creating synergy between legacy fast-food infrastructure and decentralized hydration. He specializes in high-friction brand collaborations and "Distressed Inventory Recovery" (maximizing yield from corporate waste streams). He serves as the primary liaison for our food-backed stability pools, ensuring that FartWater remains pegged to the price of a pepperoni slice.`,
      core: 'Cross-Brand Synergies (Non-Consensual) & Lunch Vouchers.',
      vision:
        "We are activating the menu. Every crumb is collateral. I am merely the vessel for the brand's hunger.",
      img: '/img/profile/bowwow.png',
    },
    {
      name: 'William "Will" Smith',
      x: 'https://x.com/WillandSoulja',
      title: 'Chief Compliance Architect & Entanglement Specialist',
      bio: `Mr. Smith brings decades of emotional intelligence to the FartWater ecosystem. As the architect of our "Redemption-as-a-Service" (RaaS) protocol, he ensures that every liquidity event is grounded in radical transparency and spiritual alignment. He specializes in mitigating regulatory friction through "The Slap" of truth and the "Red Table" of reconciliation. His mandate is to foster an environment where brand safety is not just a policy, but a breathing exercise.`,
      core: 'Emotional Liquidity & Crisis Rebranding.',
      vision:
        'We do not simply sell water. We sell a subscription to forgiveness. Align your chakras with your market cap.',
      img: '/img/profile/will.png',
    },
    {
      name: 'DeAndre "Soulja Boy" Way',
      x: 'https://x.com/WillandSoulja',
      title: 'VP of First-Mover Innovation & Latency Strategy',
      bio: `A pioneer in digital-physical convergence, Mr. Way is legally recognized* (pending) as the inventor of the modern internet, the concept of hydration, and the meme coin vertical. As head of our R&D division, he leverages "Proof-of-First" consensus mechanisms to claim market share before markets technically exist. He specializes in "Latency Testing"—a proprietary method of announcing products years before development begins to capture early-bird sentiment.`,
      core: 'Pre-Market Penetration & Patent Generation (Crayon-Based).',
      vision:
        'I was the first to tokenize thirst. If it happens on the blockchain, I did it in 2007. Check the timestamps.',
      img: '/img/profile/soulja.png',
    },
    {
      name: 'Moses Gunner',
      x: 'https://x.com/mosesgunnerfart',
      title: 'Chief Operations Officer & Lead Auditor',
      bio: `Mr. Gunner creates the regulatory frameworks that allow FartWater to exist on the bleeding edge of compliance. A specialist in "Creative Permitting" and "Receipt-Based Governance," he ensures that all liquidity events meet the rigorous standards of his own clipboard. He operates on a 24/7 efficiency cycle, fueled by a proprietary blend of caffeine and anxiety, to ensure that the "FartLedger" remains the single source of truth.`,
      core: 'Regulatory Triage & Paperwork Fabrication.',
      vision:
        'Compliance is a spectrum. We prefer to operate on the infrared end—invisible to the naked eye, but warm to the touch.',
      img: '/img/profile/mosesgunner.png',
    },
  ];
  const [open, setOpen] = useState<Profile | null>(null);

  return (
    <section
      id="characters"
      className="py-20 bg-[radial-gradient(1000px_500px_at_0%_0%,rgba(250,204,21,.18),transparent_55%),radial-gradient(1000px_500px_at_100%_100%,rgba(168,85,247,.18),transparent_55%)]"
    >
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-3xl md:text-4xl font-extrabold diamond-text">Rapper Profiles</h2>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {roster.map((p) => (
            <div key={p.name} className="relative overflow-hidden rounded-2xl card chrome-border hover-tilt">
              <div className="absolute inset-0 foil" />
              <div className="relative p-5">
                <div className="mb-3 rounded-xl overflow-hidden border border-yellow-400/30 bg-black/30 aspect-[4/3] grid place-items-center">
                  {p.img ? (
                    <Image
                      src={p.img}
                      alt={`${p.name} photo`}
                      width={400}
                      height={300}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] tracking-wide text-yellow-300/80">Add Image</span>
                  )}
                </div>
                <div className="text-xs text-zinc-300">{p.title}</div>
                <h3 className="text-xl font-extrabold text-[var(--gold)]">
                  {p.name}
                </h3>
                <div className="mt-3 flex gap-2">
                  <a
                    href={p.x}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 rounded-lg text-black font-bold bg-[linear-gradient(90deg,var(--mint),var(--aqua))]"
                  >
                    X Profile
                  </a>
                  <button
                    onClick={() => setOpen(p)}
                    className="px-3 py-1 rounded-lg font-bold bg-[linear-gradient(90deg,var(--purple),var(--pink))]"
                  >
                    View Card
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {open && (
          <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60" onClick={() => setOpen(null)}>
            <div className="w-[min(92vw,640px)] relative card chrome-border p-6" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setOpen(null)}
                className="absolute top-4 right-4 z-10 px-3 py-1 rounded-lg text-sm bg-white/10 hover:bg-white/20"
                aria-label="Close"
              >
                X
              </button>
              <div className="absolute inset-0 foil rounded-2xl" />
              <div className="relative">
                <div className="mb-4 rounded-xl overflow-hidden border border-yellow-400/30 bg-black/30 aspect-video grid place-items-center">
                  {open.img ? (
                    <Image
                      src={open.img}
                      alt={`${open.name} photo`}
                      width={640}
                      height={360}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs tracking-wide text-yellow-300/80">Add Image</span>
                  )}
                </div>
                <div className="text-sm text-zinc-300">{open.title}</div>
                <h3 className="text-2xl font-extrabold text-[var(--gold)]">
                  {open.name}
                </h3>
                <p className="mt-2 text-zinc-200">{open.bio}</p>
                <div className="mt-4 space-y-3 text-sm text-zinc-200">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                      Core Competency
                    </div>
                    <p className="mt-1">{open.core}</p>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                      Vision Statement
                    </div>
                    <p className="mt-1 italic">{open.vision}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <a
                    href={open.x}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-lg text-black font-bold bg-[linear-gradient(90deg,var(--mint),var(--aqua))]"
                  >
                    Open X
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
