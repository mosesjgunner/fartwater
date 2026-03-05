'use client';

import { useAppKitAccount } from '@reown/appkit/react';
import { useCallback, useState } from 'react';
import { WalletButton } from '../WalletButton';
import { getAppKit } from '@/lib/wallet-config';
import { HOLDER_REWARD_DAYS } from '@/lib/merch-config';

type HeroConnectCardProps = {
  address?: string;
  isConnected: boolean;
};

type HolderStatusResponse = {
  daysHeld: number;
  requiredDays: number;
  eligibleForHat: boolean;
};

function buildShareIntent(daysHeld: number) {
  const text = `Verified ${daysHeld} day hold on $FRTWTR with @6fartwater9.`;
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

function HeroConnectCard({ address, isConnected }: HeroConnectCardProps) {
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCopy = useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  const handleCheckHold = useCallback(async () => {
    if (!address) {
      setErrorMessage('Connect wallet first.');
      setStatusMessage(null);
      return;
    }

    setChecking(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch(
        `/api/merch/holder-status?wallet=${encodeURIComponent(address)}`
      );
      const body = (await response.json()) as HolderStatusResponse & { error?: string };

      if (!response.ok) {
        throw new Error(body.error || 'Unable to check holder status right now.');
      }

      if (body.eligibleForHat) {
        setStatusMessage(
          `Eligible: ${body.daysHeld}/${body.requiredDays} days. Opening X post...`
        );
        window.open(buildShareIntent(body.daysHeld), '_blank', 'noopener,noreferrer');
        return;
      }

      setStatusMessage(`Not eligible yet: ${body.daysHeld}/${body.requiredDays} days held.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to check holder status right now.';
      setErrorMessage(message);
    } finally {
      setChecking(false);
    }
  }, [address]);

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3 md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">
              {isConnected ? 'Wallet Connected' : 'MERCH-DROP CHECK'}
            </p>
            {isConnected && address ? (
              <div className="flex items-center gap-2">
                <p className="text-sm text-zinc-300 font-mono" title={address}>
                  {address.slice(0, 4)}...{address.slice(-4)}
                </p>
                <button onClick={handleCopy} className="text-xs text-zinc-400 hover:text-white">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            ) : (
              <p className="text-sm text-zinc-300">
                Connect wallet to run a merch-drop check for {HOLDER_REWARD_DAYS}-day holder status.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <WalletButton />
            <button
              type="button"
              onClick={handleCheckHold}
              disabled={!isConnected || !address || checking}
              className="rounded-xl border border-white/30 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checking ? 'Checking...' : 'MERCH-DROP CHECK'}
            </button>
          </div>
        </div>
        <div className="text-xs text-zinc-400">
          If eligible, this opens an X post draft that tags @6fartwater9.
        </div>
        {errorMessage && <div className="text-sm text-red-300">{errorMessage}</div>}
        {statusMessage && <div className="text-sm text-zinc-200">{statusMessage}</div>}
      </div>
    </div>
  );
}

function HeroConnectWithWallet() {
  const { address, isConnected } = useAppKitAccount();

  return <HeroConnectCard address={address} isConnected={isConnected} />;
}

export function HeroConnect() {
  const appKit = getAppKit();

  if (!appKit) {
    return <HeroConnectCard isConnected={false} />;
  }

  return <HeroConnectWithWallet />;
}
