'use client';

import { useEffect, useState } from 'react';
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import type { Provider } from '@reown/appkit-adapter-solana';
import bs58 from 'bs58';
import { getAppKit } from '@/lib/wallet-config';
import { WalletButton } from '@/components/WalletButton';

interface QuestStatus {
  user: {
    id: string;
    discordId?: string | null;
    discordName?: string | null;
    xp: number;
  };
  wallets: any[];
  quests: any[];
  referral?: {
    qualifiedWalletDiscord: number;
    referralXpAwardedTotal: number;
    walletDiscordFivePackBounties: number;
    manualAdminBounties: number;
    totalBounties: number;
    nextFivePackTarget: number;
    remainingToNextFivePack: number;
  };
  memeContest?: {
    currentMonth: string;
    currentDay?: string;
    entry: {
      id: number;
      userId: number;
      contestMonth: string;
      xPostUrl: string;
      status: 'pending' | 'approved' | 'rejected';
      submittedAt: number;
      reviewedAt: number | null;
      reviewedByUserId: number | null;
      reviewNote: string | null;
      rewardXp: number;
      rewardBounties: number;
    } | null;
  };
  admin?: {
    canManageBonusLinks: boolean;
    canIssueRewards: boolean;
  };
}

type AdminMemeEntry = {
  id: number;
  userId: number;
  userDiscordName?: string | null;
  contestMonth: string;
  xPostUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: number;
  reviewedAt: number | null;
  reviewedByUserId: number | null;
  reviewNote: string | null;
  rewardXp: number;
  rewardBounties: number;
};

type AdminRewardMember = {
  userId: number;
  discordName: string | null;
  displayName: string;
  xp: number;
  totalBounties: number;
};

type CommunityLeaderboardMember = {
  rank: number;
  userId: number;
  discordName: string | null;
  xp: number;
  totalBounties: number;
};

type QuestBoardWalletProps = {
  address?: string;
  isConnected: boolean;
  walletProvider?: Provider;
};

const DAILY_REMINDER_ENABLED_KEY = 'fartwater_daily_reminder_enabled';
const DAILY_REMINDER_NEXT_AT_KEY = 'fartwater_daily_reminder_next_at';
const DAILY_REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000;
const REMINDER_CHECK_INTERVAL_MS = 60 * 1000;
const X_COMMUNITY_URL = 'https://x.com/i/communities/1998663793170137593';
const DEFAULT_ONE_TIME_BONUS_XP = 10;
const MIN_ONE_TIME_BONUS_XP = 1;
const MAX_ONE_TIME_BONUS_XP = 100000;
const MAX_ADMIN_ISSUE_XP = 1000000;
const MAX_ADMIN_ISSUE_BOUNTIES = 10000;
const MAX_MEME_REVIEW_NOTE_LENGTH = 500;
const MIN_MEME_APPROVAL_XP = 100;
const MAX_MEME_APPROVAL_XP = 1000;

function QuestBoardContent({
  address,
  isConnected,
  walletProvider,
}: QuestBoardWalletProps) {
  const [status, setStatus] = useState<QuestStatus | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [questing, setQuesting] = useState(false);
  const [questError, setQuestError] = useState<string | null>(null);
  const [autoVerifyAttempted, setAutoVerifyAttempted] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  const [notificationsSupported, setNotificationsSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(false);
  const [dailyReminderMessage, setDailyReminderMessage] = useState<string | null>(null);
  const [xCommunityError, setXCommunityError] = useState<string | null>(null);
  const [bonusStatusMessage, setBonusStatusMessage] = useState<string | null>(null);
  const [oneTimeBonusLink, setOneTimeBonusLink] = useState('');
  const [oneTimeBonusXp, setOneTimeBonusXp] = useState(DEFAULT_ONE_TIME_BONUS_XP);
  const [oneTimeBonusCreating, setOneTimeBonusCreating] = useState(false);
  const [oneTimeBonusCopied, setOneTimeBonusCopied] = useState(false);
  const [oneTimeBonusError, setOneTimeBonusError] = useState<string | null>(null);
  const [adminTargetUserId, setAdminTargetUserId] = useState('');
  const [adminRewardMembers, setAdminRewardMembers] = useState<AdminRewardMember[]>([]);
  const [adminRewardMembersLoading, setAdminRewardMembersLoading] = useState(false);
  const [adminRewardMembersError, setAdminRewardMembersError] = useState<string | null>(null);
  const [adminRewardXp, setAdminRewardXp] = useState(0);
  const [adminRewardBounties, setAdminRewardBounties] = useState(0);
  const [adminIssueLoading, setAdminIssueLoading] = useState(false);
  const [adminIssueMessage, setAdminIssueMessage] = useState<string | null>(null);
  const [adminIssueError, setAdminIssueError] = useState<string | null>(null);
  const [memeSubmissionUrl, setMemeSubmissionUrl] = useState('');
  const [memeSubmitting, setMemeSubmitting] = useState(false);
  const [memeSubmitMessage, setMemeSubmitMessage] = useState<string | null>(null);
  const [memeSubmitError, setMemeSubmitError] = useState<string | null>(null);
  const [adminMemeEntries, setAdminMemeEntries] = useState<AdminMemeEntry[]>([]);
  const [adminMemeLoading, setAdminMemeLoading] = useState(false);
  const [adminMemeError, setAdminMemeError] = useState<string | null>(null);
  const [adminMemeMessage, setAdminMemeMessage] = useState<string | null>(null);
  const [adminMemeReviewingId, setAdminMemeReviewingId] = useState<number | null>(null);
  const [adminMemeXpById, setAdminMemeXpById] = useState<Record<number, number>>({});
  const [adminMemeBountiesById, setAdminMemeBountiesById] = useState<Record<number, number>>({});
  const [adminMemeNoteById, setAdminMemeNoteById] = useState<Record<number, string>>({});
  const [communityLeaderboard, setCommunityLeaderboard] = useState<CommunityLeaderboardMember[]>([]);
  const [communityLeaderboardLoading, setCommunityLeaderboardLoading] = useState(false);
  const [communityLeaderboardError, setCommunityLeaderboardError] = useState<string | null>(null);

  const hasWallet = Boolean(status?.wallets?.length);
  const hasWhitelist = Boolean(status?.wallets?.some((wallet) => wallet?.whitelisted === 1));
  const hasDiscord = Boolean(status?.user?.discordId || status?.user?.discordName || hasWhitelist);
  const canManageBonusLinks = Boolean(status?.admin?.canManageBonusLinks);
  const canIssueRewards = Boolean(status?.admin?.canIssueRewards);
  const referralLink =
    origin && status?.user?.id
      ? `${origin}/quests?ref=${encodeURIComponent(String(status.user.id))}`
      : '';
  const memeEntry = status?.memeContest?.entry ?? null;
  const memeMonth = status?.memeContest?.currentMonth ?? '';
  const memeDay = status?.memeContest?.currentDay ?? '';
  const memeSubmissionLocked = Boolean(memeEntry);
  const currentUserId = Number(status?.user?.id ?? 0) || 0;
  const currentUserRank = currentUserId
    ? communityLeaderboard.find((member) => member.userId === currentUserId)?.rank ?? null
    : null;

  useEffect(() => {
    void fetchStatus();
    setOrigin(window.location.origin);

    const params = new URLSearchParams(window.location.search);
    const bonus = params.get('bonus');
    if (bonus) {
      if (bonus === 'ok') {
        setBonusStatusMessage('Bonus link redeemed: XP added.');
      } else if (bonus === 'used') {
        setBonusStatusMessage('This bonus link was already used.');
      } else if (bonus === 'invalid') {
        setBonusStatusMessage('Invalid bonus link.');
      } else if (bonus === 'pending') {
        setBonusStatusMessage('Bonus link saved. Complete login/wallet verification to claim it.');
      }

      params.delete('bonus');
      const search = params.toString();
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`
      );
    }

    const supported = 'Notification' in window;
    setNotificationsSupported(supported);

    if (!supported) return;

    setNotificationPermission(Notification.permission);
    setDailyReminderEnabled(localStorage.getItem(DAILY_REMINDER_ENABLED_KEY) === '1');
  }, []);

  useEffect(() => {
    if (!notificationsSupported || notificationPermission !== 'granted' || !dailyReminderEnabled) return;

    const maybeSendReminder = () => {
      const now = Date.now();
      const nextReminderAtRaw = localStorage.getItem(DAILY_REMINDER_NEXT_AT_KEY);
      const nextReminderAt = nextReminderAtRaw ? Number(nextReminderAtRaw) : NaN;

      if (!Number.isFinite(nextReminderAt)) {
        localStorage.setItem(DAILY_REMINDER_NEXT_AT_KEY, String(now + DAILY_REMINDER_INTERVAL_MS));
        return;
      }

      if (now < nextReminderAt) return;

      try {
        new Notification('FartWATER Daily Reminder', {
          body: 'Come back and farm your daily XP.',
          tag: 'fartwater-daily-reminder',
        });
      } catch (error) {
        console.error('Failed to show daily reminder notification:', error);
      } finally {
        localStorage.setItem(DAILY_REMINDER_NEXT_AT_KEY, String(now + DAILY_REMINDER_INTERVAL_MS));
      }
    };

    maybeSendReminder();
    const intervalId = window.setInterval(maybeSendReminder, REMINDER_CHECK_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [dailyReminderEnabled, notificationPermission, notificationsSupported]);

  useEffect(() => {
    if (!isConnected || !address || !walletProvider) return;
    if (hasWallet || verifying || autoVerifyAttempted) return;
    setAutoVerifyAttempted(true);
    void handleVerifyWallet();
  }, [isConnected, address, walletProvider, hasWallet, verifying, autoVerifyAttempted]);

  useEffect(() => {
    if (!isConnected || !address) {
      setVerifyError(null);
      setAutoVerifyAttempted(false);
    }
  }, [isConnected, address]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/quests/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  };

  const fetchCommunityLeaderboard = async () => {
    if (!isConnected) {
      setCommunityLeaderboard([]);
      setCommunityLeaderboardError(null);
      setCommunityLeaderboardLoading(false);
      return;
    }

    setCommunityLeaderboardLoading(true);
    setCommunityLeaderboardError(null);
    try {
      const res = await fetch('/api/leaderboard/community', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setCommunityLeaderboardError(data?.error || 'Failed to load leaderboard.');
        return;
      }

      const membersRaw = Array.isArray(data?.members) ? (data.members as any[]) : [];
      const members = membersRaw
        .map((member) => {
          const userId = Number(member?.userId) || 0;
          return {
            rank: Number(member?.rank) || 0,
            userId,
            discordName: typeof member?.discordName === 'string' ? member.discordName : null,
            xp: Number(member?.xp) || 0,
            totalBounties: Number(member?.totalBounties) || 0,
          } as CommunityLeaderboardMember;
        })
        .filter((member) => member.rank > 0 && member.userId > 0);

      setCommunityLeaderboard(members);
    } catch (error) {
      console.error('Failed to load community leaderboard:', error);
      setCommunityLeaderboardError('Failed to load leaderboard.');
    } finally {
      setCommunityLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    if (!isConnected) {
      setCommunityLeaderboard([]);
      setCommunityLeaderboardError(null);
      setCommunityLeaderboardLoading(false);
      return;
    }

    void fetchCommunityLeaderboard();
  }, [isConnected, status?.user?.id, status?.user?.xp, status?.referral?.totalBounties]);

  const fetchAdminMemeEntries = async () => {
    if (!canIssueRewards) return;

    setAdminMemeLoading(true);
    setAdminMemeError(null);
    try {
      const res = await fetch('/api/meme/admin/entries?status=pending&limit=100');
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setAdminMemeError(data?.error || 'Failed to load meme queue.');
        return;
      }

      const entries = Array.isArray(data?.entries) ? (data.entries as AdminMemeEntry[]) : [];
      setAdminMemeEntries(entries);
      setAdminMemeXpById((previous) => {
        const next = { ...previous };
        for (const entry of entries) {
          if (next[entry.id] === undefined) {
            next[entry.id] = 100;
          }
        }
        return next;
      });
      setAdminMemeBountiesById((previous) => {
        const next = { ...previous };
        for (const entry of entries) {
          if (next[entry.id] === undefined) {
            next[entry.id] = 0;
          }
        }
        return next;
      });
      setAdminMemeNoteById((previous) => {
        const next = { ...previous };
        for (const entry of entries) {
          if (next[entry.id] === undefined) {
            next[entry.id] = '';
          }
        }
        return next;
      });
    } catch (error) {
      console.error('Failed to load meme queue:', error);
      setAdminMemeError('Failed to load meme queue.');
    } finally {
      setAdminMemeLoading(false);
    }
  };

  const fetchAdminRewardMembers = async () => {
    if (!canIssueRewards) return;

    setAdminRewardMembersLoading(true);
    setAdminRewardMembersError(null);
    try {
      const res = await fetch('/api/leaderboard/community', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setAdminRewardMembersError(data?.error || 'Failed to load member list.');
        return;
      }

      const membersRaw = Array.isArray(data?.members) ? (data.members as any[]) : [];
      const members = membersRaw.map((member) => {
        const userId = Number(member?.userId) || 0;
        const discordName = typeof member?.discordName === 'string' ? member.discordName : null;
        return {
          userId,
          discordName,
          displayName: discordName || `Community User #${userId}`,
          xp: Number(member?.xp) || 0,
          totalBounties: Number(member?.totalBounties) || 0,
        } as AdminRewardMember;
      }).filter((member) => member.userId > 0);

      setAdminRewardMembers(members);
      setAdminTargetUserId((previous) => {
        if (previous && members.some((member) => String(member.userId) === previous)) {
          return previous;
        }
        return members[0] ? String(members[0].userId) : '';
      });
    } catch (error) {
      console.error('Failed to load admin reward member list:', error);
      setAdminRewardMembersError('Failed to load member list.');
    } finally {
      setAdminRewardMembersLoading(false);
    }
  };

  useEffect(() => {
    if (!canIssueRewards) return;
    void Promise.all([fetchAdminMemeEntries(), fetchAdminRewardMembers()]);
  }, [canIssueRewards]);

  const handleVerifyWallet = async (): Promise<boolean> => {
    if (!isConnected || !address || !walletProvider) return false;

    setVerifying(true);
    setVerifyError(null);

    try {
      const challengeRes = await fetch('/api/wallet/challenge');
      if (!challengeRes.ok) {
        throw new Error('Challenge failed');
      }

      const { challenge } = await challengeRes.json();
      const encoder = new TextEncoder();
      const messageBytes = encoder.encode(challenge);
      const signedMessage = await walletProvider.signMessage(messageBytes);
      const signature = bs58.encode(signedMessage);

      const referrer = localStorage.getItem('fartwater_referrer');

      const verifyRes = await fetch('/api/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          signature,
          message: challenge,
          referrer,
        }),
      });

      const verifyData = await verifyRes.json().catch(() => null);
      if (!verifyRes.ok) {
        const message = verifyData?.error || 'Wallet verification failed.';
        throw new Error(message);
      }

      if (referrer) {
        localStorage.removeItem('fartwater_referrer');
      }

      await fetchStatus();
      return true;
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Wallet verification failed. Open your wallet and try again.';
      console.error('Wallet verification failed:', error);
      setVerifyError(message);
      return false;
    } finally {
      setVerifying(false);
    }
  };

  const handleDiscordLogin = () => {
    window.location.href = '/api/discord/authorize';
  };

  const handleVerifyDiscordQuest = async () => {
    setQuesting(true);
    setQuestError(null);

    try {
      if (!hasWallet) {
        const verified = await handleVerifyWallet();
        if (!verified) {
          setQuestError('Verify your wallet first.');
          return;
        }
      }

      if (!hasDiscord && !hasWhitelist) {
        setQuestError('Connect Discord first.');
        return;
      }

      const res = await fetch('/api/quests/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questType: 'discord_verification' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message = data?.error || 'Quest verification failed';
        setQuestError(message);
        return;
      }

      await Promise.all([
        fetchStatus(),
        fetchCommunityLeaderboard(),
        fetchAdminRewardMembers(),
      ]);
    } catch (error) {
      console.error('Quest verification failed:', error);
      setQuestError('Quest verification failed. Try again.');
    } finally {
      setQuesting(false);
    }
  };

  const handleDailyCheckIn = async () => {
    setQuestError(null);
    try {
      // Open one of three random X suggestions
      const suggestions = [
        'https://x.com/6fartwater9',
        'https://x.com/search?q=%24FRTWTR&src=typed_query',
        'https://x.com/intent/tweet?text=I%20am%20hydrating%20my%20wallet%20with%20%24FRTWTR%20%406fartwater9'
      ];
      const randomUrl = suggestions[Math.floor(Math.random() * suggestions.length)];
      window.open(randomUrl, '_blank');

      // Call the backend to register the daily check-in
      const res = await fetch('/api/quests/daily-checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errorMessage = errorData?.error || 'Daily check-in failed.';
        throw new Error(errorMessage);
      }

      // Refresh the status to reflect the updated XP
      await fetchStatus();
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Failed to complete daily check-in. Please try again.';
      console.error('Error during daily check-in:', error);
      setQuestError(message);
    }
  };

  const handleJoinXCommunity = async () => {
    setQuesting(true);
    setXCommunityError(null);

    try {
      window.open(X_COMMUNITY_URL, '_blank', 'noopener,noreferrer');

      const res = await fetch('/api/quests/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questType: 'x_community_join' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message = data?.error || 'X community quest failed.';

        if (message === 'Quest already completed') {
          await fetchStatus();
          return;
        }

        setXCommunityError(message);
        return;
      }

      await fetchStatus();
    } catch (error) {
      console.error('X community quest failed:', error);
      setXCommunityError('Failed to complete X community quest. Try again.');
    } finally {
      setQuesting(false);
    }
  };

  const discordQuest = status?.quests.find((q) => q.type === 'discord_verification');
  const discordComplete = Boolean(discordQuest?.completed);

  const dailyQuest = status?.quests.find((q) => q.type === 'daily_checkin');
  // Check if completed within last 24h (simple client check, server enforces real check)
  const dailyComplete = dailyQuest && (Date.now() / 1000 - dailyQuest.completed_at < 86400);
  const xCommunityQuest = status?.quests.find((q) => q.type === 'x_community_join');
  const xCommunityComplete = Boolean(xCommunityQuest?.completed);
  const referralSummary = status?.referral;

  const handleCopyReferral = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 2000);
  };

  const handleEnableDailyReminder = async () => {
    if (!notificationsSupported) {
      setDailyReminderMessage('Notifications are not supported in this browser.');
      return;
    }

    try {
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      setNotificationPermission(permission);

      if (permission !== 'granted') {
        setDailyReminderEnabled(false);
        localStorage.removeItem(DAILY_REMINDER_ENABLED_KEY);
        localStorage.removeItem(DAILY_REMINDER_NEXT_AT_KEY);
        setDailyReminderMessage(
          permission === 'denied'
            ? 'Notifications are blocked. Enable them in browser settings to use reminders.'
            : 'Notification permission not granted.'
        );
        return;
      }

      localStorage.setItem(DAILY_REMINDER_ENABLED_KEY, '1');
      localStorage.setItem(DAILY_REMINDER_NEXT_AT_KEY, String(Date.now() + DAILY_REMINDER_INTERVAL_MS));
      setDailyReminderEnabled(true);
      setDailyReminderMessage('Daily reminder enabled.');
    } catch (error) {
      console.error('Failed to enable daily reminder:', error);
      setDailyReminderMessage('Could not enable reminder. Please try again.');
    }
  };

  const handleDisableDailyReminder = () => {
    setDailyReminderEnabled(false);
    localStorage.removeItem(DAILY_REMINDER_ENABLED_KEY);
    localStorage.removeItem(DAILY_REMINDER_NEXT_AT_KEY);
    setDailyReminderMessage('Daily reminder disabled.');
  };

  const handleCreateOneTimeBonusLink = async () => {
    setOneTimeBonusCreating(true);
    setOneTimeBonusError(null);
    setOneTimeBonusCopied(false);

    try {
      const requestedXp = Math.trunc(oneTimeBonusXp);
      if (
        !Number.isFinite(requestedXp)
        || requestedXp < MIN_ONE_TIME_BONUS_XP
        || requestedXp > MAX_ONE_TIME_BONUS_XP
      ) {
        setOneTimeBonusError(
          `XP must be an integer between ${MIN_ONE_TIME_BONUS_XP} and ${MAX_ONE_TIME_BONUS_XP}.`
        );
        return;
      }

      const res = await fetch('/api/bonus-links/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xpAward: requestedXp }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const message = data?.error || 'Failed to create one-time bonus link.';
        setOneTimeBonusError(message);
        return;
      }

      const url = typeof data?.url === 'string' ? data.url : '';
      if (!url) {
        setOneTimeBonusError('Failed to create one-time bonus link.');
        return;
      }

      const xp = Number(data?.xpAward);
      setOneTimeBonusXp(Number.isFinite(xp) && xp > 0 ? xp : DEFAULT_ONE_TIME_BONUS_XP);
      setOneTimeBonusLink(url);
      await navigator.clipboard.writeText(url);
      setOneTimeBonusCopied(true);
      setTimeout(() => setOneTimeBonusCopied(false), 2000);
    } catch (error) {
      console.error('Failed to create one-time bonus link:', error);
      setOneTimeBonusError('Failed to create one-time bonus link.');
    } finally {
      setOneTimeBonusCreating(false);
    }
  };

  const handleCopyOneTimeBonusLink = async () => {
    if (!oneTimeBonusLink) return;
    try {
      await navigator.clipboard.writeText(oneTimeBonusLink);
      setOneTimeBonusCopied(true);
      setTimeout(() => setOneTimeBonusCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy one-time bonus link:', error);
      setOneTimeBonusError('Copy failed. Select and copy manually.');
    }
  };

  const handleIssueAdminRewards = async () => {
    setAdminIssueLoading(true);
    setAdminIssueError(null);
    setAdminIssueMessage(null);

    try {
      if (!adminTargetUserId.trim()) {
        setAdminIssueError('Select a target member first.');
        return;
      }

      const targetUserId = Math.trunc(Number(adminTargetUserId.trim()));
      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        setAdminIssueError('Select a valid target member.');
        return;
      }

      const xpAward = Math.max(0, Math.trunc(adminRewardXp));
      const bountyCount = Math.max(0, Math.trunc(adminRewardBounties));

      if (xpAward > MAX_ADMIN_ISSUE_XP) {
        setAdminIssueError(`XP must be between 0 and ${MAX_ADMIN_ISSUE_XP}.`);
        return;
      }

      if (bountyCount > MAX_ADMIN_ISSUE_BOUNTIES) {
        setAdminIssueError(`Bounties must be between 0 and ${MAX_ADMIN_ISSUE_BOUNTIES}.`);
        return;
      }

      if (xpAward === 0 && bountyCount === 0) {
        setAdminIssueError('Set XP or bounties above 0.');
        return;
      }

      const res = await fetch('/api/admin/rewards/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId,
          xpAward,
          bountyCount,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message = data?.error || 'Failed to issue rewards.';
        setAdminIssueError(message);
        return;
      }

      const awardedXp = Number(data?.rewards?.xpAwarded) || 0;
      const awardedBounties = Number(data?.rewards?.bountiesAwarded) || 0;
      const targetMember = adminRewardMembers.find((member) => member.userId === targetUserId);
      const targetLabel = targetMember?.displayName || `user #${targetUserId}`;
      setAdminIssueMessage(
        `Issued ${awardedXp} XP and ${awardedBounties} bounties to ${targetLabel}.`
      );
      await Promise.all([
        fetchStatus(),
        fetchCommunityLeaderboard(),
        fetchAdminRewardMembers(),
      ]);
    } catch (error) {
      console.error('Failed to issue admin rewards:', error);
      setAdminIssueError('Failed to issue rewards.');
    } finally {
      setAdminIssueLoading(false);
    }
  };

  const handleSubmitMemeEntry = async () => {
    setMemeSubmitting(true);
    setMemeSubmitError(null);
    setMemeSubmitMessage(null);

    try {
      if (!discordComplete) {
        setMemeSubmitError('Complete Discord verification before submitting a meme.');
        return;
      }

      const xPostUrl = memeSubmissionUrl.trim();
      if (!xPostUrl) {
        setMemeSubmitError('Paste your X post URL first.');
        return;
      }

      const res = await fetch('/api/meme/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xPostUrl }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMemeSubmitError(data?.error || 'Submission failed.');
        return;
      }

      setMemeSubmitMessage('Submission received for today. It is now pending admin review.');
      setMemeSubmissionUrl('');
      await fetchStatus();
      if (canIssueRewards) {
        await fetchAdminMemeEntries();
      }
    } catch (error) {
      console.error('Failed to submit meme entry:', error);
      setMemeSubmitError('Submission failed. Try again.');
    } finally {
      setMemeSubmitting(false);
    }
  };

  const handleReviewMemeEntry = async (entryId: number, decision: 'approve' | 'reject') => {
    setAdminMemeReviewingId(entryId);
    setAdminMemeError(null);
    setAdminMemeMessage(null);

    try {
      const xpAwardRaw = Math.trunc(Number(adminMemeXpById[entryId] ?? 0));
      const bountyCountRaw = Math.trunc(Number(adminMemeBountiesById[entryId] ?? 0));
      const xpAward = Math.max(0, xpAwardRaw);
      const bountyCount = Math.max(0, bountyCountRaw);
      const reviewNote = (adminMemeNoteById[entryId] ?? '').trim().slice(0, MAX_MEME_REVIEW_NOTE_LENGTH);

      if (xpAward > MAX_ADMIN_ISSUE_XP) {
        setAdminMemeError(`XP must be between 0 and ${MAX_ADMIN_ISSUE_XP}.`);
        return;
      }
      if (bountyCount > MAX_ADMIN_ISSUE_BOUNTIES) {
        setAdminMemeError(`Bounties must be between 0 and ${MAX_ADMIN_ISSUE_BOUNTIES}.`);
        return;
      }
      if (decision === 'approve' && (xpAward < MIN_MEME_APPROVAL_XP || xpAward > MAX_MEME_APPROVAL_XP)) {
        setAdminMemeError(
          `Meme approval XP must be between ${MIN_MEME_APPROVAL_XP} and ${MAX_MEME_APPROVAL_XP}.`
        );
        return;
      }

      const res = await fetch('/api/meme/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId,
          decision,
          xpAward,
          bountyCount,
          reviewNote: reviewNote || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setAdminMemeError(data?.error || 'Review update failed.');
        return;
      }

      setAdminMemeMessage(
        decision === 'approve'
          ? `Approved entry #${entryId} and issued rewards.`
          : `Rejected entry #${entryId}.`
      );

      await Promise.all([
        fetchStatus(),
        fetchAdminMemeEntries(),
        fetchAdminRewardMembers(),
        fetchCommunityLeaderboard(),
      ]);
    } catch (error) {
      console.error('Failed to review meme entry:', error);
      setAdminMemeError('Review update failed.');
    } finally {
      setAdminMemeReviewingId(null);
    }
  };

  const formatUnixTime = (value: number | null | undefined) => {
    if (!value || !Number.isFinite(value)) return 'N/A';
    try {
      return new Date(value * 1000).toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div className="card-retro p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="mb-2">GET STARTED</h2>
            <p className="text-gray-400 text-sm">
              {hasDiscord
                ? 'Wallet connected, Discord linked, and community access active.'
                : 'Connect your wallet and Discord in any order. Quests unlock after wallet connect.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <WalletButton />
            {hasDiscord ? (
              <button
                className="button-retro px-6 py-3 font-orbitron border-green-400 text-green-300 opacity-90 cursor-default"
                type="button"
                disabled
              >
                CONNECTED
              </button>
            ) : (
              <button
                onClick={handleDiscordLogin}
                className="button-retro px-6 py-3 font-orbitron"
                type="button"
              >
                CONNECT DISCORD
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-orbitron">
          <span
            className={`px-3 py-1 rounded border ${
              hasWallet
                ? 'border-green-400 text-green-300 bg-green-900/20'
                : 'border-white/20 text-gray-400 bg-black/30'
            }`}
          >
            {hasWallet ? 'WALLET CONNECTED' : 'WALLET NOT CONNECTED'}
          </span>
          <span
            className={`px-3 py-1 rounded border ${
              hasDiscord
                ? 'border-cyan-400 text-cyan-300 bg-cyan-900/20'
                : 'border-white/20 text-gray-400 bg-black/30'
            }`}
          >
            {hasDiscord ? 'COMMUNITY MEMBER' : 'DISCORD NOT CONNECTED'}
          </span>
        </div>
        {hasDiscord && !discordComplete && (
          <div className="mt-4 flex flex-col md:flex-row md:items-center gap-3">
            <p className="text-cyan-300 text-xs">
              You are in the community. Claim your +100 XP Discord verification reward.
            </p>
            <button
              onClick={handleVerifyDiscordQuest}
              className="button-retro px-4 py-2 text-xs whitespace-nowrap"
              type="button"
              disabled={questing}
            >
              {questing ? 'VERIFYING...' : 'CLAIM 100 XP'}
            </button>
          </div>
        )}
        {hasDiscord && !discordComplete && questError && (
          <p className="text-red-400 text-xs mt-2">{questError}</p>
        )}
        {verifying && (
          <p className="text-gray-400 text-xs mt-3">
            Check your wallet to sign the verification message.
          </p>
        )}
        {verifyError && (
          <div className="mt-3 flex items-center gap-3">
            <p className="text-red-400 text-xs">{verifyError}</p>
            <button
              onClick={handleVerifyWallet}
              className="button-retro px-4 py-2 text-xs"
              type="button"
              disabled={verifying}
            >
              RETRY VERIFY
            </button>
          </div>
        )}
        {bonusStatusMessage && (
          <p className="text-xs text-cyan-300 mt-3">{bonusStatusMessage}</p>
        )}
      </div>

      {!isConnected && (
        <div className="card-retro p-6 text-center">
          <p className="text-gray-400 text-sm">
            Connect your wallet to view the quests.
          </p>
        </div>
      )}

      {isConnected && (
        <>
          <div className="text-center mb-12">
            <h1 className="mb-4">AIRDROP AND CONTESTS BOARD</h1>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <div className="card-retro px-6 py-3">
                <p className="text-retro neon-green text-sm">XP: {status?.user.xp ?? 0}</p>
              </div>
              <div className="card-retro px-6 py-3">
                <p className="text-retro text-yellow-300 text-sm">
                  BOUNTIES: {status?.referral?.totalBounties ?? 0}
                </p>
              </div>
              <div className="card-retro px-6 py-3">
                <p className="text-retro text-pink-300 text-sm">
                  COMMUNITY RANK: {communityLeaderboardLoading ? '...' : currentUserRank ? `#${currentUserRank}` : 'UNRANKED'}
                </p>
              </div>
              <div className="card-retro px-6 py-3">
                <p className="text-retro text-cyan-400 text-sm">
                  {status?.user.discordName ?? 'Discord not linked'}
                </p>
              </div>
            </div>
          </div>

          <div className="card-retro p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h3 className="neon-cyan mb-1">COMMUNITY LEADERBOARD</h3>
                <p className="text-gray-400 text-xs">Ranked by bounties first, then XP.</p>
              </div>
              <button
                onClick={fetchCommunityLeaderboard}
                className="button-retro px-4 py-2 text-xs whitespace-nowrap"
                type="button"
                disabled={communityLeaderboardLoading}
              >
                {communityLeaderboardLoading ? 'REFRESHING...' : 'REFRESH LEADERBOARD'}
              </button>
            </div>

            {communityLeaderboardLoading && communityLeaderboard.length === 0 && (
              <p className="text-gray-400 text-sm">Loading leaderboard...</p>
            )}
            {communityLeaderboardError && (
              <p className="text-red-400 text-xs mb-3">{communityLeaderboardError}</p>
            )}
            {!communityLeaderboardLoading && !communityLeaderboardError && communityLeaderboard.length === 0 && (
              <p className="text-gray-400 text-sm">No community members yet.</p>
            )}

            {communityLeaderboard.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-300">
                      <th className="text-left py-2 pr-3 font-semibold">Rank</th>
                      <th className="text-left py-2 pr-3 font-semibold">Member</th>
                      <th className="text-right py-2 pr-3 font-semibold">Bounties</th>
                      <th className="text-right py-2 font-semibold">XP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {communityLeaderboard.map((member) => {
                      const isCurrentUser = member.userId === currentUserId;
                      return (
                        <tr
                          key={member.userId}
                          className={`border-b border-white/5 ${isCurrentUser ? 'bg-cyan-500/10' : ''}`}
                        >
                          <td className="py-2 pr-3 text-cyan-300 font-semibold">#{member.rank}</td>
                          <td className="py-2 pr-3 text-gray-100">
                            {member.discordName || `Community User #${member.userId}`}
                            {isCurrentUser && (
                              <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-orbitron border border-cyan-400/60 text-cyan-300">
                                YOU
                              </span>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-right text-yellow-300 font-semibold">{member.totalBounties}</td>
                          <td className="py-2 text-right text-green-300 font-semibold">{member.xp}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {!hasDiscord && !discordComplete && (
            <div className="card-retro p-8 mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="neon-cyan mb-2">DISCORD MEMBERSHIP VERIFICATION</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Verify you are in the Discord server to earn XP.
                  </p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-retro neon-green text-sm">+100 XP</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="text-sm text-gray-400">
                      {hasDiscord ? 'Discord linked' : 'Discord not linked'}
                    </div>
                    <div className="text-sm text-gray-400">
                      {hasWallet ? 'Wallet verified' : 'Wallet connected'}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <button
                    onClick={handleVerifyDiscordQuest}
                    className="button-retro px-6 py-3 whitespace-nowrap"
                    type="button"
                    disabled={questing}
                  >
                    VERIFY DISCORD
                  </button>
                  {questError && <p className="text-red-400 text-xs">{questError}</p>}
                </div>
              </div>
            </div>
          )}

          {discordComplete && questError && (
            <div className="card-retro p-4 mb-4">
              <p className="text-red-400 text-xs">{questError}</p>
            </div>
          )}

          <div className={`space-y-4 ${discordComplete ? '' : 'opacity-40'}`}>
            <div className="card-retro p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`${discordComplete ? 'neon-cyan' : 'text-gray-500'} mb-2`}>
                    DAILY CHECK-IN
                  </h3>
                  <p className={`${discordComplete ? 'text-gray-400' : 'text-gray-600'} text-sm`}>
                    {discordComplete ? 'Interact with our X post to earn +25 XP.' : 'Complete Discord verification to unlock'}
                  </p>
                  {discordComplete && !xCommunityComplete && (
                    <p className="text-xs text-cyan-300 mt-2">
                      Join the X community here for a one-time +50 XP bonus.
                    </p>
                  )}
                  {discordComplete && xCommunityComplete && (
                    <p className="text-xs text-green-300 mt-2">
                      X community bonus claimed.
                    </p>
                  )}
                  {discordComplete && notificationsSupported && !dailyReminderEnabled && (
                    <p className="text-xs text-gray-500 mt-2">
                      Enable daily browser reminders to come back and farm points.
                    </p>
                  )}
                  {discordComplete && notificationsSupported && dailyReminderEnabled && (
                    <p className="text-xs text-green-300 mt-2">
                      Daily reminder enabled.
                    </p>
                  )}
                  {discordComplete && !notificationsSupported && (
                    <p className="text-xs text-gray-500 mt-2">
                      Notifications are not supported in this browser.
                    </p>
                  )}
                  {discordComplete && dailyReminderMessage && (
                    <p className="text-xs text-gray-400 mt-2">{dailyReminderMessage}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {discordComplete ? (
                    <>
                      {dailyComplete ? (
                        <span className="neon-green font-orbitron">COMPLETED</span>
                      ) : (
                        <button
                          onClick={handleDailyCheckIn}
                          disabled={questing}
                          className="button-retro px-4 py-2 text-sm whitespace-nowrap"
                        >
                          GO TO X & CHECK IN
                        </button>
                      )}
                      {!dailyReminderEnabled && (
                        <button
                          onClick={handleEnableDailyReminder}
                          className="button-retro px-4 py-2 text-sm whitespace-nowrap"
                          type="button"
                          disabled={!notificationsSupported}
                        >
                          ENABLE DAILY REMINDER
                        </button>
                      )}
                      {!xCommunityComplete && (
                        <button
                          onClick={handleJoinXCommunity}
                          disabled={questing}
                          className="button-retro px-4 py-2 text-sm whitespace-nowrap"
                          type="button"
                        >
                          JOIN COMMUNITY & CLAIM 50 XP
                        </button>
                      )}
                      {xCommunityError && <p className="text-red-400 text-xs text-right">{xCommunityError}</p>}
                    </>
                  ) : (
                    <span className="text-gray-600 font-orbitron">LOCKED</span>
                  )}
                </div>
              </div>
            </div>

            <div className="card-retro p-8">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className={`${discordComplete ? 'neon-cyan' : 'text-gray-500'} mb-2`}>
                      MEME CONTEST SUBMISSION
                    </h3>
                    <div className={`${discordComplete ? 'text-gray-400' : 'text-gray-600'} text-sm space-y-2`}>
                      {discordComplete ? (
                        <>
                          <p className="text-cyan-200 font-semibold">How Meme Submission Works</p>
                          <p>
                            Post your meme on X, then submit the post URL below for review. We check entries daily.
                          </p>
                          <p className="text-cyan-300 text-xs font-orbitron tracking-wide">RULES</p>
                          <div className="space-y-1 text-xs">
                            <p>Relevancy: All memes must be relevant to FartWATER.</p>
                            <p>Tagging: To ensure we see your work, memes should ideally be tagged with $FRTWTR or @6fartwater9.</p>
                            <p>Submission Limit: Only one submission per day.</p>
                            <p>Winning Post: To be eligible for the $10 Grand Prize and the 1:1 NFT, the meme must be posted on your personal X profile.</p>
                            <p>Contest Result: Will be announced on the 22nd of every month.</p>
                          </div>
                        </>
                      ) : (
                        'Complete Discord verification to unlock'
                      )}
                    </div>
                    {discordComplete && (
                      <p className="text-xs text-yellow-300 mt-2">
                        $10 bounty winners must be posted on your personal X profile. Only one submission per day.
                      </p>
                    )}
                  </div>
                  <div className={`${discordComplete ? 'neon-green' : 'text-gray-600'} font-orbitron`}>
                    {discordComplete ? 'OPEN' : 'LOCKED'}
                  </div>
                </div>

                {discordComplete && (
                  <>
                    <div className="flex flex-col md:flex-row gap-2">
                      <input
                        type="url"
                        value={memeSubmissionUrl}
                        onChange={(event) => setMemeSubmissionUrl(event.target.value)}
                        placeholder="https://x.com/yourhandle/status/1234567890"
                        className="flex-1 bg-black/50 border border-white/20 rounded px-3 py-2 text-sm text-cyan-200 font-orbitron"
                        disabled={memeSubmitting || memeSubmissionLocked}
                      />
                      <button
                        onClick={handleSubmitMemeEntry}
                        disabled={memeSubmitting || memeSubmissionLocked}
                        className="button-retro px-4 py-2 text-sm whitespace-nowrap"
                        type="button"
                      >
                        {memeSubmitting ? 'SUBMITTING...' : memeSubmissionLocked ? 'SUBMITTED TODAY' : 'SUBMIT TODAY'}
                      </button>
                    </div>
                    {memeSubmitMessage && <p className="text-xs text-green-300">{memeSubmitMessage}</p>}
                    {memeSubmitError && <p className="text-xs text-red-400">{memeSubmitError}</p>}

                    {memeEntry && (
                      <div className="mt-1 p-4 bg-black/40 border border-white/10 rounded-lg space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-gray-500 font-orbitron">DAY:</span>
                          <span className="text-cyan-300 font-orbitron">{memeDay || memeEntry.contestMonth}</span>
                          <span className="text-gray-500 font-orbitron">MONTH:</span>
                          <span className="text-cyan-300 font-orbitron">{memeMonth || (memeEntry.contestMonth || '').slice(0, 7)}</span>
                          <span
                            className={`px-2 py-1 rounded font-orbitron ${
                              memeEntry.status === 'approved'
                                ? 'text-green-300 bg-green-900/30 border border-green-400/40'
                                : memeEntry.status === 'rejected'
                                  ? 'text-red-300 bg-red-900/30 border border-red-400/40'
                                  : 'text-yellow-300 bg-yellow-900/30 border border-yellow-400/40'
                            }`}
                          >
                            {memeEntry.status.toUpperCase()}
                          </span>
                        </div>
                        <a
                          href={memeEntry.xPostUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-300 text-sm underline break-all"
                        >
                          {memeEntry.xPostUrl}
                        </a>
                        <div className="text-xs text-gray-400">
                          Submitted: {formatUnixTime(memeEntry.submittedAt)}
                        </div>
                        {memeEntry.reviewedAt && (
                          <div className="text-xs text-gray-400">
                            Reviewed: {formatUnixTime(memeEntry.reviewedAt)}
                          </div>
                        )}
                        {memeEntry.status === 'approved' && (
                          <div className="text-xs text-green-300">
                            Rewards: +{memeEntry.rewardXp} XP, +{memeEntry.rewardBounties} bounties
                          </div>
                        )}
                        {memeEntry.reviewNote && (
                          <div className="text-xs text-gray-300">
                            Admin note: {memeEntry.reviewNote}
                          </div>
                        )}
                        {memeEntry.status === 'rejected' && (
                          <div className="text-xs text-yellow-300">
                            Only one submission per day. You can submit again tomorrow.
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="card-retro p-8">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`${discordComplete ? 'neon-green' : 'text-gray-500'} mb-2`}>
                      REFERRAL QUEST
                    </h3>
                    <p className={`${discordComplete ? 'text-gray-400' : 'text-gray-600'} text-sm`}>
                      {discordComplete
                        ? 'Use your personal referral URL to grow the community and earn rewards.'
                        : 'Complete Discord verification to unlock'}
                    </p>
                  </div>
                  <div className={`${discordComplete ? 'neon-green' : 'text-gray-600'} font-orbitron`}>
                    {discordComplete ? 'ACTIVE' : 'LOCKED'}
                  </div>
                </div>

                {discordComplete && status?.user?.id && (
                  <div className="mt-2 p-4 bg-black/40 border border-white/10 rounded-lg">
                    <label className="text-xs text-gray-500 mb-1 block font-orbitron">YOUR REFERRAL LINK</label>
                    <div className="flex gap-2">
                      <code className="flex-1 bg-black/50 p-2 rounded text-cyan-300 text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                        {referralLink || 'Loading...'}
                      </code>
                      <button onClick={handleCopyReferral} className="button-retro px-4 py-1 text-xs whitespace-nowrap">
                        {referralCopied ? 'COPIED!' : 'COPY'}
                      </button>
                    </div>
                    <div className="mt-3 text-xs text-cyan-200 space-y-1">
                      <div>Recive 100 xp for every person you refer that connects their wallet and joins the Discord!</div>
                      <div>Refer 5 people with your personal url and get one bounty</div>
                      <div>Refer 1 person who buys $frtwtr receive one bounty</div>
                      <div>Bounties get you $5 in $FRTWTR</div>
                    </div>
                    <div className="mt-3 text-xs text-gray-400 space-y-1">
                      <div>Total bounties: {referralSummary?.totalBounties ?? 0}</div>
                      <div>Manual admin bounties: {referralSummary?.manualAdminBounties ?? 0}</div>
                      <div>Qualified referrals (tracked): {referralSummary?.qualifiedWalletDiscord ?? 0}</div>
                      <div>Referral XP earned: {referralSummary?.referralXpAwardedTotal ?? 0}</div>
                      <div>
                        Next 5-pack bounty: {referralSummary?.remainingToNextFivePack ?? 5} more
                        (target {referralSummary?.nextFivePackTarget ?? 5})
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {canManageBonusLinks && (
              <div className="card-retro p-8">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <h3 className="neon-cyan mb-2">ONE-TIME BONUS URL</h3>
                      <p className="text-gray-400 text-sm">
                        Generate unlimited single-use URLs and control exactly how much XP each link gives.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 w-full md:w-auto md:items-end">
                      <label className="text-xs text-gray-500 font-orbitron">
                        XP PER LINK
                      </label>
                      <input
                        type="number"
                        min={MIN_ONE_TIME_BONUS_XP}
                        max={MAX_ONE_TIME_BONUS_XP}
                        step={1}
                        value={oneTimeBonusXp}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          if (!Number.isFinite(value)) {
                            setOneTimeBonusXp(DEFAULT_ONE_TIME_BONUS_XP);
                            return;
                          }
                          setOneTimeBonusXp(Math.trunc(value));
                        }}
                        className="w-full md:w-40 bg-black/50 border border-white/20 rounded px-3 py-2 text-sm text-cyan-200 font-orbitron"
                      />
                      <button
                        onClick={handleCreateOneTimeBonusLink}
                        disabled={oneTimeBonusCreating}
                        className="button-retro px-4 py-2 text-sm whitespace-nowrap"
                        type="button"
                      >
                        {oneTimeBonusCreating ? 'GENERATING...' : 'GENERATE ONE-TIME URL'}
                      </button>
                    </div>
                  </div>
                  {oneTimeBonusLink && (
                    <div className="mt-1 p-4 bg-black/40 border border-white/10 rounded-lg">
                      <label className="text-xs text-gray-500 mb-1 block font-orbitron">SINGLE-USE BONUS LINK</label>
                      <div className="flex gap-2">
                        <code className="flex-1 bg-black/50 p-2 rounded text-cyan-300 text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                          {oneTimeBonusLink}
                        </code>
                        <button
                          onClick={handleCopyOneTimeBonusLink}
                          className="button-retro px-4 py-1 text-xs whitespace-nowrap"
                          type="button"
                        >
                          {oneTimeBonusCopied ? 'COPIED!' : 'COPY'}
                        </button>
                      </div>
                    </div>
                  )}
                  {oneTimeBonusError && (
                    <p className="text-red-400 text-xs">{oneTimeBonusError}</p>
                  )}
                </div>
              </div>
            )}

            {canIssueRewards && (
              <div className="card-retro p-8">
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="neon-magenta mb-2">ADMIN REWARD ISSUER</h3>
                    <p className="text-gray-400 text-sm">
                      Grant XP and/or bounties directly to a community member.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500 font-orbitron">TARGET MEMBER</label>
                      <select
                        value={adminTargetUserId}
                        onChange={(event) => setAdminTargetUserId(event.target.value)}
                        className="bg-black/50 border border-white/20 rounded px-3 py-2 text-sm text-cyan-200 font-orbitron"
                        disabled={adminRewardMembersLoading || adminRewardMembers.length === 0}
                      >
                        {adminRewardMembersLoading && (
                          <option value="">Loading members...</option>
                        )}
                        {!adminRewardMembersLoading && adminRewardMembers.length === 0 && (
                          <option value="">No members found</option>
                        )}
                        {!adminRewardMembersLoading && adminRewardMembers.map((member) => (
                          <option key={member.userId} value={String(member.userId)}>
                            {member.displayName} ({member.totalBounties} B / {member.xp} XP)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500 font-orbitron">XP TO ISSUE</label>
                      <input
                        type="number"
                        min={0}
                        max={MAX_ADMIN_ISSUE_XP}
                        step={1}
                        value={adminRewardXp}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          setAdminRewardXp(Number.isFinite(value) ? Math.trunc(value) : 0);
                        }}
                        className="bg-black/50 border border-white/20 rounded px-3 py-2 text-sm text-cyan-200 font-orbitron"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500 font-orbitron">BOUNTIES TO ISSUE</label>
                      <input
                        type="number"
                        min={0}
                        max={MAX_ADMIN_ISSUE_BOUNTIES}
                        step={1}
                        value={adminRewardBounties}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          setAdminRewardBounties(Number.isFinite(value) ? Math.trunc(value) : 0);
                        }}
                        className="bg-black/50 border border-white/20 rounded px-3 py-2 text-sm text-cyan-200 font-orbitron"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <button
                      onClick={handleIssueAdminRewards}
                      disabled={adminIssueLoading}
                      className="button-retro px-4 py-2 text-sm whitespace-nowrap"
                      type="button"
                    >
                      {adminIssueLoading ? 'ISSUING...' : 'ISSUE REWARDS'}
                    </button>
                    {adminIssueMessage && <p className="text-xs text-green-300">{adminIssueMessage}</p>}
                  </div>
                  {adminRewardMembersError && <p className="text-red-400 text-xs">{adminRewardMembersError}</p>}
                  {adminIssueError && <p className="text-red-400 text-xs">{adminIssueError}</p>}
                </div>
              </div>
            )}

            {canIssueRewards && (
              <div className="card-retro p-8">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="neon-magenta mb-2">MEME CONTEST REVIEW QUEUE</h3>
                      <p className="text-gray-400 text-sm">
                        Review pending meme submissions. Approved XP must be between 100-1000. $10 bounty winners require a personal-profile X post.
                      </p>
                    </div>
                    <button
                      onClick={fetchAdminMemeEntries}
                      className="button-retro px-4 py-2 text-xs whitespace-nowrap"
                      type="button"
                      disabled={adminMemeLoading}
                    >
                      {adminMemeLoading ? 'LOADING...' : 'REFRESH'}
                    </button>
                  </div>

                  {adminMemeMessage && <p className="text-xs text-green-300">{adminMemeMessage}</p>}
                  {adminMemeError && <p className="text-xs text-red-400">{adminMemeError}</p>}

                  {!adminMemeLoading && adminMemeEntries.length === 0 && (
                    <p className="text-xs text-gray-400">No pending entries right now.</p>
                  )}

                  <div className="space-y-4">
                    {adminMemeEntries.map((entry) => (
                      <div key={entry.id} className="p-4 bg-black/40 border border-white/10 rounded-lg space-y-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-cyan-300 font-orbitron">ENTRY #{entry.id}</span>
                          <span className="text-gray-500">USER #{entry.userId}</span>
                          {entry.userDiscordName && (
                            <span className="text-gray-400">{entry.userDiscordName}</span>
                          )}
                          <span className="text-gray-500">MONTH {entry.contestMonth}</span>
                        </div>
                        <a
                          href={entry.xPostUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-300 text-sm underline break-all"
                        >
                          {entry.xPostUrl}
                        </a>
                        <p className="text-xs text-gray-400">
                          Submitted: {formatUnixTime(entry.submittedAt)}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <input
                            type="number"
                            min={MIN_MEME_APPROVAL_XP}
                            max={MAX_MEME_APPROVAL_XP}
                            step={1}
                            value={adminMemeXpById[entry.id] ?? 0}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              setAdminMemeXpById((previous) => ({
                                ...previous,
                                [entry.id]: Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0,
                              }));
                            }}
                            className="bg-black/50 border border-white/20 rounded px-3 py-2 text-xs text-cyan-200 font-orbitron"
                            placeholder="XP reward (100-1000)"
                          />
                          <input
                            type="number"
                            min={0}
                            max={MAX_ADMIN_ISSUE_BOUNTIES}
                            step={1}
                            value={adminMemeBountiesById[entry.id] ?? 0}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              setAdminMemeBountiesById((previous) => ({
                                ...previous,
                                [entry.id]: Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0,
                              }));
                            }}
                            className="bg-black/50 border border-white/20 rounded px-3 py-2 text-xs text-cyan-200 font-orbitron"
                            placeholder="Bounty reward"
                          />
                          <input
                            type="text"
                            value={adminMemeNoteById[entry.id] ?? ''}
                            onChange={(event) =>
                              setAdminMemeNoteById((previous) => ({
                                ...previous,
                                [entry.id]: event.target.value.slice(0, MAX_MEME_REVIEW_NOTE_LENGTH),
                              }))
                            }
                            className="bg-black/50 border border-white/20 rounded px-3 py-2 text-xs text-cyan-200 font-orbitron"
                            placeholder="Review note (optional)"
                          />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleReviewMemeEntry(entry.id, 'approve')}
                            disabled={adminMemeReviewingId === entry.id}
                            className="button-retro px-4 py-2 text-xs whitespace-nowrap"
                            type="button"
                          >
                            {adminMemeReviewingId === entry.id ? 'PROCESSING...' : 'APPROVE + REWARD'}
                          </button>
                          <button
                            onClick={() => handleReviewMemeEntry(entry.id, 'reject')}
                            disabled={adminMemeReviewingId === entry.id}
                            className="button-retro px-4 py-2 text-xs whitespace-nowrap border-red-500/60 text-red-300"
                            type="button"
                          >
                            REJECT
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function QuestBoardWithWallet() {
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider<Provider>('solana');

  return (
    <QuestBoardContent
      address={address}
      isConnected={isConnected}
      walletProvider={walletProvider}
    />
  );
}

export function QuestBoard() {
  const appKit = getAppKit();

  if (!appKit) {
    return <QuestBoardContent isConnected={false} />;
  }

  return <QuestBoardWithWallet />;
}
