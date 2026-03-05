// Discord OAuth2 and API utilities

const DISCORD_API_BASE = 'https://discord.com/api/v10';

export function getDiscordAuthUrl(): string {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('Discord OAuth configuration missing');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify guilds.join',
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Discord OAuth configuration missing');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function getDiscordUser(accessToken: string): Promise<{
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
}> {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Discord user');
  }

  return response.json();
}

export async function addUserToGuild(userId: string, accessToken: string): Promise<void> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!botToken || !guildId) {
    console.warn('Discord guild configuration missing');
    return;
  }

  const response = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: accessToken,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to add user to guild: ${error}`);
    // Don't throw - user might already be in server
  }
}

export async function assignDiscordRole(userId: string): Promise<void> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  const roleId = process.env.DISCORD_ROLE_ID;

  if (!botToken || !guildId || !roleId) {
    console.warn('Discord role assignment configuration missing');
    return;
  }

  const response = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to assign Discord role: ${error}`);
  }
}

export async function isUserInGuild(userId: string): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!botToken || !guildId) {
    throw new Error('Discord guild configuration missing');
  }

  const response = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`,
    {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    }
  );

  if (response.status === 404) {
    return false;
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to check guild member: ${error}`);
  }

  return true;
}

export async function getGuildMemberRoles(userId: string): Promise<string[]> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!botToken || !guildId) {
    throw new Error('Discord guild configuration missing');
  }

  const response = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`,
    {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    }
  );

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch guild member: ${error}`);
  }

  const data = await response.json();
  const roles = Array.isArray(data?.roles) ? data.roles : [];
  return roles as string[];
}

export async function hasDiscordRole(userId: string): Promise<boolean> {
  const roleId = process.env.DISCORD_ROLE_ID;
  if (!roleId) {
    throw new Error('Discord role configuration missing');
  }

  const roles = await getGuildMemberRoles(userId);
  return roles.includes(roleId);
}
