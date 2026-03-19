/**
 * Setup Verification Script
 * Run this to verify your installation is correct
 */

import fs from 'fs';
import path from 'path';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

const results: CheckResult[] = [];

function check(name: string, condition: boolean, passMsg: string, failMsg: string) {
  results.push({
    name,
    status: condition ? 'pass' : 'fail',
    message: condition ? passMsg : failMsg
  });
}

function warn(name: string, message: string) {
  results.push({
    name,
    status: 'warning',
    message
  });
}

console.log('🔍 Verifying SaaS POS System Setup...\n');

// Check Node.js version
const nodeVersion = process.version;
const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0]);
check(
  'Node.js Version',
  nodeMajor >= 18,
  `✓ Node.js ${nodeVersion} (>= 18.0.0)`,
  `✗ Node.js ${nodeVersion} - Please upgrade to 18.0.0 or higher`
);

// Check package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
check(
  'package.json',
  fs.existsSync(packageJsonPath),
  '✓ package.json found',
  '✗ package.json not found'
);

// Check node_modules
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
check(
  'Dependencies',
  fs.existsSync(nodeModulesPath),
  '✓ node_modules installed',
  '✗ node_modules not found - Run: npm install'
);

// Check .env file
const envPath = path.join(process.cwd(), '.env');
check(
  'Environment File',
  fs.existsSync(envPath),
  '✓ .env file exists',
  '✗ .env file not found - Copy .env.example to .env'
);

// Check required directories
const requiredDirs = [
  'app',
  'components',
  'lib',
  'models',
  'store',
  'scripts'
];

requiredDirs.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  check(
    `Directory: ${dir}`,
    fs.existsSync(dirPath),
    `✓ ${dir}/ exists`,
    `✗ ${dir}/ not found`
  );
});

// Check key files
const requiredFiles = [
  'app/layout.tsx',
  'app/page.tsx',
  'middleware.ts',
  'lib/db.ts',
  'lib/auth.ts',
  'models/User.ts',
  'models/Business.ts',
  'models/Product.ts'
];

requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  check(
    `File: ${file}`,
    fs.existsSync(filePath),
    `✓ ${file} exists`,
    `✗ ${file} not found`
  );
});

// Check documentation
const docFiles = [
  'README.md',
  'QUICKSTART.md',
  'INSTALLATION.md',
  'API.md',
  'DEPLOYMENT.md'
];

docFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  check(
    `Documentation: ${file}`,
    fs.existsSync(filePath),
    `✓ ${file} exists`,
    `✗ ${file} not found`
  );
});

// Check environment variables
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  
  const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'NEXT_PUBLIC_APP_URL'
  ];

  requiredEnvVars.forEach(envVar => {
    check(
      `Env Var: ${envVar}`,
      envContent.includes(envVar),
      `✓ ${envVar} configured`,
      `✗ ${envVar} not found in .env`
    );
  });

  // Check if using default JWT secret
  if (envContent.includes('your-super-secret-jwt-key-change-this-in-production')) {
    warn(
      'JWT Secret',
      '⚠ Using default JWT_SECRET - Change this for production!'
    );
  }
}

// Print results
console.log('\n📋 Verification Results:\n');
console.log('═'.repeat(60));

let passCount = 0;
let failCount = 0;
let warnCount = 0;

results.forEach(result => {
  const icon = result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '⚠';
  const color = result.status === 'pass' ? '\x1b[32m' : result.status === 'fail' ? '\x1b[31m' : '\x1b[33m';
  const reset = '\x1b[0m';
  
  console.log(`${color}${icon} ${result.name}${reset}`);
  console.log(`  ${result.message}`);
  
  if (result.status === 'pass') passCount++;
  else if (result.status === 'fail') failCount++;
  else warnCount++;
});

console.log('═'.repeat(60));
console.log(`\n📊 Summary: ${passCount} passed, ${failCount} failed, ${warnCount} warnings\n`);

if (failCount === 0 && warnCount === 0) {
  console.log('🎉 All checks passed! Your setup is ready.');
  console.log('\n📝 Next steps:');
  console.log('   1. Start MongoDB: mongod');
  console.log('   2. Seed database: npm run seed');
  console.log('   3. Start dev server: npm run dev');
  console.log('   4. Open: http://localhost:3000\n');
} else if (failCount === 0) {
  console.log('✅ Setup is functional but has warnings.');
  console.log('⚠️  Please review warnings above.\n');
} else {
  console.log('❌ Setup has issues that need to be fixed.');
  console.log('🔧 Please resolve the failed checks above.\n');
  process.exit(1);
}

// Additional checks
console.log('💡 Additional Recommendations:\n');
console.log('   • Ensure MongoDB is installed and running');
console.log('   • Review .env file and update values');
console.log('   • Read QUICKSTART.md for setup instructions');
console.log('   • Check INSTALLATION.md for detailed guide');
console.log('   • Review API.md for API documentation\n');

console.log('📚 Documentation:');
console.log('   • README.md - Main documentation');
console.log('   • QUICKSTART.md - 5-minute setup');
console.log('   • FEATURES.md - Complete feature list');
console.log('   • DEPLOYMENT.md - Production deployment\n');

console.log('🆘 Need help? Check the documentation or open an issue.\n');
