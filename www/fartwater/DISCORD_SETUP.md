# Discord OAuth Setup Instructions

The Discord confirmation feature requires proper OAuth configuration. Follow these steps:

## 1. Create Discord Application

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it (e.g., "Fartwater Quest")
4. Click "Create"

## 2. Configure OAuth2

1. In your Discord application, go to **OAuth2** → **General**
2. Copy your **Client ID** and **Client Secret**
3. Under "Redirects", add:
   ```
   https://fartwater.xyz/api/discord/callback
   ```
4. Click "Save Changes"

## 3. Set Required Scopes

In OAuth2 → URL Generator, select these scopes:
- `identify` - to get user information
- `guilds.join` - (optional) to add user to your server

## 4. Update Environment Variables

Edit `.env.local` and replace these values:

```env
DISCORD_CLIENT_ID=your_actual_client_id
DISCORD_CLIENT_SECRET=your_actual_client_secret
DISCORD_REDIRECT_URI=https://fartwater.xyz/api/discord/callback
```

## 5. Optional: Discord Bot Setup (for role assignment)

If you want to automatically assign roles when users verify:

1. In your Discord application, go to **Bot**
2. Click "Reset Token" and copy the token
3. Enable these Privileged Gateway Intents:
   - Server Members Intent
4. Go to **OAuth2** → **URL Generator**
   - Select scope: `bot`
   - Select permission: `Manage Roles`
5. Copy the generated URL and open it to invite bot to your server
6. In your Discord server, note the Server ID (enable Developer Mode in Discord settings)
7. Right-click the role you want to assign and copy its ID

Update `.env.local`:
```env
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_server_id
DISCORD_ROLE_ID=role_id_to_assign
```

## 6. Restart the Application

After updating `.env.local`, restart your Next.js application:

```bash
npm run dev
# or if using PM2
pm2 restart fartwater
```

## Testing

1. Visit your site at https://fartwater.xyz
2. Connect your Solana wallet
3. Click "LINK DISCORD"
4. You should be redirected to Discord OAuth
5. After authorizing, you'll be redirected back with Discord linked

## Troubleshooting

### "Discord OAuth configuration missing" error
- Check that all required env variables are set in `.env.local`
- Restart the Next.js dev server

### "Failed to exchange code for token" error
- Verify your Client ID and Secret are correct
- Check that the redirect URI matches exactly (including https://)

### Role assignment fails
- Ensure bot token is correct
- Verify the bot has "Manage Roles" permission
- Check that the bot's role is higher than the role it's trying to assign

## Current Status

✅ Discord OAuth endpoints created:
- `/api/discord/authorize` - Initiates OAuth flow
- `/api/discord/callback` - Handles OAuth callback

✅ Database schema includes Discord fields:
- `users.discord_id`
- `users.discord_name`
- `users.discord_avatar`

✅ Quest system ready:
- Discord verification quest type
- 100 XP reward on completion

⚠️ **Action Required**: Update `.env.local` with your Discord credentials
