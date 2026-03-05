'use client';

import { createAppKit } from '@reown/appkit/react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react';
import { solana } from '@reown/appkit/networks';

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;

let appKitInstance: any = null;

const SOLANA_WALLET_IDS = {
  phantom: 'a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393',
  solflare: '1ca0bdd4747578705b1939af023d120677c64fe6ca76add81fda36e350605e79',
  backpack: '2bd8c14e035c2d48f184aaa168559e86b0e3433228d3c4075900a221785019b0',
  magicEden: '8b830a2b724a9c3fbab63af6f55ed29c9dfa8a55e732dc88c80a196a2ba136c6',
  coin98: '2a3c89040ac3b723a1972a33a125b1db11e258a6975d3a61252cd64e6ea5ea01',
  okx: '971e689d0a5be527bac79629b4ee9b925e82208e5168b733496a09c0faed0709',
  bitget: '38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662',
  trust: '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
} as const;

const FEATURED_WALLET_IDS = [SOLANA_WALLET_IDS.phantom];
// Keep curated recommendations empty; installed wallets show automatically.
const RECOMMENDED_WALLET_IDS: string[] = [];

export function getAppKit() {
  if (typeof window === 'undefined') return null;

  if (!projectId) {
    console.warn('NEXT_PUBLIC_REOWN_PROJECT_ID is missing; wallet connect UI will be disabled.');
    return null;
  }

  if (!appKitInstance) {
    const solanaWeb3JsAdapter = new SolanaAdapter({
      wallets: [],
      registerWalletStandard: true,
    });

    const metadata = {
      name: 'Fartwater Quest',
      description: 'Connect your wallet to unlock quests',
      url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      icons: ['https://avatars.githubusercontent.com/u/37784886'],
    };

    appKitInstance = createAppKit({
      adapters: [solanaWeb3JsAdapter],
      networks: [solana],
      metadata,
      projectId,
      features: {
        analytics: true,
        email: false,
        socials: false,
        swaps: false,
        onramp: false,
        history: false,
        allWallets: true,
        connectMethodsOrder: ['wallet'],
        connectorTypeOrder: ['injected', 'walletConnect'],
      },
      allWallets: 'SHOW',
      includeWalletIds: RECOMMENDED_WALLET_IDS,
      featuredWalletIds: FEATURED_WALLET_IDS,
    });
  }

  return appKitInstance;
}

// Do not initialize AppKit at module-eval time to avoid server-side execution.
// Use `getAppKit()` from a client component (e.g. `WalletProvider`) instead.
export const appKit = null as any;
