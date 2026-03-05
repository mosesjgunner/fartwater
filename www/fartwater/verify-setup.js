// Quick verification script to check Discord setup
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Discord Setup...\n');

// Check required files
const requiredFiles = [
  'lib/discord.ts',
  'lib/db.ts',
  'app/api/discord/authorize/route.ts',
  'app/api/discord/callback/route.ts',
  '.env.local',
];

let allFilesExist = true;
console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

// Check environment variables
console.log('\n🔐 Checking environment variables:');
try {
  const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
  
  const requiredVars = [
    'DISCORD_CLIENT_ID',
    'DISCORD_CLIENT_SECRET',
    'DISCORD_REDIRECT_URI'
  ];
  
  requiredVars.forEach(varName => {
    const hasVar = envContent.includes(`${varName}=`);
    const hasPlaceholder = envContent.includes('YOUR_') || envContent.includes('your_');
    
    if (hasVar) {
      if (hasPlaceholder) {
        console.log(`  ⚠️  ${varName} - EXISTS but needs real value`);
      } else {
        console.log(`  ✅ ${varName} - configured`);
      }
    } else {
      console.log(`  ❌ ${varName} - MISSING`);
    }
  });
} catch (error) {
  console.log('  ❌ Cannot read .env.local');
}

// Check data directory
console.log('\n📊 Checking database:');
const dataDir = path.join(__dirname, 'data');
if (fs.existsSync(dataDir)) {
  console.log('  ✅ data/ directory exists');
  const dbFile = path.join(dataDir, 'fartwater.db');
  if (fs.existsSync(dbFile)) {
    const stats = fs.statSync(dbFile);
    console.log(`  ✅ fartwater.db exists (${stats.size} bytes)`);
  } else {
    console.log('  ⚠️  fartwater.db will be created on first run');
  }
} else {
  console.log('  ⚠️  data/ directory will be created on first run');
}

// Final summary
console.log('\n' + '='.repeat(50));
if (allFilesExist) {
  console.log('✅ All required files are present');
  console.log('\n📝 Next steps:');
  console.log('1. Update .env.local with your Discord credentials');
  console.log('2. See DISCORD_SETUP.md for detailed instructions');
  console.log('3. Run: npm run dev');
  console.log('4. Test the Discord link flow');
} else {
  console.log('❌ Some files are missing - setup incomplete');
}
console.log('='.repeat(50));
