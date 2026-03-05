"use client";

import { useEffect, useMemo, useState } from "react";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import type { Provider } from "@reown/appkit-adapter-solana";
import { WalletButton } from "@/components/WalletButton";

const TOKEN_MINT = "4KqswqciRBGp3MEQnaP8JUDwX8hVVMhsD8BU6jYupump";
const DEFAULT_RPC_ENDPOINT = "https://api.mainnet-beta.solana.com";
const SOLSCAN_TX_URL = "https://solscan.io/tx/";

type SwapState = "idle" | "building" | "signing" | "sending";

type BuildSwapResponse = {
  txBase64: string;
  source: string;
  mint: string;
};

type QuickBuyProps = {
  buttonClassName?: string;
  buttonLabel?: string;
};

function base64ToUint8Array(base64: string) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function formatAmount(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "--";
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 6 })} SOL`;
}

export function QuickBuy({ buttonClassName, buttonLabel = "Buy $FRTWTR" }: QuickBuyProps) {
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider<Provider>("solana");

  const [isOpen, setIsOpen] = useState(false);
  const [amountSol, setAmountSol] = useState("0.02");
  const [slippagePercent, setSlippagePercent] = useState("10");
  const [priorityFeeSol, setPriorityFeeSol] = useState("0.0005");
  const [swapState, setSwapState] = useState<SwapState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const rpcEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || DEFAULT_RPC_ENDPOINT;
  const buying = swapState !== "idle";
  const parsedAmount = Number(amountSol);
  const canBuy =
    isConnected &&
    Boolean(address) &&
    Boolean(walletProvider) &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    !buying;

  const ctaLabel = useMemo(() => {
    if (swapState === "building") return "Building transaction...";
    if (swapState === "signing") return "Awaiting wallet signature...";
    if (swapState === "sending") return "Broadcasting...";
    return `Buy ${formatAmount(amountSol)}`;
  }, [amountSol, swapState]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  async function handleBuy() {
    if (!address || !walletProvider) {
      setErrorMessage("Connect your wallet first.");
      return;
    }

    const amount = Number(amountSol);
    const slippage = Number(slippagePercent);
    const priorityFee = Number(priorityFeeSol);

    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage("Enter a valid SOL amount.");
      return;
    }
    if (!Number.isFinite(slippage) || slippage <= 0) {
      setErrorMessage("Enter a valid slippage percent.");
      return;
    }
    if (!Number.isFinite(priorityFee) || priorityFee < 0) {
      setErrorMessage("Enter a valid priority fee.");
      return;
    }

    setErrorMessage(null);
    setSignature(null);

    try {
      setSwapState("building");
      const buildRes = await fetch("/api/swap/pump/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          amountSol: amount,
          slippagePercent: slippage,
          priorityFeeSol: priorityFee,
        }),
      });

      const buildBody = (await buildRes.json()) as BuildSwapResponse & { error?: string };
      if (!buildRes.ok || !buildBody?.txBase64) {
        throw new Error(buildBody?.error || "Failed to build transaction.");
      }

      setSwapState("signing");
      const txBytes = base64ToUint8Array(buildBody.txBase64);
      const versionedTx = VersionedTransaction.deserialize(txBytes);
      const signedTx = await walletProvider.signTransaction(versionedTx);

      setSwapState("sending");
      const connection = new Connection(rpcEndpoint, "confirmed");
      const txSignature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        maxRetries: 4,
      });
      await connection.confirmTransaction(txSignature, "confirmed");

      try {
        const milestoneRes = await fetch("/api/referrals/record-buy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: address,
            signature: txSignature,
          }),
        });
        if (!milestoneRes.ok) {
          const milestoneBody = await milestoneRes.json().catch(() => null);
          console.warn("Referral buy milestone update failed:", milestoneBody?.error || milestoneRes.status);
        }
      } catch (milestoneError) {
        console.warn("Referral buy milestone request failed:", milestoneError);
      }

      setSignature(txSignature);
      setSwapState("idle");
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Swap failed. Check wallet prompts and try again.";
      console.error("Buy flow failed:", error);
      setErrorMessage(message);
      setSwapState("idle");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          buttonClassName ?? "px-5 py-3 rounded-xl border border-white/20 hover:bg-white/10 text-white"
        }
      >
        {buttonLabel}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm px-4 py-8 overflow-y-auto"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Quick buy console"
            className="mx-auto w-full max-w-4xl"
          >
            <div className="card chrome-border p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-3xl md:text-4xl font-extrabold diamond-text">Quick Buy $FRTWTR</h2>
                  <p className="mt-2 text-sm text-zinc-300 max-w-2xl">
                    Phase 2 active: buy flow signs directly with your connected wallet, no second
                    widget connect.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-zinc-400">
                    Contract:{" "}
                    <span className="text-zinc-200">
                      {TOKEN_MINT.slice(0, 6)}...{TOKEN_MINT.slice(-4)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/10"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,280px]">
                <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                  <label className="text-xs uppercase tracking-wide text-zinc-400">Amount (SOL)</label>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={amountSol}
                    onChange={(event) => setAmountSol(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-zinc-100 outline-none focus:border-white/35"
                  />

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs uppercase tracking-wide text-zinc-400">Slippage (%)</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={slippagePercent}
                        onChange={(event) => setSlippagePercent(event.target.value)}
                        className="mt-2 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-zinc-100 outline-none focus:border-white/35"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wide text-zinc-400">Priority Fee (SOL)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={priorityFeeSol}
                        onChange={(event) => setPriorityFeeSol(event.target.value)}
                        className="mt-2 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-zinc-100 outline-none focus:border-white/35"
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      onClick={handleBuy}
                      disabled={!canBuy}
                      className="px-4 py-2 rounded-lg font-bold text-black bg-[linear-gradient(90deg,var(--gold),#fff)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {ctaLabel}
                    </button>
                    <WalletButton />
                  </div>

                  {!isConnected && (
                    <div className="mt-3 text-sm text-zinc-400">
                      Connect wallet to enable buy flow.
                    </div>
                  )}

                  {errorMessage && (
                    <div className="mt-3 text-sm text-red-300">{errorMessage}</div>
                  )}

                  {signature && (
                    <div className="mt-3 text-sm text-emerald-300">
                      Success. Tx:
                      {" "}
                      <a
                        href={`${SOLSCAN_TX_URL}${signature}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2 hover:text-emerald-200"
                      >
                        {signature.slice(0, 10)}...{signature.slice(-8)}
                      </a>
                    </div>
                  )}
                </div>

                <aside className="rounded-xl border border-white/10 bg-black/25 p-4">
                  <h3 className="text-sm font-semibold text-[var(--gold)]">Route Notes</h3>
                  <ul className="mt-3 text-xs text-zinc-300 space-y-2">
                    <li>Current token phase is Pump bonding curve.</li>
                    <li>Transaction is built server-side, signed in your wallet.</li>
                    <li>If this flow is rate-limited, use pump.fun fallback.</li>
                  </ul>
                  <div className="mt-4 flex flex-col gap-2 text-sm">
                    <a
                      href={`https://pump.fun/coin/${TOKEN_MINT}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-zinc-100 text-center"
                    >
                      Open on pump.fun
                    </a>
                    <a
                      href="https://jup.ag"
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-zinc-100 text-center"
                    >
                      Open Jupiter
                    </a>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
