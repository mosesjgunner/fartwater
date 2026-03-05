'use client';

import { ReactNode, useEffect } from 'react';
import { getAppKit } from '@/lib/wallet-config';

export function WalletProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    getAppKit();

    const url = new URL(window.location.href);
    const ref = url.searchParams.get('ref')?.trim();
    if (!ref) return;

    localStorage.setItem('fartwater_referrer', ref);
    url.searchParams.delete('ref');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  return <>{children}</>;
}
