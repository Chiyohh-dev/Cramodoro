import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// Secure password hashing using expo-crypto
const secureHash = async (password: string): Promise<string> => {
  const salt = 'cramodoro-salt-2026-secure';
  const combined = password + salt;
  
  // Use SHA-256 for secure hashing
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    combined
  );
  
  return hash;
};

const generateToken = (email: string): string => {
  const timestamp = Date.now();
  return `offline_${email}_${timestamp}`;
};

interface User {
  email: string;
  username?: string;
  passwordHash: string;
  createdAt: string;
  name?: string;
  bio?: string;
  profilePicture?: string;
}

interface AuthResponse {
  token: string;
  user: {
    email: string;
    username?: string;
    id: string;
  };
}

export const localAuth = {
  // Signup locally
  signup: async (email: string, password: string, confirmPassword: string): Promise<AuthResponse> => {
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Check if user already exists
    const existingUser = await AsyncStorage.getItem(`localUser_${email}`);
    if (existingUser) {
      throw new Error('User already exists. Please login instead.');
    }

    // Create user
    const passwordHash = await secureHash(password);
    const user: User = {
      email,
      username: email.split('@')[0],
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    // Save user
    await AsyncStorage.setItem(`localUser_${email}`, JSON.stringify(user));

    // Generate token
    const token = generateToken(email);

    return {
      token,
      user: {
        email: user.email,
        username: user.username,
        id: email,
        name: user.username,
        bio: user.bio,
        profilePicture: user.profilePicture,
      },
    };
  },

  // Login locally
  login: async (usernameOrEmail: string, password: string): Promise<AuthResponse> => {
    // Try to find user with direct key first
    let userKey = `localUser_${usernameOrEmail}`;
    let userData = await AsyncStorage.getItem(userKey);

    // If not found and input looks like a username (no @), try to find by email pattern
    if (!userData && !usernameOrEmail.includes('@')) {
      // Search for any user with this username
      const allKeys = await AsyncStorage.getAllKeys();
      const userKeys = allKeys.filter(key => key.startsWith('localUser_'));
      
      for (const key of userKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const parsedUser = JSON.parse(data);
          if (parsedUser.username === usernameOrEmail) {
            userData = data;
            userKey = key;
            break;
          }
        }
      }
    }

    if (!userData) {
      throw new Error('Invalid credentials. User not found.');
    }

    const user: User = JSON.parse(userData);

    // Verify password
    const passwordHash = await secureHash(password);
    
    // Debug logging
    console.log('🔐 Login attempt for:', usernameOrEmail);
    console.log('🔑 Password hash match:', passwordHash === user.passwordHash);
    
    if (passwordHash !== user.passwordHash) {
      throw new Error('Invalid credentials. Incorrect password.');
    }

    // Generate token
    const token = generateToken(user.email);

    return {
      token,
      user: {
        email: user.email,
        username: user.username,
        id: user.email,
        name: user.name || user.username,
        bio: user.bio,
        profilePicture: user.profilePicture,
      },
    };
  },

  // Get profile from local storage
  getProfile: async (token: string): Promise<any> => {
    // For offline tokens, extract email from token format: offline_email_timestamp
    // For online tokens, get email from stored userData
    let email: string | null = null;
    
    if (token.startsWith('offline_')) {
      email = token.split('_')[1];
    } else {
      // Online token - get email from stored user data
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const storedUser = JSON.parse(storedUserData);
        email = storedUser.email || storedUser.id;
      }
    }
    
    if (!email) {
      throw new Error('Invalid token or user data not found');
    }

    let userData = await AsyncStorage.getItem(`localUser_${email}`);
    
    if (!userData) {
      // If localUser doesn't exist, try to get from userData
      console.log('⚠️ Local user cache not found, using userData');
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const storedUser = JSON.parse(storedUserData);
        return {
          email: storedUser.email || storedUser.id || email,
          username: storedUser.username || email.split('@')[0],
          id: storedUser.id || storedUser.email || email,
          createdAt: new Date().toISOString(),
          name: storedUser.name || storedUser.username,
          bio: storedUser.bio || '',
          profilePicture: storedUser.profilePicture,
        };
      }
      throw new Error('User not found');
    }

    const user: User = JSON.parse(userData);
    return {
      email: user.email,
      username: user.username,
      id: user.email,
      createdAt: user.createdAt,
      name: user.name || user.username,
      bio: (user as any).bio,
      profilePicture: (user as any).profilePicture,
    };
  },

  // Update profile locally
  updateProfile: async (token: string, updates: { username?: string; name?: string; email?: string; bio?: string; profilePicture?: string }): Promise<any> => {
    // For offline tokens, extract email from token format: offline_email_timestamp
    // For online tokens, get email from stored userData
    let email: string | null = null;
    
    if (token.startsWith('offline_')) {
      email = token.split('_')[1];
    } else {
      // Online token - get email from stored user data
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const storedUser = JSON.parse(storedUserData);
        email = storedUser.email || storedUser.id;
      }
    }
    
    if (!email) {
      throw new Error('Invalid token or user data not found');
    }

    let userData = await AsyncStorage.getItem(`localUser_${email}`);
    let user: any;
    
    if (!userData) {
      // If localUser doesn't exist, create it from userData
      console.log('⚠️ Local user cache not found, creating from userData');
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const storedUser = JSON.parse(storedUserData);
        user = {
          email: storedUser.email || storedUser.id || email,
          username: storedUser.username || email.split('@')[0],
          passwordHash: '', // Empty for backend users without cached password
          createdAt: new Date().toISOString(),
          name: storedUser.name || storedUser.username,
          bio: storedUser.bio || '',
          profilePicture: storedUser.profilePicture || undefined,
        };
      } else {
        throw new Error('User not found');
      }
    } else {
      user = JSON.parse(userData);
    }
    
    // Update fields
    if (updates.username) {
      user.username = updates.username;
    }
    if (updates.name) {
      user.name = updates.name;
    }
    if (updates.bio !== undefined) {
      user.bio = updates.bio;
    }
    if (updates.profilePicture !== undefined) {
      user.profilePicture = updates.profilePicture;
    }

    // If email changed, need to move the user data
    if (updates.email && updates.email !== email) {
      await AsyncStorage.removeItem(`localUser_${email}`);
      await AsyncStorage.setItem(`localUser_${updates.email}`, JSON.stringify(user));
      user.email = updates.email;
    } else {
      await AsyncStorage.setItem(`localUser_${email}`, JSON.stringify(user));
    }

    return {
      email: user.email,
      username: user.username,
      id: user.email,
    };
  },

  // Delete account locally
  deleteAccount: async (token: string): Promise<void> => {
    // For offline tokens, extract email from token format: offline_email_timestamp
    // For online tokens, get email from stored userData
    let email: string | null = null;
    
    if (token.startsWith('offline_')) {
      email = token.split('_')[1];
    } else {
      // Online token - get email from stored user data
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const storedUser = JSON.parse(storedUserData);
        email = storedUser.email;
      }
    }
    
    if (!email) {
      throw new Error('Invalid token or user data not found');
    }

    await AsyncStorage.removeItem(`localUser_${email}`);
  },

  // Clear all cached accounts (useful for fresh login)
  clearAllCachedAccounts: async (): Promise<number> => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const userKeys = allKeys.filter(key => key.startsWith('localUser_'));
      
      if (userKeys.length > 0) {
        await AsyncStorage.multiRemove(userKeys);
        console.log(`🧹 Cleared ${userKeys.length} cached accounts`);
        return userKeys.length;
      }
      
      console.log('✅ No cached accounts to clear');
      return 0;
    } catch (error) {
      console.error('❌ Failed to clear cached accounts:', error);
      throw error;
    }
  },

  // Cache backend user credentials for offline access
  cacheBackendUser: async (usernameOrEmail: string, password: string, response: AuthResponse): Promise<void> => {
    try {
      const email = response.user.email;
      const passwordHash = await secureHash(password);
      
      // Create fresh cached user with ONLY backend data (no old cached data)
      const cachedUser: User = {
        email,
        username: response.user.username || email.split('@')[0],
        passwordHash,
        createdAt: new Date().toISOString(),
        // Use ONLY data from backend response (fresh data)
        name: (response.user as any).name,
        bio: (response.user as any).bio,
        profilePicture: (response.user as any).profilePicture,
      };

      // Save with email as primary key
      await AsyncStorage.setItem(`localUser_${email}`, JSON.stringify(cachedUser));
      console.log(`💾 Cached user with email key: localUser_${email}`);
      
      // Also save with username as key if different from email
      if (response.user.username && response.user.username !== email) {
        await AsyncStorage.setItem(`localUser_${response.user.username}`, JSON.stringify(cachedUser));
        console.log(`💾 Cached user with username key: localUser_${response.user.username}`);
      }
      
      // Debug: verify the save worked
      const verification = await AsyncStorage.getItem(`localUser_${email}`);
      if (verification) {
        const verifyUser = JSON.parse(verification);
        console.log('✅ Backend credentials cached and verified for offline use');
        console.log(`   Email: ${verifyUser.email}, Username: ${verifyUser.username}`);
      } else {
        console.error('⚠️ Verification failed - user data not found after save');
      }
    } catch (error) {
      console.error('❌ Failed to cache backend credentials:', error);
      throw error; // Re-throw to alert caller of the failure
    }
  },
};

export default localAuth;
