import type {
  ParsedInnerInstruction,
  ParsedInstruction,
  ParsedTransactionWithMeta,
  PartiallyDecodedInstruction,
} from '@solana/web3.js';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import {
  FRTWTR_DECIMALS,
  FRTWTR_MINT,
  HOLDER_REWARD_DAYS,
  MERCH_ITEMS,
  MERCH_TREASURY_WALLET,
  frtwtrToRawAmount,
  type MerchItemKey,
} from '@/lib/merch-config';

const DEFAULT_SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const SIGNATURE_PAGE_LIMIT = 1000;
const SIGNATURE_MAX_PAGES = 3;
const SECONDS_IN_DAY = 24 * 60 * 60;

export type HolderStatus = {
  wallet: string;
  balanceRaw: string;
  balanceUi: number;
  earliestActivityUnix: number | null;
  daysHeld: number;
  requiredDays: number;
  eligibleForHat: boolean;
  checkedAtUnix: number;
};

type ParsedTransferChecked = {
  mint: string;
  destination: string;
  authority: string | null;
  amountRaw: bigint;
};

export function getSolanaConnection() {
  const endpoint =
    process.env.SOLANA_RPC_URL ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    DEFAULT_SOLANA_RPC;
  return new Connection(endpoint, 'confirmed');
}

export function parseWalletAddress(value: unknown) {
  if (typeof value !== 'string') return null;
  try {
    const wallet = new PublicKey(value.trim());
    return wallet.toBase58();
  } catch {
    return null;
  }
}

function toBigInt(value: unknown) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return BigInt(Math.trunc(value));
  }
  if (typeof value === 'string') {
    if (!value.trim()) return null;
    try {
      return BigInt(value);
    } catch {
      return null;
    }
  }
  return null;
}

function parseTransferCheckedInstruction(
  instruction: ParsedInstruction | PartiallyDecodedInstruction
): ParsedTransferChecked | null {
  if (!('parsed' in instruction)) return null;
  if (instruction.program !== 'spl-token') return null;

  const parsed = instruction.parsed as any;
  if (!parsed || typeof parsed !== 'object') return null;
  if (parsed.type !== 'transferChecked') return null;

  const info = parsed.info as any;
  if (!info || typeof info !== 'object') return null;

  if (typeof info.mint !== 'string') return null;
  if (typeof info.destination !== 'string') return null;

  const amountRaw =
    toBigInt(info?.tokenAmount?.amount) ??
    toBigInt(info?.amount);
  if (amountRaw === null) return null;

  const authority =
    typeof info.authority === 'string'
      ? info.authority
      : typeof info.multisigAuthority === 'string'
        ? info.multisigAuthority
        : null;

  return {
    mint: info.mint,
    destination: info.destination,
    authority,
    amountRaw,
  };
}

function collectTransferCheckedInstructions(transaction: ParsedTransactionWithMeta) {
  const all: ParsedTransferChecked[] = [];

  for (const instruction of transaction.transaction.message.instructions) {
    const parsed = parseTransferCheckedInstruction(instruction);
    if (parsed) all.push(parsed);
  }

  const innerSets = transaction.meta?.innerInstructions ?? [];
  for (const inner of innerSets as ParsedInnerInstruction[]) {
    for (const instruction of inner.instructions) {
      const parsed = parseTransferCheckedInstruction(instruction);
      if (parsed) all.push(parsed);
    }
  }

  return all;
}

async function findOldestActivity(
  connection: Connection,
  address: PublicKey
): Promise<number | null> {
  let before: string | undefined;
  let oldest: number | null = null;

  for (let page = 0; page < SIGNATURE_MAX_PAGES; page += 1) {
    const signatures = await connection.getSignaturesForAddress(address, {
      limit: SIGNATURE_PAGE_LIMIT,
      before,
    });

    if (signatures.length === 0) break;

    for (const signature of signatures) {
      if (typeof signature.blockTime !== 'number') continue;
      if (oldest === null || signature.blockTime < oldest) {
        oldest = signature.blockTime;
      }
    }

    if (signatures.length < SIGNATURE_PAGE_LIMIT) break;
    before = signatures[signatures.length - 1]?.signature;
    if (!before) break;
  }

  return oldest;
}

export async function getHolderStatus(walletAddress: string): Promise<HolderStatus> {
  const connection = getSolanaConnection();
  const owner = new PublicKey(walletAddress);
  const mint = new PublicKey(FRTWTR_MINT);
  const nowUnix = Math.floor(Date.now() / 1000);

  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    owner,
    { mint },
    'confirmed'
  );

  let balanceRaw = 0n;
  let earliest: number | null = null;

  for (const account of tokenAccounts.value) {
    const parsedData = (account.account.data as any)?.parsed?.info;
    const amountRaw = toBigInt(parsedData?.tokenAmount?.amount) ?? 0n;
    balanceRaw += amountRaw;

    const accountEarliest = await findOldestActivity(connection, account.pubkey);
    if (accountEarliest !== null && (earliest === null || accountEarliest < earliest)) {
      earliest = accountEarliest;
    }
  }

  const daysHeld =
    earliest !== null ? Math.max(0, Math.floor((nowUnix - earliest) / SECONDS_IN_DAY)) : 0;
  const balanceUi = Number(balanceRaw) / 10 ** FRTWTR_DECIMALS;
  const eligibleForHat = balanceRaw > 0n && daysHeld >= HOLDER_REWARD_DAYS;

  return {
    wallet: owner.toBase58(),
    balanceRaw: balanceRaw.toString(),
    balanceUi,
    earliestActivityUnix: earliest,
    daysHeld,
    requiredDays: HOLDER_REWARD_DAYS,
    eligibleForHat,
    checkedAtUnix: nowUnix,
  };
}

export async function verifyMerchPayment(params: {
  walletAddress: string;
  itemKey: MerchItemKey;
  quantity: number;
  signature: string;
}) {
  const { walletAddress, itemKey, quantity, signature } = params;
  const connection = getSolanaConnection();
  const tx = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  });

  if (!tx) {
    return {
      ok: false,
      error: 'Transaction not found on chain.',
      requiredAmountRaw: frtwtrToRawAmount(MERCH_ITEMS[itemKey].priceFrtwtr * quantity),
      paidAmountRaw: 0n,
    };
  }

  if (tx.meta?.err) {
    return {
      ok: false,
      error: 'Transaction failed on chain.',
      requiredAmountRaw: frtwtrToRawAmount(MERCH_ITEMS[itemKey].priceFrtwtr * quantity),
      paidAmountRaw: 0n,
    };
  }

  const mint = new PublicKey(FRTWTR_MINT);
  const treasuryOwner = new PublicKey(MERCH_TREASURY_WALLET);
  const treasuryAta = getAssociatedTokenAddressSync(mint, treasuryOwner).toBase58();
  const requiredAmountRaw = frtwtrToRawAmount(MERCH_ITEMS[itemKey].priceFrtwtr * quantity);

  const parsedTransfers = collectTransferCheckedInstructions(tx);
  let paidAmountRaw = 0n;

  for (const transfer of parsedTransfers) {
    if (transfer.mint !== FRTWTR_MINT) continue;
    if (transfer.destination !== treasuryAta) continue;
    if (transfer.authority && transfer.authority !== walletAddress) continue;
    paidAmountRaw += transfer.amountRaw;
  }

  if (paidAmountRaw < requiredAmountRaw) {
    return {
      ok: false,
      error: 'On-chain payment amount is below required merch price.',
      requiredAmountRaw,
      paidAmountRaw,
    };
  }

  return {
    ok: true,
    requiredAmountRaw,
    paidAmountRaw,
  };
}
