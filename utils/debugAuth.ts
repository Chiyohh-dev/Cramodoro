import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Debug utility to inspect and manage local authentication data
 */
export const debugAuth = {
  // List all cached users
  listAllUsers: async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const userKeys = allKeys.filter(key => key.startsWith('localUser_'));
      
      console.log(`\n📋 Found ${userKeys.length} cached users:`);
      
      for (const key of userKeys) {
        const userData = await AsyncStorage.getItem(key);
        if (userData) {
          const user = JSON.parse(userData);
          console.log(`\n  Key: ${key}`);
          console.log(`  Email: ${user.email}`);
          console.log(`  Username: ${user.username}`);
          console.log(`  Created: ${user.createdAt}`);
          console.log(`  Password Hash: ${user.passwordHash.substring(0, 20)}...`);
        }
      }
      
      return userKeys;
    } catch (error) {
      console.error('❌ Error listing users:', error);
      return [];
    }
  },

  // Clear all cached users
  clearAllUsers: async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const userKeys = allKeys.filter(key => key.startsWith('localUser_'));
      
      await AsyncStorage.multiRemove(userKeys);
      console.log(`✅ Cleared ${userKeys.length} cached users`);
      
      return userKeys.length;
    } catch (error) {
      console.error('❌ Error clearing users:', error);
      return 0;
    }
  },

  // Get user by email or username
  getUser: async (emailOrUsername: string) => {
    try {
      const key = `localUser_${emailOrUsername}`;
      const userData = await AsyncStorage.getItem(key);
      
      if (userData) {
        const user = JSON.parse(userData);
        console.log('\n✅ User found:');
        console.log(`  Email: ${user.email}`);
        console.log(`  Username: ${user.username}`);
        console.log(`  Created: ${user.createdAt}`);
        return user;
      } else {
        console.log(`❌ User not found with key: ${key}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting user:', error);
      return null;
    }
  },

  // Manually cache a user (useful for fixing sync issues)
  manualCacheUser: async (email: string, username: string, password: string) => {
    try {
      const Crypto = require('expo-crypto');
      
      // Use the same hashing as localAuth
      const salt = 'cramodoro-salt-2026-secure';
      const combined = password + salt;
      const passwordHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        combined
      );

      const user = {
        email,
        username: username || email.split('@')[0],
        passwordHash,
        createdAt: new Date().toISOString(),
      };

      // Save with both email and username keys
      await AsyncStorage.setItem(`localUser_${email}`, JSON.stringify(user));
      if (username && username !== email) {
        await AsyncStorage.setItem(`localUser_${username}`, JSON.stringify(user));
      }

      console.log('✅ User manually cached for offline use');
      console.log(`   Email key: localUser_${email}`);
      if (username && username !== email) {
        console.log(`   Username key: localUser_${username}`);
      }
      
      return user;
    } catch (error) {
      console.error('❌ Error manually caching user:', error);
      throw error;
    }
  },
};

export default debugAuth;
