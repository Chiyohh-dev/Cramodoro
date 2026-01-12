/**
 * Manual Account Sync Script
 * 
 * Use this to manually sync an online account to local storage
 * 
 * Usage in your app (temporary):
 * 1. Import this in your login.tsx or any screen
 * 2. Call manualSyncAccount with your credentials
 * 3. Remove after syncing
 */

import { authAPI } from '../api/api';
import { debugAuth } from './debugAuth';
import localAuth from './localAuth';

export const manualSyncAccount = async (email: string, password: string) => {
  try {
    console.log('\n🔄 Manual Account Sync Starting...');
    console.log(`📧 Email: ${email}`);
    
    // First, try to login to the backend to verify credentials
    console.log('\n1️⃣ Verifying backend credentials...');
    const response = await authAPI.login(email, password);
    console.log('✅ Backend login successful');
    console.log(`   User: ${response.user.email}`);
    if (response.user.name) {
      console.log(`   Name: ${response.user.name}`);
    }
    
    // Now cache for offline use
    console.log('\n2️⃣ Caching for offline use...');
    await localAuth.cacheBackendUser(email, password, response);
    
    // Verify the cache worked
    console.log('\n3️⃣ Verifying local cache...');
    const cachedUser = await debugAuth.getUser(email);
    
    if (cachedUser) {
      console.log('\n✅✅ SYNC COMPLETE! Account is now available offline.');
      console.log(`   Email: ${cachedUser.email}`);
      console.log(`   Username: ${cachedUser.username}`);
      
      // Try a local login to verify it works
      console.log('\n4️⃣ Testing offline login...');
      const testLogin = await localAuth.login(email, password);
      console.log('✅ Offline login test successful!');
      
      return {
        success: true,
        user: cachedUser,
      };
    } else {
      console.error('\n❌ Cache verification failed - user not found locally');
      return {
        success: false,
        error: 'Cache verification failed',
      };
    }
  } catch (error) {
    console.error('\n❌ Manual sync failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export default manualSyncAccount;
