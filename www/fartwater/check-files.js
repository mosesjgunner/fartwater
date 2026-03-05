const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Fartwater Files...\n');

const requiredFiles = [
  // API Routes
  'app/api/discord/authorize/route.ts',
  'app/api/discord/callback/route.ts',
  'app/api/quests/complete/route.ts',
  'app/api/quests/status/route.ts',
  'app/api/wallet/challenge/route.ts',
  'app/api/wallet/verify/route.ts',
  
  // Components
  'components/QuestBoard.tsx',
  'components/WalletButton.tsx',
  'components/WalletProvider.tsx',
  
  // Lib
  'lib/crypto.ts',
  'lib/db.ts',
  'lib/discord.ts',
  'lib/wallet-config.ts',
  
  // App
  'app/page.tsx',
  'app/layout.tsx',
  'app/globals.css',
  
  // Config
  'package.json',
  'tsconfig.json',
  'next.config.js',
  'tailwind.config.js',
  'postcss.config.js',
  'ecosystem.config.js',
  '.env.local',
  '.gitignore',
];

let allGood = true;

requiredFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    const stats = fs.statSync(fullPath);
    console.log(`✅ ${file} (${stats.size} bytes)`);
  } else {
    console.log(`❌ MISSING: ${file}`);
    allGood = false;
  }
});

console.log('\n' + '='.repeat(60));

if (allGood) {
  console.log('✅ ALL FILES PRESENT!');
  console.log('\n📤 Ready to upload to server!');
  console.log('\nNext steps:');
  console.log('1. Upload all files to /var/www/fartwater');
  console.log('2. Run: npm install');
  console.log('3. Run: npm run build');
  console.log('4. Run: pm2 restart fartwater');
} else {
  console.log('❌ Some files are missing!');
}

console.log('='.repeat(60));
