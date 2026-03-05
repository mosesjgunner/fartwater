'use client';

import { useAppKitAccount } from '@reown/appkit/react';
import { getAppKit } from '@/lib/wallet-config';

export function WalletButton() {
  const { address, isConnected } = useAppKitAccount();

  const handleOpen = () => {
    const instance = getAppKit();
    if (!instance) {
      console.warn('Wallet connect not configured. Check NEXT_PUBLIC_REOWN_PROJECT_ID.');
      return;
    }
    void instance.open({ view: 'Connect' });
  };

  return (
    <button
      onClick={handleOpen}
      type="button"
      className="button-retro px-6 py-3 font-orbitron"
    >
      {isConnected && address
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : 'CONNECT WALLET'}
    </button>
  );
}
