import Link from 'next/link';

const CONTRACT_ADDRESS = '4KqswqciRBGp3MEQnaP8JUDwX8hVVMhsD8BU6jYupump';
const LAMPORTS_PER_SOL = 1_000_000_000;
const DEFAULT_PUMP_TOKEN_DECIMALS = 6;

type DexPair = {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string;
  fdv?: number;
  marketCap?: number;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  priceChange?: { h24?: number };
  txns?: { h24?: { buys?: number; sells?: number } };
  pairCreatedAt?: number;
};

type PumpCoin = {
  mint?: string;
  name?: string;
  symbol?: string;
  complete?: boolean;
  created_timestamp?: number;
  usd_market_cap?: number;
  market_cap?: number;
  total_supply?: number;
  real_sol_reserves?: number;
  bonding_curve?: string;
};

function toNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatUsd(value: number | null) {
  if (value === null || Number.isNaN(value)) return '--';
  const maximumFractionDigits = value < 0.01 ? 8 : value < 1 ? 6 : value < 100 ? 4 : 2;
  return `$${value.toLocaleString('en-US', { maximumFractionDigits })}`;
}

function formatUsdCompact(value: number | null) {
  if (value === null || Number.isNaN(value)) return '--';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number | null) {
  if (value === null || Number.isNaN(value)) return '--';
  return value.toLocaleString('en-US');
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return '--';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function Sparkline() {
  return (
    <svg viewBox="0 0 120 32" className="mt-3 w-full h-10" preserveAspectRatio="none">
      <defs>
        <linearGradient id="g1" x1="0" x2="1">
          <stop offset="0%" stopColor="#00ffc3" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke="url(#g1)"
        strokeWidth="2"
        points="0,22 10,12 20,18 30,8 40,12 50,6 60,10 70,4 80,6 90,3 100,7 110,5 120,9"
      />
    </svg>
  );
}

async function fetchDexPair(): Promise<DexPair | null> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${CONTRACT_ADDRESS}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const pairs = Array.isArray(data?.pairs) ? data.pairs : [];
    const solPairs = pairs.filter((pair: DexPair) => pair.chainId === 'solana');
    solPairs.sort((a: DexPair, b: DexPair) => (b?.liquidity?.usd ?? 0) - (a?.liquidity?.usd ?? 0));
    return solPairs[0] ?? null;
  } catch (error) {
    console.error('DexScreener fetch failed:', error);
    return null;
  }
}

async function fetchTokenSupply(): Promise<number | null> {
  try {
    const res = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenSupply',
        params: [CONTRACT_ADDRESS],
      }),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const supply = Number(data?.result?.value?.uiAmountString);
    return Number.isFinite(supply) ? supply : null;
  } catch (error) {
    console.error('Token supply fetch failed:', error);
    return null;
  }
}

async function fetchPumpCoin(): Promise<PumpCoin | null> {
  try {
    const res = await fetch(`https://frontend-api-v3.pump.fun/coins/${CONTRACT_ADDRESS}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as PumpCoin;
    if (data?.mint !== CONTRACT_ADDRESS) return null;
    return data;
  } catch (error) {
    console.error('Pump.fun fetch failed:', error);
    return null;
  }
}

function normalizePumpSupply(totalSupplyRaw: number | null) {
  if (totalSupplyRaw === null || totalSupplyRaw <= 0) return null;
  return totalSupplyRaw / 10 ** DEFAULT_PUMP_TOKEN_DECIMALS;
}

function estimatePumpLiquidityUsd(pump: PumpCoin | null) {
  if (!pump) return null;
  const realSolReserves = toNumber(pump.real_sol_reserves);
  const usdMarketCap = toNumber(pump.usd_market_cap);
  const marketCapInSol = toNumber(pump.market_cap);

  if (realSolReserves === null || realSolReserves <= 0) return null;
  if (usdMarketCap === null || marketCapInSol === null || marketCapInSol <= 0) return null;

  const impliedSolUsd = usdMarketCap / marketCapInSol;
  return (realSolReserves / LAMPORTS_PER_SOL) * impliedSolUsd;
}

export async function TokenInfo() {
  const [pair, supplyFromRpc, pump] = await Promise.all([
    fetchDexPair(),
    fetchTokenSupply(),
    fetchPumpCoin(),
  ]);

  const supplyFromPump = normalizePumpSupply(toNumber(pump?.total_supply));
  const supply = supplyFromRpc ?? supplyFromPump;

  const priceUsdFromDex = toNumber(pair?.priceUsd);
  const marketCapFromDex = toNumber(pair?.marketCap ?? pair?.fdv);
  const marketCapFromPump = toNumber(pump?.usd_market_cap);
  const marketCap = marketCapFromDex ?? marketCapFromPump;
  const derivedPriceFromMarketCap =
    marketCap !== null && supply !== null && supply > 0 ? marketCap / supply : null;
  const priceUsd = priceUsdFromDex ?? derivedPriceFromMarketCap;

  const liquidityUsd = toNumber(pair?.liquidity?.usd) ?? estimatePumpLiquidityUsd(pump);
  const volume24h = pair?.volume?.h24 ?? null;
  const priceChange24h = pair?.priceChange?.h24 ?? null;
  const buys24h = pair?.txns?.h24?.buys ?? null;
  const sells24h = pair?.txns?.h24?.sells ?? null;

  const changeClass =
    priceChange24h === null
      ? 'text-zinc-500'
      : priceChange24h >= 0
        ? 'text-emerald-300'
        : 'text-red-400';

  const contractUrl = `https://solscan.io/token/${CONTRACT_ADDRESS}`;
  const dexUrl =
    pair?.url ??
    (pump ? `https://pump.fun/coin/${CONTRACT_ADDRESS}` : `https://dexscreener.com/solana/${CONTRACT_ADDRESS}`);
  const marketCreatedAt = pair?.pairCreatedAt ?? toNumber(pump?.created_timestamp);
  const pairCreatedAt = marketCreatedAt
    ? new Date(marketCreatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;
  const marketVenue = pair?.dexId ?? (pump ? 'pump.fun' : 'Solana');
  const marketPairId = pair?.pairAddress ?? pump?.bonding_curve ?? null;
  const tokenSymbol = pair?.baseToken?.symbol ?? pump?.symbol ?? 'FRTWTR';
  const lifecycleStatus = pair
    ? 'DEX trading live'
    : pump
      ? pump.complete
        ? 'Bonding complete'
        : 'Bonding curve active'
      : 'Status unavailable';
  const tokenomics = [
    { label: 'Fair Launch', value: 78 },
    { label: 'Airdrop', value: 10 },
    { label: 'Treasury', value: 7 },
    { label: 'Dev', value: 5 },
  ];

  return (
    <section
      id="token"
      className="py-20 bg-[radial-gradient(900px_500px_at_100%_0%,rgba(0,255,195,.10),transparent_60%),radial-gradient(900px_500px_at_0%_100%,rgba(168,85,247,.10),transparent_60%)]"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h2 className="text-3xl md:text-4xl font-extrabold diamond-text">$FRTWTR Token Dashboard</h2>
          <Link
            href="/quests"
            className="px-4 py-2 rounded-lg font-bold text-black bg-[linear-gradient(90deg,var(--gold),#fff)]"
          >
            Get Airdrop
          </Link>
        </div>
        <div className="mt-8 dash-grid">
          <div className="col-span-12 sm:col-span-4 card hover-tilt p-5 chrome-border">
            <div className="text-xs text-zinc-400">Price (live)</div>
            <div className="mt-1 text-3xl font-black">{formatUsd(priceUsd)}</div>
            <div className={`mt-1 text-xs ${changeClass}`}>
              24h {formatPercent(priceChange24h)}
            </div>
            <Sparkline />
          </div>
          <div className="col-span-12 sm:col-span-4 card hover-tilt p-5 chrome-border">
            <div className="text-xs text-zinc-400">Market Cap</div>
            <div className="mt-1 text-3xl font-black">{formatUsdCompact(marketCap)}</div>
            <div className="mt-3 text-xs text-zinc-500">
              Liquidity: {formatUsdCompact(liquidityUsd)}
            </div>
          </div>
          <div className="col-span-12 sm:col-span-4 card hover-tilt p-5 chrome-border">
            <div className="text-xs text-zinc-400">24h Volume</div>
            <div className="mt-1 text-3xl font-black">{formatUsdCompact(volume24h)}</div>
            <div className="mt-2 text-xs text-zinc-500">
              Buys {formatNumber(buys24h)} / Sells {formatNumber(sells24h)}
            </div>
          </div>
          <div className="col-span-12 md:col-span-5 card hover-tilt p-6 chrome-border">
            <h3 className="text-lg font-semibold">Contract & Market</h3>
            <ul className="mt-3 text-zinc-300 space-y-2">
              <li>
                <b>Symbol:</b> {tokenSymbol}
              </li>
              <li>
                <b>Contract:</b>{' '}
                <a
                  href={contractUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-400 break-all hover:text-white"
                >
                  {CONTRACT_ADDRESS}
                </a>
              </li>
              <li>
                <b>Total Supply:</b> {formatNumber(supply)}
              </li>
              <li>
                <b>Market:</b> {marketVenue}
              </li>
              <li>
                <b>Status:</b> {lifecycleStatus}
              </li>
              <li>
                <b>Pair:</b>{' '}
                <a
                  href={dexUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-400 hover:text-white"
                >
                  {marketPairId ? `${marketPairId.slice(0, 6)}...${marketPairId.slice(-4)}` : 'View chart'}
                </a>
              </li>
              {pairCreatedAt && (
                <li>
                  <b>Pair Created:</b> {pairCreatedAt}
                </li>
              )}
            </ul>
            <div className="mt-3 text-xs text-zinc-500">
              Data source: {pair ? 'DexScreener' : pump ? 'Pump.fun (fallback)' : 'Unavailable'}
            </div>
          </div>
          <div className="col-span-12 md:col-span-7 card hover-tilt p-6 chrome-border">
            <h3 className="text-lg font-semibold">Tokenomics</h3>
            <div className="mt-4 space-y-4">
              {tokenomics.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm text-zinc-200">
                    <span>{item.label}</span>
                    <span className="font-semibold">{item.value}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-[linear-gradient(90deg,#facc15,#22d3ee)]"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-zinc-400">
              Allocation used for launch and airdrop planning.
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
