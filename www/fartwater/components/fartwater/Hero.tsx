import Image from 'next/image';
import { HeroConnect } from './HeroConnect';
import { QuickBuy } from './QuickBuy';
import { AddressCopyField } from './AddressCopyField';
import { ValueUtilityModal } from './ValueUtilityModal';

const CONTRACT_ADDRESS = '4KqswqciRBGp3MEQnaP8JUDwX8hVVMhsD8BU6jYupump';

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_10%_0%,#facc15,transparent_35%),radial-gradient(circle_at_90%_0%,#00ffc3,transparent_35%),radial-gradient(circle_at_30%_100%,#a855f7,transparent_35%)]" />
      <div className="mx-auto max-w-7xl px-4 py-16 md:py-20 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight diamond-text">Hydration meets Finance</h1>
          <p className="mt-4 text-zinc-300 max-w-xl">
            Complete quests, earn points, and secure your spot in the $FRTWTR airdrop. The more you share, the more
            you earn. This is financial hydration.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <QuickBuy
              buttonLabel="Quick Buy"
              buttonClassName="px-5 py-3 rounded-xl font-semibold text-black bg-gradient-to-r from-[#facc15] to-[#22d3ee] hover:opacity-90 transition-opacity"
            />
            <a
              className="px-5 py-3 rounded-xl font-semibold text-black bg-gradient-to-r from-[#86efac] to-[#facc15] hover:opacity-90 transition-opacity inline-flex items-center gap-2"
              href={`https://pump.fun/coin/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
            >
              PUMP.FUN
              <span className="rounded-full bg-black/15 px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                Official
              </span>
            </a>
            <a
              className="px-5 py-3 rounded-xl font-semibold text-[#111] bg-[linear-gradient(135deg,#f5f5f5,#d1d5db_45%,#f5f5f5_70%)] shadow-[0_6px_18px_rgba(255,255,255,0.25)] border border-white/[.35]"
              href="https://fartwater.fun/FRTWTR_Whitepaper.pdf"
              target="_blank"
              rel="noreferrer"
            >
              Whitepaper
            </a>
            <a
              className="px-5 py-3 rounded-xl font-semibold text-[#111] bg-[linear-gradient(135deg,#f5f5f5,#d1d5db_45%,#f5f5f5_70%)] shadow-[0_6px_18px_rgba(255,255,255,0.25)] border border-white/[.35]"
              href="https://www.linkedin.com/in/mosesgunner/"
              target="_blank"
              rel="noreferrer"
            >
              KYD
            </a>
            <ValueUtilityModal
              scope="site"
              triggerLabel="Value + Utility"
              triggerClassName="px-5 py-3 rounded-xl font-semibold text-[#111] bg-[linear-gradient(135deg,#f5f5f5,#d1d5db_45%,#f5f5f5_70%)] shadow-[0_6px_18px_rgba(255,255,255,0.25)] border border-white/[.35]"
            />
            <a
              className="px-5 py-3 rounded-xl font-semibold text-black bg-gradient-to-r from-[#22d3ee] to-[#facc15] hover:opacity-90 transition-opacity"
              href="/quests"
            >
              AIRDROP AND CONTESTS BOARD
            </a>
          </div>
          <HeroConnect />
          <ul className="mt-6 text-sm text-zinc-400 space-y-1 max-w-md">
            <li>* Ticker: $FRTWTR</li>
            <li>* Chain: Solana</li>
            <li>
              * Contract Address:
              <AddressCopyField
                address={CONTRACT_ADDRESS}
                ariaLabel="FRTWTR contract address"
              />
            </li>
            <li className="break-all">
              * Treasury Wallet: GJpVrqvvDJyKWGeWAKTj4QSfyPX7ii3PDWMRNtVAiFZN
            </li>
          </ul>
        </div>
        <div className="relative mx-auto w-full max-w-xl">
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40">
            {/* For next/image, you should use the actual width and height of your source image */}
            <Image
              src="/img/fartwaterdope.jpg"
              alt="FARTWATER jeweled logo"
              width={1024}
              height={1024}
              className="w-full h-auto object-cover"
              priority
            />
          </div>
          <div className="absolute -inset-2 -z-10 rounded-3xl blur-2xl bg-[radial-gradient(600px_300px_at_70%_0%,rgba(217,70,239,.35),transparent_60%),radial-gradient(600px_300px_at_0%_100%,rgba(0,255,195,.35),transparent_60%)]" />
        </div>
      </div>
    </section>
  );
}
