import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

let db: Database.Database | null = null;

export function getDb() {
  if (db) return db;

  // Initialize database
  const dataDir = join(process.cwd(), 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = join(dataDir, 'fartwater.db');
  db = new Database(dbPath);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Initialize tables
  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT UNIQUE,
    discord_name TEXT,
    discord_avatar TEXT,
    xp INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    expires_at INTEGER DEFAULT (strftime('%s', 'now', '+30 days')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    address TEXT NOT NULL UNIQUE,
    verified INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    xp_awarded INTEGER DEFAULT 0,
    completed_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, type)
  );

  CREATE TABLE IF NOT EXISTS daily_checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    UNIQUE(user_id, date),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_user_id INTEGER NOT NULL,
    referee_user_id INTEGER NOT NULL UNIQUE,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    wallet_verified_at INTEGER,
    discord_connected_at INTEGER,
    wallet_discord_xp_awarded_at INTEGER,
    buy_connected_at INTEGER,
    buy_tx_signature TEXT,
    full_bounty_awarded_at INTEGER,
    FOREIGN KEY(referrer_user_id) REFERENCES users(id),
    FOREIGN KEY(referee_user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS referral_bounties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_user_id INTEGER NOT NULL,
    bounty_type TEXT NOT NULL,
    referral_id INTEGER,
    milestone INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY(referrer_user_id) REFERENCES users(id),
    FOREIGN KEY(referral_id) REFERENCES referrals(id)
  );

  CREATE TABLE IF NOT EXISTS bonus_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    created_by_user_id INTEGER NOT NULL,
    xp_award INTEGER NOT NULL DEFAULT 10,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    used_by_user_id INTEGER,
    used_at INTEGER,
    FOREIGN KEY(created_by_user_id) REFERENCES users(id),
    FOREIGN KEY(used_by_user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS meme_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    contest_month TEXT NOT NULL,
    x_post_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    submitted_at INTEGER DEFAULT (strftime('%s', 'now')),
    reviewed_at INTEGER,
    reviewed_by_user_id INTEGER,
    review_note TEXT,
    reward_xp INTEGER NOT NULL DEFAULT 0,
    reward_bounties INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(reviewed_by_user_id) REFERENCES users(id),
    UNIQUE(user_id, contest_month)
  );

  CREATE TABLE IF NOT EXISTS merch_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    order_type TEXT NOT NULL,
    item_key TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_frtwtr REAL NOT NULL DEFAULT 0,
    payment_signature TEXT,
    shipping_name TEXT NOT NULL,
    shipping_email TEXT NOT NULL,
    shipping_line1 TEXT NOT NULL,
    shipping_line2 TEXT,
    shipping_city TEXT NOT NULL,
    shipping_state TEXT NOT NULL,
    shipping_postal TEXT NOT NULL,
    shipping_country TEXT NOT NULL DEFAULT 'US',
    holder_days_at_claim INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
  CREATE INDEX IF NOT EXISTS idx_quests_user ON quests(user_id);
  CREATE INDEX IF NOT EXISTS idx_users_discord ON users(discord_id);
  CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
  CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_user_id);
  CREATE INDEX IF NOT EXISTS idx_referrals_wallet_discord
    ON referrals(referrer_user_id, wallet_verified_at, discord_connected_at);
  CREATE INDEX IF NOT EXISTS idx_referral_bounties_referrer ON referral_bounties(referrer_user_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_bounties_full_referral
    ON referral_bounties(referrer_user_id, bounty_type, referral_id)
    WHERE bounty_type = 'full_funnel' AND referral_id IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_bounties_five_pack
    ON referral_bounties(referrer_user_id, bounty_type, milestone)
    WHERE bounty_type = 'wallet_discord_5' AND milestone IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_bonus_links_created_by ON bonus_links(created_by_user_id);
  CREATE INDEX IF NOT EXISTS idx_bonus_links_used_by ON bonus_links(used_by_user_id);
  CREATE INDEX IF NOT EXISTS idx_meme_entries_user_month ON meme_entries(user_id, contest_month);
  CREATE INDEX IF NOT EXISTS idx_meme_entries_month_status
    ON meme_entries(contest_month, status, submitted_at);
  CREATE INDEX IF NOT EXISTS idx_merch_orders_wallet ON merch_orders(wallet_address);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_merch_orders_payment_signature
    ON merch_orders(payment_signature)
    WHERE payment_signature IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_merch_hat_reward_wallet
    ON merch_orders(wallet_address, order_type, item_key)
    WHERE order_type = 'hat_reward' AND item_key = 'hat';
`);

  ensureWalletWhitelistColumn(db);
  ensureReferralColumnsAndIndexes(db);

  return db;
}

function ensureWalletWhitelistColumn(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(wallets)").all() as Array<{ name: string }>;
  const hasWhitelist = columns.some((column) => column.name === 'whitelisted');
  if (!hasWhitelist) {
    db.exec('ALTER TABLE wallets ADD COLUMN whitelisted INTEGER DEFAULT 0');
  }
}

function ensureReferralColumnsAndIndexes(db: Database.Database) {
  const referralColumns = db.prepare('PRAGMA table_info(referrals)').all() as Array<{ name: string }>;
  const hasWalletDiscordXpAwarded = referralColumns.some(
    (column) => column.name === 'wallet_discord_xp_awarded_at'
  );
  if (!hasWalletDiscordXpAwarded) {
    db.exec('ALTER TABLE referrals ADD COLUMN wallet_discord_xp_awarded_at INTEGER');
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_bounties_five_pack
      ON referral_bounties(referrer_user_id, bounty_type, milestone)
      WHERE bounty_type = 'wallet_discord_5' AND milestone IS NOT NULL;
  `);
}

// User operations
export const userDb = {
  create: (discordId: string, discordName: string, discordAvatar: string | null): number => {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO users (discord_id, discord_name, discord_avatar)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(discordId, discordName, discordAvatar);
    return result.lastInsertRowid as number;
  },

  createAnonymous: (): number => {
    const db = getDb();
    const stmt = db.prepare('INSERT INTO users DEFAULT VALUES');
    const result = stmt.run();
    return result.lastInsertRowid as number;
  },

  updateDiscord: (
    userId: number,
    discordId: string,
    discordName: string,
    discordAvatar: string | null
  ) => {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE users
      SET discord_id = ?, discord_name = ?, discord_avatar = ?
      WHERE id = ?
    `);
    stmt.run(discordId, discordName, discordAvatar, userId);
  },

  findById: (id: number) => {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as any;
  },

  findByDiscordId: (discordId: string) => {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM users WHERE discord_id = ?');
    return stmt.get(discordId) as any;
  },

  findByUsername: (username: string) => {
    const db = getDb();
    // Extract just the username part (before #) for matching
    const usernameOnly = username.split('#')[0];
    const stmt = db.prepare('SELECT * FROM users WHERE discord_name LIKE ?');
    return stmt.get(`${usernameOnly}#%`) as any;
  },

  addXp: (userId: number, amount: number) => {
    const db = getDb();
    const stmt = db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?');
    stmt.run(amount, userId);
  },

  getCommunityLeaderboard: () => {
    const db = getDb();
    const stmt = db.prepare(`
      WITH bounty_totals AS (
        SELECT
          referrer_user_id AS user_id,
          COUNT(*) AS total_bounties,
          SUM(CASE WHEN bounty_type = 'wallet_discord_5' THEN 1 ELSE 0 END) AS wallet_discord_five_pack_bounties,
          SUM(CASE WHEN bounty_type = 'manual_admin' THEN 1 ELSE 0 END) AS manual_admin_bounties
        FROM referral_bounties
        GROUP BY referrer_user_id
      )
      SELECT
        u.id,
        u.discord_id,
        u.discord_name,
        u.xp,
        COALESCE(bt.total_bounties, 0) AS total_bounties,
        COALESCE(bt.wallet_discord_five_pack_bounties, 0) AS wallet_discord_five_pack_bounties,
        COALESCE(bt.manual_admin_bounties, 0) AS manual_admin_bounties
      FROM users u
      LEFT JOIN bounty_totals bt ON bt.user_id = u.id
      WHERE
        u.discord_id IS NOT NULL
        OR EXISTS (
          SELECT 1
          FROM quests q
          WHERE q.user_id = u.id
            AND q.type = 'discord_verification'
            AND q.completed = 1
        )
        OR EXISTS (
          SELECT 1
          FROM wallets w
          WHERE w.user_id = u.id
            AND w.verified = 1
            AND w.whitelisted = 1
        )
      ORDER BY
        total_bounties DESC,
        u.xp DESC,
        COALESCE(u.discord_name, '') ASC,
        u.id ASC
    `);
    return stmt.all() as Array<{
      id: number;
      discord_id: string | null;
      discord_name: string | null;
      xp: number;
      total_bounties: number;
      wallet_discord_five_pack_bounties: number;
      manual_admin_bounties: number;
    }>;
  },
};

// Session operations
export const sessionDb = {
  create: (userId: number): string => {
    const db = getDb();
    const sessionId = crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO sessions (id, user_id)
      VALUES (?, ?)
    `);
    stmt.run(sessionId, userId);
    return sessionId;
  },

  findById: (sessionId: string) => {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM sessions 
      WHERE id = ? AND expires_at > strftime('%s', 'now')
    `);
    return stmt.get(sessionId) as any;
  },

  delete: (sessionId: string) => {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
    stmt.run(sessionId);
  },
};

// Wallet operations
export const walletDb = {
  create: (userId: number, address: string) => {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO wallets (user_id, address, verified)
      VALUES (?, ?, 1)
      ON CONFLICT(address) DO UPDATE SET verified = 1, user_id = excluded.user_id
    `);
    const result = stmt.run(userId, address);
    return result.lastInsertRowid as number;
  },

  findByUser: (userId: number) => {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM wallets WHERE user_id = ? AND verified = 1');
    return stmt.all(userId) as any[];
  },

  findByAddress: (address: string) => {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM wallets WHERE address = ?');
    return stmt.get(address) as any;
  },

  markWhitelistedByUser: (userId: number) => {
    const db = getDb();
    const stmt = db.prepare('UPDATE wallets SET whitelisted = 1 WHERE user_id = ? AND verified = 1');
    stmt.run(userId);
  },

  reassignUser: (fromUserId: number, toUserId: number) => {
    const db = getDb();
    const stmt = db.prepare('UPDATE wallets SET user_id = ? WHERE user_id = ?');
    stmt.run(toUserId, fromUserId);
  },
};

// Quest operations
export const questDb = {
  create: (userId: number, type: string, xpAwarded: number) => {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO quests (user_id, type, completed, xp_awarded, completed_at)
      VALUES (?, ?, 1, ?, strftime('%s', 'now'))
      ON CONFLICT(user_id, type) DO UPDATE SET 
        completed = 1,
        xp_awarded = excluded.xp_awarded,
        completed_at = strftime('%s', 'now')
    `);
    stmt.run(userId, type, xpAwarded);
  },

  findByUser: (userId: number) => {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM quests WHERE user_id = ?');
    return stmt.all(userId) as any[];
  },

  isCompleted: (userId: number, type: string): boolean => {
    const db = getDb();
    const stmt = db.prepare('SELECT completed FROM quests WHERE user_id = ? AND type = ?');
    const result = stmt.get(userId, type) as any;
    return result?.completed === 1;
  },

  prepare: (query: string) => {
    const db = getDb();
    return db.prepare(query);
  },
};

export type MemeEntryStatus = 'pending' | 'approved' | 'rejected';

export type MemeEntry = {
  id: number;
  user_id: number;
  contest_month: string;
  x_post_url: string;
  status: MemeEntryStatus;
  submitted_at: number;
  reviewed_at: number | null;
  reviewed_by_user_id: number | null;
  review_note: string | null;
  reward_xp: number;
  reward_bounties: number;
  user_discord_name?: string | null;
};

type MemeEntrySubmitResult =
  | { status: 'created'; entry: MemeEntry }
  | { status: 'pending_exists'; entry: MemeEntry }
  | { status: 'approved_exists'; entry: MemeEntry }
  | { status: 'rejected_exists'; entry: MemeEntry };

type MemeEntryReviewResult =
  | { status: 'reviewed'; entry: MemeEntry }
  | { status: 'not_found' }
  | { status: 'already_reviewed'; entry: MemeEntry };

function getContestMonth(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function getContestDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export const memeDb = {
  getCurrentContestMonth: () => getContestMonth(),
  getCurrentContestDay: () => getContestDay(),

  findByUserForMonth: (userId: number, contestMonth = getContestMonth()) => {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT *
      FROM meme_entries
      WHERE user_id = ? AND contest_month = ?
      LIMIT 1
    `);
    return stmt.get(userId, contestMonth) as MemeEntry | undefined;
  },

  findByUserForDay: (userId: number, contestDay = getContestDay()) => {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT *
      FROM meme_entries
      WHERE user_id = ? AND contest_month = ?
      LIMIT 1
    `);
    return stmt.get(userId, contestDay) as MemeEntry | undefined;
  },

  findById: (entryId: number) => {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT me.*, u.discord_name AS user_discord_name
      FROM meme_entries me
      LEFT JOIN users u ON u.id = me.user_id
      WHERE me.id = ?
      LIMIT 1
    `);
    return stmt.get(entryId) as MemeEntry | undefined;
  },

  submitForCurrentMonth: (userId: number, xPostUrl: string): MemeEntrySubmitResult => {
    const contestDay = getContestDay();
    const db = getDb();

    const run = db.transaction((userIdValue: number, xPostUrlValue: string, contestDayValue: string) => {
      const selectStmt = db.prepare(`
        SELECT *
        FROM meme_entries
        WHERE user_id = ? AND contest_month = ?
        LIMIT 1
      `);

      const existing = selectStmt.get(userIdValue, contestDayValue) as MemeEntry | undefined;
      if (!existing) {
        db.prepare(`
          INSERT INTO meme_entries (user_id, contest_month, x_post_url, status, submitted_at)
          VALUES (?, ?, ?, 'pending', ?)
        `).run(userIdValue, contestDayValue, xPostUrlValue, nowUnix());
        const created = selectStmt.get(userIdValue, contestDayValue) as MemeEntry;
        return { status: 'created' as const, entry: created };
      }

      if (existing.status === 'pending') {
        return { status: 'pending_exists' as const, entry: existing };
      }

      if (existing.status === 'approved') {
        return { status: 'approved_exists' as const, entry: existing };
      }

      return { status: 'rejected_exists' as const, entry: existing };
    });

    return run(userId, xPostUrl, contestDay) as MemeEntrySubmitResult;
  },

  listForMonth: (
    contestMonth = getContestMonth(),
    status?: MemeEntryStatus,
    limit = 100
  ) => {
    const db = getDb();
    const safeLimit = Math.max(1, Math.min(Math.floor(limit), 500));

    if (status) {
      const stmt = db.prepare(`
        SELECT me.*, u.discord_name AS user_discord_name
        FROM meme_entries me
        LEFT JOIN users u ON u.id = me.user_id
        WHERE (me.contest_month = ? OR me.contest_month LIKE ?) AND me.status = ?
        ORDER BY me.submitted_at ASC
        LIMIT ?
      `);
      return stmt.all(contestMonth, `${contestMonth}-%`, status, safeLimit) as MemeEntry[];
    }

    const stmt = db.prepare(`
      SELECT me.*, u.discord_name AS user_discord_name
      FROM meme_entries me
      LEFT JOIN users u ON u.id = me.user_id
      WHERE me.contest_month = ? OR me.contest_month LIKE ?
      ORDER BY me.submitted_at ASC
      LIMIT ?
    `);
    return stmt.all(contestMonth, `${contestMonth}-%`, safeLimit) as MemeEntry[];
  },

  reviewEntry: (
    entryId: number,
    reviewerUserId: number,
    decision: Exclude<MemeEntryStatus, 'pending'>,
    rewardXp: number,
    rewardBounties: number,
    reviewNote: string | null
  ): MemeEntryReviewResult => {
    const db = getDb();
    const normalizedXp = Math.max(0, Math.floor(rewardXp));
    const normalizedBounties = Math.max(0, Math.floor(rewardBounties));

    const run = db.transaction((
      entryIdValue: number,
      reviewerUserIdValue: number,
      decisionValue: Exclude<MemeEntryStatus, 'pending'>,
      rewardXpValue: number,
      rewardBountiesValue: number,
      reviewNoteValue: string | null
    ) => {
      const selectByIdStmt = db.prepare(`
        SELECT *
        FROM meme_entries
        WHERE id = ?
        LIMIT 1
      `);
      const entry = selectByIdStmt.get(entryIdValue) as MemeEntry | undefined;
      if (!entry) {
        return { status: 'not_found' as const };
      }

      if (entry.status !== 'pending') {
        return { status: 'already_reviewed' as const, entry };
      }

      const finalXp = decisionValue === 'approved' ? rewardXpValue : 0;
      const finalBounties = decisionValue === 'approved' ? rewardBountiesValue : 0;
      const reviewedAt = nowUnix();

      if (finalXp > 0) {
        db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(finalXp, entry.user_id);
      }

      if (finalBounties > 0) {
        const insertBountyStmt = db.prepare(`
          INSERT INTO referral_bounties (referrer_user_id, bounty_type, created_at)
          VALUES (?, 'manual_admin', ?)
        `);
        for (let i = 0; i < finalBounties; i += 1) {
          insertBountyStmt.run(entry.user_id, reviewedAt);
        }
      }

      db.prepare(`
        UPDATE meme_entries
        SET status = ?,
            reviewed_at = ?,
            reviewed_by_user_id = ?,
            review_note = ?,
            reward_xp = ?,
            reward_bounties = ?
        WHERE id = ?
      `).run(
        decisionValue,
        reviewedAt,
        reviewerUserIdValue,
        reviewNoteValue,
        finalXp,
        finalBounties,
        entryIdValue
      );

      const reviewed = db.prepare(`
        SELECT me.*, u.discord_name AS user_discord_name
        FROM meme_entries me
        LEFT JOIN users u ON u.id = me.user_id
        WHERE me.id = ?
        LIMIT 1
      `).get(entryIdValue) as MemeEntry;

      return { status: 'reviewed' as const, entry: reviewed };
    });

    return run(
      entryId,
      reviewerUserId,
      decision,
      normalizedXp,
      normalizedBounties,
      reviewNote
    ) as MemeEntryReviewResult;
  },
};

export type ReferralSummary = {
  qualifiedWalletDiscord: number;
  referralXpAwardedTotal: number;
  walletDiscordFivePackBounties: number;
  manualAdminBounties: number;
  totalBounties: number;
  nextFivePackTarget: number;
  remainingToNextFivePack: number;
};

type ReferralMilestone = 'wallet' | 'discord' | 'buy';
const REFERRALS_PER_BOUNTY = 5;
const REFERRAL_XP_PER_QUALIFIED = 100;

function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

function evaluateReferralBounties(db: Database.Database, referrerUserId: number) {
  const timestamp = nowUnix();
  const xpCandidates = db.prepare(`
    SELECT id
    FROM referrals
    WHERE referrer_user_id = ?
      AND wallet_verified_at IS NOT NULL
      AND discord_connected_at IS NOT NULL
      AND buy_connected_at IS NOT NULL
      AND wallet_discord_xp_awarded_at IS NULL
  `).all(referrerUserId) as Array<{ id: number }>;

  const markWalletDiscordXpAwardedStmt = db.prepare(`
    UPDATE referrals
    SET wallet_discord_xp_awarded_at = COALESCE(wallet_discord_xp_awarded_at, ?)
    WHERE id = ?
  `);

  let walletDiscordXpReferralCount = 0;
  for (const row of xpCandidates) {
    const updateResult = markWalletDiscordXpAwardedStmt.run(timestamp, row.id);
    if (updateResult.changes > 0) {
      walletDiscordXpReferralCount += 1;
    }
  }

  const walletDiscordXpAwarded = walletDiscordXpReferralCount * REFERRAL_XP_PER_QUALIFIED;
  if (walletDiscordXpAwarded > 0) {
    db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(walletDiscordXpAwarded, referrerUserId);
  }

  const qualifiedWalletDiscord =
    Number(
      (db.prepare(`
        SELECT COUNT(*) AS count
        FROM referrals
        WHERE referrer_user_id = ?
          AND wallet_verified_at IS NOT NULL
          AND discord_connected_at IS NOT NULL
          AND buy_connected_at IS NOT NULL
      `).get(referrerUserId) as { count?: number } | undefined)?.count ?? 0
    ) || 0;

  const existingFivePackBounties =
    Number(
      (db.prepare(`
        SELECT COUNT(*) AS count
        FROM referral_bounties
        WHERE referrer_user_id = ?
          AND bounty_type = 'wallet_discord_5'
      `).get(referrerUserId) as { count?: number } | undefined)?.count ?? 0
    ) || 0;

  const targetFivePackBounties = Math.floor(qualifiedWalletDiscord / REFERRALS_PER_BOUNTY);
  const insertFivePackStmt = db.prepare(`
    INSERT OR IGNORE INTO referral_bounties (referrer_user_id, bounty_type, milestone, created_at)
    VALUES (?, 'wallet_discord_5', ?, ?)
  `);

  let fivePackAwarded = 0;
  for (let nextPack = existingFivePackBounties + 1; nextPack <= targetFivePackBounties; nextPack += 1) {
    const milestone = nextPack * REFERRALS_PER_BOUNTY;
    const insertResult = insertFivePackStmt.run(referrerUserId, milestone, timestamp);
    if (insertResult.changes > 0) {
      fivePackAwarded += 1;
    }
  }

  return {
    walletDiscordXpReferralCount,
    walletDiscordXpAwarded,
    fivePackAwarded,
  };
}

function applyReferralMilestone(
  refereeUserId: number,
  milestone: ReferralMilestone,
  buyTxSignature?: string | null
) {
  const db = getDb();
  const run = db.transaction((
    refereeUserIdValue: number,
    milestoneValue: ReferralMilestone,
    buyTxSignatureValue?: string | null
  ) => {
    const timestamp = nowUnix();

    if (milestoneValue === 'wallet') {
      db.prepare(`
        UPDATE referrals
        SET wallet_verified_at = COALESCE(wallet_verified_at, ?)
        WHERE referee_user_id = ?
      `).run(timestamp, refereeUserIdValue);
    } else if (milestoneValue === 'discord') {
      db.prepare(`
        UPDATE referrals
        SET discord_connected_at = COALESCE(discord_connected_at, ?)
        WHERE referee_user_id = ?
      `).run(timestamp, refereeUserIdValue);
    } else {
      db.prepare(`
        UPDATE referrals
        SET buy_connected_at = COALESCE(buy_connected_at, ?),
            buy_tx_signature = COALESCE(buy_tx_signature, ?)
        WHERE referee_user_id = ?
      `).run(timestamp, buyTxSignatureValue ?? null, refereeUserIdValue);
    }

    const referral = db.prepare(`
      SELECT id, referrer_user_id
      FROM referrals
      WHERE referee_user_id = ?
      LIMIT 1
    `).get(refereeUserIdValue) as { id: number; referrer_user_id: number } | undefined;

    if (!referral) {
      return null;
    }

    const awarded = evaluateReferralBounties(db, referral.referrer_user_id);
    return {
      referralId: referral.id,
      referrerUserId: referral.referrer_user_id,
      ...awarded,
    };
  });

  return run(refereeUserId, milestone, buyTxSignature ?? null) as
    | {
        referralId: number;
        referrerUserId: number;
        walletDiscordXpReferralCount: number;
        walletDiscordXpAwarded: number;
        fivePackAwarded: number;
      }
    | null;
}

// Referral operations
export const referralDb = {
  findByRefereeUserId: (refereeUserId: number) => {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT *
      FROM referrals
      WHERE referee_user_id = ?
      LIMIT 1
    `);
    return stmt.get(refereeUserId) as any;
  },

  linkReferrerToReferee: (referrerUserId: number, refereeUserId: number) => {
    if (referrerUserId === refereeUserId) return null;

    const db = getDb();
    const run = db.transaction((referrerUserIdValue: number, refereeUserIdValue: number) => {
      const existing = db.prepare(`
        SELECT *
        FROM referrals
        WHERE referee_user_id = ?
        LIMIT 1
      `).get(refereeUserIdValue) as any;

      if (existing) {
        return existing;
      }

      db.prepare(`
        INSERT INTO referrals (referrer_user_id, referee_user_id, created_at)
        VALUES (?, ?, strftime('%s', 'now'))
      `).run(referrerUserIdValue, refereeUserIdValue);

      return db.prepare(`
        SELECT *
        FROM referrals
        WHERE referee_user_id = ?
        LIMIT 1
      `).get(refereeUserIdValue) as any;
    });

    return run(referrerUserId, refereeUserId) as any;
  },

  markWalletConnected: (refereeUserId: number) => {
    return applyReferralMilestone(refereeUserId, 'wallet');
  },

  markDiscordConnected: (refereeUserId: number) => {
    return applyReferralMilestone(refereeUserId, 'discord');
  },

  markBuyConnected: (refereeUserId: number, buyTxSignature?: string | null) => {
    return applyReferralMilestone(refereeUserId, 'buy', buyTxSignature);
  },

  grantManualBounties: (targetUserId: number, bountyCount: number) => {
    const count = Math.max(0, Math.floor(bountyCount));
    if (count === 0) return 0;

    const db = getDb();
    const run = db.transaction((userId: number, qty: number) => {
      const insertStmt = db.prepare(`
        INSERT INTO referral_bounties (referrer_user_id, bounty_type, created_at)
        VALUES (?, 'manual_admin', strftime('%s', 'now'))
      `);

      let created = 0;
      for (let i = 0; i < qty; i += 1) {
        const result = insertStmt.run(userId);
        if (result.changes > 0) created += 1;
      }
      return created;
    });

    return run(targetUserId, count) as number;
  },

  getSummaryForReferrer: (referrerUserId: number): ReferralSummary => {
    const db = getDb();

    const qualifiedWalletDiscord =
      Number(
        (db.prepare(`
          SELECT COUNT(*) AS count
          FROM referrals
          WHERE referrer_user_id = ?
            AND wallet_verified_at IS NOT NULL
            AND discord_connected_at IS NOT NULL
            AND buy_connected_at IS NOT NULL
        `).get(referrerUserId) as { count?: number } | undefined)?.count ?? 0
      ) || 0;

    const walletDiscordFivePackBounties =
      Number(
        (db.prepare(`
          SELECT COUNT(*) AS count
          FROM referral_bounties
          WHERE referrer_user_id = ?
            AND bounty_type = 'wallet_discord_5'
        `).get(referrerUserId) as { count?: number } | undefined)?.count ?? 0
      ) || 0;

    const manualAdminBounties =
      Number(
        (db.prepare(`
          SELECT COUNT(*) AS count
          FROM referral_bounties
          WHERE referrer_user_id = ?
            AND bounty_type = 'manual_admin'
        `).get(referrerUserId) as { count?: number } | undefined)?.count ?? 0
      ) || 0;

    const awardedReferralCount =
      Number(
        (db.prepare(`
          SELECT COUNT(*) AS count
          FROM referrals
          WHERE referrer_user_id = ?
            AND wallet_discord_xp_awarded_at IS NOT NULL
        `).get(referrerUserId) as { count?: number } | undefined)?.count ?? 0
      ) || 0;

    const referralXpAwardedTotal = awardedReferralCount * REFERRAL_XP_PER_QUALIFIED;
    const nextFivePackTarget = (Math.floor(qualifiedWalletDiscord / REFERRALS_PER_BOUNTY) + 1) * REFERRALS_PER_BOUNTY;
    const remainingToNextFivePack = Math.max(0, nextFivePackTarget - qualifiedWalletDiscord);

    return {
      qualifiedWalletDiscord,
      referralXpAwardedTotal,
      walletDiscordFivePackBounties,
      manualAdminBounties,
      totalBounties: walletDiscordFivePackBounties + manualAdminBounties,
      nextFivePackTarget,
      remainingToNextFivePack,
    };
  },
};

const BONUS_LINK_TOKEN_LENGTH_BYTES = 16;

function generateBonusLinkToken() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(BONUS_LINK_TOKEN_LENGTH_BYTES))).toString('hex');
}

export const bonusLinkDb = {
  create: (createdByUserId: number, xpAward = 10) => {
    const db = getDb();
    const insertStmt = db.prepare(`
      INSERT INTO bonus_links (token, created_by_user_id, xp_award)
      VALUES (?, ?, ?)
    `);
    const selectStmt = db.prepare('SELECT * FROM bonus_links WHERE token = ? LIMIT 1');

    // Retry token generation on the rare chance of a collision.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const token = generateBonusLinkToken();
      try {
        insertStmt.run(token, createdByUserId, xpAward);
        return selectStmt.get(token) as any;
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (!message.includes('UNIQUE constraint failed: bonus_links.token')) {
          throw error;
        }
      }
    }

    throw new Error('Failed to generate unique bonus link token');
  },

  findByToken: (token: string) => {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM bonus_links WHERE token = ? LIMIT 1');
    return stmt.get(token) as any;
  },

  redeem: (token: string, userId: number) => {
    const db = getDb();
    const run = db.transaction((tokenValue: string, userIdValue: number) => {
      const link = db.prepare(`
        SELECT *
        FROM bonus_links
        WHERE token = ?
        LIMIT 1
      `).get(tokenValue) as any;

      if (!link) {
        return { status: 'invalid' as const };
      }

      if (link.used_by_user_id) {
        return {
          status: 'used' as const,
          usedByUserId: link.used_by_user_id as number,
        };
      }

      const claimResult = db.prepare(`
        UPDATE bonus_links
        SET used_by_user_id = ?, used_at = strftime('%s', 'now')
        WHERE id = ? AND used_by_user_id IS NULL
      `).run(userIdValue, link.id);

      if (claimResult.changes === 0) {
        const fresh = db.prepare('SELECT used_by_user_id FROM bonus_links WHERE id = ?').get(link.id) as
          | { used_by_user_id?: number | null }
          | undefined;
        return {
          status: 'used' as const,
          usedByUserId: Number(fresh?.used_by_user_id ?? 0) || null,
        };
      }

      const questType = `bonus_token_${link.id}`;
      db.prepare(`
        INSERT INTO quests (user_id, type, completed, xp_awarded, completed_at)
        VALUES (?, ?, 1, ?, strftime('%s', 'now'))
        ON CONFLICT(user_id, type) DO NOTHING
      `).run(userIdValue, questType, link.xp_award);
      db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(link.xp_award, userIdValue);

      return {
        status: 'redeemed' as const,
        xpAwarded: link.xp_award as number,
      };
    });

    return run(token, userId) as
      | { status: 'invalid' }
      | { status: 'used'; usedByUserId: number | null }
      | { status: 'redeemed'; xpAwarded: number };
  },
};

export type MerchOrderInput = {
  walletAddress: string;
  orderType: 'purchase' | 'hat_reward';
  itemKey: string;
  quantity: number;
  priceFrtwtr: number;
  paymentSignature: string | null;
  shippingName: string;
  shippingEmail: string;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPostal: string;
  shippingCountry: string;
  holderDaysAtClaim: number | null;
};

export const merchDb = {
  createOrder: (input: MerchOrderInput) => {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO merch_orders (
        wallet_address,
        order_type,
        item_key,
        quantity,
        price_frtwtr,
        payment_signature,
        shipping_name,
        shipping_email,
        shipping_line1,
        shipping_line2,
        shipping_city,
        shipping_state,
        shipping_postal,
        shipping_country,
        holder_days_at_claim
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.walletAddress,
      input.orderType,
      input.itemKey,
      input.quantity,
      input.priceFrtwtr,
      input.paymentSignature,
      input.shippingName,
      input.shippingEmail,
      input.shippingLine1,
      input.shippingLine2,
      input.shippingCity,
      input.shippingState,
      input.shippingPostal,
      input.shippingCountry,
      input.holderDaysAtClaim
    );

    return result.lastInsertRowid as number;
  },

  findByPaymentSignature: (signature: string) => {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM merch_orders WHERE payment_signature = ?');
    return stmt.get(signature) as any;
  },

  findHatRewardByWallet: (walletAddress: string) => {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM merch_orders
      WHERE wallet_address = ?
        AND order_type = 'hat_reward'
        AND item_key = 'hat'
      LIMIT 1
    `);
    return stmt.get(walletAddress) as any;
  },
};
