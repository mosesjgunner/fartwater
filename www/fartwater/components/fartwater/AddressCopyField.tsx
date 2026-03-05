'use client';

import { useState } from 'react';

type AddressCopyFieldProps = {
  address: string;
  ariaLabel?: string;
};

export function AddressCopyField({ address, ariaLabel = 'Contract address' }: AddressCopyFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  return (
    <div className="mt-1 flex items-center gap-2 max-w-full">
      <input
        type="text"
        value={address}
        readOnly
        aria-label={ariaLabel}
        className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-xs md:text-sm text-cyan-200 font-mono focus:outline-none"
      />
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 rounded-lg border border-cyan-300/40 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/10 transition-colors"
      >
        {copied ? 'COPIED' : 'COPY'}
      </button>
    </div>
  );
}
