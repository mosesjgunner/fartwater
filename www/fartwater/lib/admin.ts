type AdminUser = {
  id: number;
  discord_id?: string | null;
  discord_name?: string | null;
};

type AdminWallet = {
  address?: string | null;
};

function parseCsvEnv(name: string): Set<string> {
  const raw = process.env[name];
  if (!raw) return new Set<string>();
  return new Set(
    raw
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isBonusLinkAdmin(user: AdminUser | null | undefined, wallets: AdminWallet[] = []): boolean {
  if (!user) return false;

  const adminUserIds = parseCsvEnv('ADMIN_USER_IDS');
  const adminDiscordIds = parseCsvEnv('ADMIN_DISCORD_IDS');
  const adminDiscordNames = parseCsvEnv('ADMIN_DISCORD_NAMES');
  const adminWalletAddresses = parseCsvEnv('ADMIN_WALLET_ADDRESSES');

  if (adminUserIds.has(String(user.id).toLowerCase())) return true;
  if (user.discord_id && adminDiscordIds.has(user.discord_id.toLowerCase())) return true;
  if (user.discord_name && adminDiscordNames.has(user.discord_name.toLowerCase())) return true;

  for (const wallet of wallets) {
    if (!wallet?.address) continue;
    if (adminWalletAddresses.has(wallet.address.toLowerCase())) return true;
  }

  return false;
}

export function isAdminUser(user: AdminUser | null | undefined, wallets: AdminWallet[] = []): boolean {
  return isBonusLinkAdmin(user, wallets);
}
