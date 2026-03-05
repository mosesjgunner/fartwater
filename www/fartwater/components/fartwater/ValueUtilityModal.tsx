'use client';

import { useEffect, useState } from 'react';

type ValueUtilityScope = 'site' | 'quests';

type ValueUtilityModalProps = {
  scope: ValueUtilityScope;
  triggerLabel?: string;
  triggerClassName?: string;
};

const SEEN_KEY_BY_SCOPE: Record<ValueUtilityScope, string> = {
  site: 'fartwater_value_utility_seen_site',
  quests: 'fartwater_value_utility_seen_quests',
};

export function ValueUtilityModal({
  scope,
  triggerLabel,
  triggerClassName,
}: ValueUtilityModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const key = SEEN_KEY_BY_SCOPE[scope];
      const seen = window.localStorage.getItem(key) === '1';
      if (!seen) {
        window.localStorage.setItem(key, '1');
        setOpen(true);
      }
    } catch (error) {
      console.error('Failed to read value/utility modal state:', error);
    }
  }, [scope]);

  return (
    <>
      {triggerLabel && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={triggerClassName || 'button-retro px-5 py-3'}
        >
          {triggerLabel}
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm p-4 md:p-8"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Community value and utility"
            className="mx-auto max-w-3xl max-h-[90vh] overflow-y-auto card-retro p-6 md:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="neon-cyan mb-1">COMMUNITY VALUE AND UTILITY</h3>
                <p className="text-gray-400 text-xs">Season 0 - Pre-Graduation</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="button-retro px-3 py-1 text-xs"
              >
                CLOSE
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm text-gray-300">
              <p>
                Welcome to the genesis phase. The most dedicated community miners establish
                position before graduation. Rewards, bounties, and prizes are paid in
                <span className="text-cyan-300 font-semibold"> $FRTWTR</span>.
              </p>

              <div>
                <p className="text-cyan-300 text-xs font-orbitron tracking-wide mb-1">THE MATH</p>
                <p>
                  1 XP = 1 $FRTWTR
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Estimates are based on Pre-Graduation supply and activity. Final values are set at season close.
                </p>
              </div>

              <div>
                <p className="text-cyan-300 text-xs font-orbitron tracking-wide mb-1">REFERRAL PROGRAM</p>
                <ul className="space-y-1 text-xs text-gray-300 list-disc list-inside">
                  <li>Community Connection: Earn 100 XP for each person referred through your URL.</li>
                  <li>The Power of 5: Refer 5 people with your URL to earn one Bounty.</li>
                  <li>Liquidity Bonus: Refer 1 person who buys $FRTWTR to earn one Bounty.</li>
                  <li>Each Bounty is a $5 reward paid in $FRTWTR.</li>
                </ul>
              </div>

              <div>
                <p className="text-cyan-300 text-xs font-orbitron tracking-wide mb-1">MEME CONTEST UTILITY</p>
                <ul className="space-y-1 text-xs text-gray-300 list-disc list-inside">
                  <li>Monthly winner is announced on the 22nd of every month.</li>
                  <li>Monthly Champion gets $10 (2 Bounties) plus a unique 1:1 NFT.</li>
                  <li>Runner-up bounties may be awarded at admin discretion.</li>
                  <li>Daily meme entries can earn 100 to 1000 XP.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
