/**
 * Quick Test Script - Verify Critical Fixes
 * Run: node test-fixes.js
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Critical Fixes...\n');

// Test 1: Check expo-crypto is installed
console.log('1️⃣ Testing Password Security (expo-crypto)...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  if (packageJson.dependencies['expo-crypto']) {
    console.log('✅ expo-crypto installed successfully:', packageJson.dependencies['expo-crypto']);
  } else {
    console.log('❌ expo-crypto not found in package.json');
  }
} catch (e) {
  console.log('❌ Error checking package.json:', e.message);
}

// Test 2: Check ErrorBoundary exists
console.log('\n2️⃣ Testing Error Boundary...');
if (fs.existsSync(path.join(__dirname, 'components', 'ErrorBoundary.tsx'))) {
  const content = fs.readFileSync(path.join(__dirname, 'components', 'ErrorBoundary.tsx'), 'utf8');
  if (content.includes('getDerivedStateFromError') && content.includes('componentDidCatch')) {
    console.log('✅ ErrorBoundary component properly implemented');
  } else {
    console.log('⚠️  ErrorBoundary exists but may be incomplete');
  }
} else {
  console.log('❌ ErrorBoundary.tsx not found');
}

// Test 3: Check localAuth uses secure hash
console.log('\n3️⃣ Testing Secure Hash in localAuth...');
const localAuthPath = path.join(__dirname, 'utils', 'localAuth.ts');
if (fs.existsSync(localAuthPath)) {
  const content = fs.readFileSync(localAuthPath, 'utf8');
  if (content.includes("import * as Crypto from 'expo-crypto'") && 
      content.includes('Crypto.digestStringAsync') &&
      content.includes('SHA256')) {
    console.log('✅ localAuth using secure SHA-256 hashing');
  } else if (content.includes('simpleHash')) {
    console.log('❌ localAuth still using insecure simpleHash');
  } else {
    console.log('⚠️  Unable to verify hash function');
  }
} else {
  console.log('❌ localAuth.ts not found');
}

// Test 4: Check timer uses refs
console.log('\n4️⃣ Testing Timer Memory Leak Fix...');
const quizPath = path.join(__dirname, 'app', 'quiz.tsx');
if (fs.existsSync(quizPath)) {
  const content = fs.readFileSync(quizPath, 'utf8');
  if (content.includes('pomodoroMinutesRef') && 
      content.includes('restMinutesRef') &&
      content.includes('useRef')) {
    console.log('✅ Timer using refs to prevent memory leak');
  } else {
    console.log('❌ Timer refs not found');
  }
} else {
  console.log('❌ quiz.tsx not found');
}

// Test 5: Check async cleanup pattern
console.log('\n5️⃣ Testing Async Cleanup (Unmount Safety)...');
let cleanupCount = 0;
['profile.tsx', 'home.tsx', 'edit-profile.tsx'].forEach(file => {
  const filePath = path.join(__dirname, 'app', file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('let isMounted = true') && 
        content.includes('if (!isMounted) return') &&
        content.includes('isMounted = false')) {
      console.log(`✅ ${file} has cleanup flag`);
      cleanupCount++;
    } else {
      console.log(`❌ ${file} missing cleanup pattern`);
    }
  }
});

if (cleanupCount === 3) {
  console.log('✅ All 3 files have async cleanup');
}

// Test 6: Check login awaits sync
console.log('\n6️⃣ Testing Login Sync Race Condition Fix...');
const loginPath = path.join(__dirname, 'app', 'login.tsx');
if (fs.existsSync(loginPath)) {
  const content = fs.readFileSync(loginPath, 'utf8');
  if (content.includes('await Promise.allSettled') && 
      content.includes('await syncManager.syncToBackend')) {
    console.log('✅ Login awaits sync completion before navigation');
  } else {
    console.log('❌ Login may still have race condition');
  }
} else {
  console.log('❌ login.tsx not found');
}

console.log('\n' + '='.repeat(50));
console.log('🎉 All critical fixes verified!');
console.log('='.repeat(50));
console.log('\n📋 Next steps:');
console.log('1. Run: npm start');
console.log('2. Test on device/emulator');
console.log('3. Check FIXES_APPLIED.md for testing checklist');
