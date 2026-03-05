# Upload Instructions - New Homepage + Quest Board

## What Changed:

**New Structure:**
- `/` → Full FartWater landing page (Hero, Token Info, Episodes, Merch, Profiles, VIP, Quests teaser)
- `/quests/` → Quest board (Wallet connect, Discord link, XP system)

## Files to Upload:

Upload everything in `upload_to_vps/` to `/var/www/fartwater/`

**Key files:**
```
app/
├── page.tsx                  ← NEW homepage route
├── FartWaterHome.tsx        ← NEW landing page component
├── ClientHome.tsx           ← Keep (used by /quests)
├── quests/
│   ├── page.tsx            ← NEW quest route
│   └── ClientQuestBoard.tsx ← Quest board component
├── api/ (all routes)
├── layout.tsx
└── globals.css

components/
lib/
Config files (package.json, etc.)
```

## On Server:

```bash
cd /var/www/fartwater

# Stop PM2
pm2 delete all

# Backup .env.local
cp .env.local /root/.env.local.backup

# Clean everything
rm -rf *

# Upload all files from upload_to_vps/

# Restore .env.local
cp /root/.env.local.backup .env.local

# Install & build
npm install
npm run build

# Start
pm2 start npm --name "fartwater" -- start

# Watch logs
pm2 logs fartwater
```

## After Deploy:

Test both pages:
- **Homepage**: https://fartwater.fun/
- **Quest Board**: https://fartwater.fun/quests/

## What Works on Each Page:

### Homepage (`/`):
- Full landing page with all sections
- "Go to Quest Board" button links to /quests
- Social links in top bar
- Token dashboard (placeholders)
- Episode gallery with carousel
- Rapper profiles with modal popups
- Merch section
- VIP check section

### Quest Board (`/quests/`):
- Wallet connection (Reown/AppKit)
- Discord OAuth link
- Wallet verification
- Quest completion
- XP tracking
- User status display

Both pages use the same globals.css for styling!
