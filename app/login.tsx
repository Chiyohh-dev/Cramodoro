import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { authAPI, checkBackendHealth, deckAPI, userAPI } from "../api/api";
import { Button } from "../components/Button";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import debugAuth from "../utils/debugAuth";
import localAuth from "../utils/localAuth";
import syncManager from "../utils/syncManager";

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const containsEmail = (input: string): boolean => {
  return input.includes('@');
};

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDebugTools, setShowDebugTools] = useState(false);

  // Debug tool to manually sync account
  const handleManualSync = async () => {
    const trimmedUsername = username.trim();
    
    if (!trimmedUsername || !password) {
      Alert.alert('Error', 'Please enter your email/username and password');
      return;
    }

    setIsLoading(true);
    try {
      console.log('\n🔄 Starting manual account sync...');
      
      // Try backend login first
      const response = await authAPI.login(trimmedUsername, password);
      console.log('✅ Backend login successful');
      
      // Cache for offline
      await localAuth.cacheBackendUser(trimmedUsername, password, response);
      
      // Verify
      const cached = await debugAuth.getUser(response.user.email);
      if (cached) {
        Alert.alert(
          'Success!', 
          'Your account has been synced for offline use. You can now login without internet.'
        );
      } else {
        Alert.alert('Warning', 'Sync completed but verification failed. Please try again.');
      }
    } catch (err) {
      console.error('Manual sync error:', err);
      Alert.alert(
        'Sync Failed',
        err instanceof Error ? err.message : 'Failed to sync account'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    const trimmedUsername = username.trim();
    
    if (!trimmedUsername) {
      setError("Please enter your username or email");
      return;
    }
    
    if (containsEmail(trimmedUsername) && !isValidEmail(trimmedUsername)) {
      setError("Please enter a valid email address");
      return;
    }
    
    if (!password) {
      setError("Please enter your password");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      // Quick backend health check (2 second timeout)
      const isBackendAvailable = await checkBackendHealth();
      let response;
      
      if (!isBackendAvailable) {
        console.log('📴 Offline mode - using local authentication');
        response = await localAuth.login(trimmedUsername, password);
      } else {
        try {
          console.log('🌐 Backend available - using backend authentication');
          response = await authAPI.login(trimmedUsername, password);
          
          // Fetch full profile to get bio and profile picture
          try {
            const profileData = await userAPI.getProfile(response.token);
            // Merge profile data into response
            response.user = { ...response.user, ...profileData.user };
          } catch (profileErr) {
            console.log('⚠️ Could not fetch full profile, using basic data');
          }
          
          // Cache backend credentials locally for offline access
          console.log('💾 Caching credentials for offline use');
          try {
            await localAuth.cacheBackendUser(trimmedUsername, password, response);
          } catch (cacheErr) {
            console.error('⚠️ Failed to cache credentials, but continuing:', cacheErr);
            // Don't fail the login if caching fails
          }
        } catch (backendErr) {
          console.log('⚠️ Backend auth failed, trying local authentication');
          response = await localAuth.login(trimmedUsername, password);
        }
      }
      
      await AsyncStorage.setItem('authToken', response.token);
      await AsyncStorage.setItem('userData', JSON.stringify(response.user));
      
      // Clear decks for account isolation - will be loaded fresh per user
      await AsyncStorage.removeItem('decks');
      console.log('🧹 Cleared local decks for account isolation');
      
      // For offline users, load their user-specific decks
      if (response.token.startsWith('offline_')) {
        try {
          const userEmail = response.user.email;
          const userDecksKey = `decks_${userEmail}`;
          const userDecksStr = await AsyncStorage.getItem(userDecksKey);
          
          if (userDecksStr) {
            // Load this user's decks
            await AsyncStorage.setItem('decks', userDecksStr);
            const userDecks = JSON.parse(userDecksStr);
            console.log(`📦 Loaded ${userDecks.length} decks for offline user: ${userEmail}`);
          } else {
            console.log('📦 No decks found for offline user');
          }
        } catch (err) {
          console.error('⚠️ Error loading offline user decks:', err);
        }
      }
      
      // If backend available, sync MongoDB data to local storage
      if (isBackendAvailable && !response.token.startsWith('offline_')) {
        try {
          console.log('📥 Syncing MongoDB data with local storage...');
          
          // Get MongoDB decks for THIS user
          const decksResponse = await deckAPI.getDecks(response.token);
          const mongoDecks = decksResponse?.decks || [];
          console.log(`☁️ Found ${mongoDecks.length} MongoDB decks for this user`);
          
          if (mongoDecks.length > 0) {
            // MongoDB has decks - replace local storage with THIS user's decks only
            const userDecks = mongoDecks.map((mongoDeck: any) => ({
              id: mongoDeck._id,
              name: mongoDeck.name,
              pomodoroMinutes: mongoDeck.pomodoroMinutes,
              restMinutes: mongoDeck.restMinutes,
              cards: mongoDeck.cards || []
            }));
            
            await AsyncStorage.setItem('decks', JSON.stringify(userDecks));
            console.log(`✅ Loaded ${userDecks.length} decks for this user from MongoDB`);
          } else {
            // No MongoDB decks - ensure clean start
            console.log('📦 No decks found in MongoDB for this user');
          }
        } catch (syncErr) {
          console.error('⚠️ Failed to sync MongoDB data:', syncErr);
          // Continue anyway - user can still use app
        }
      }
      
      // Clear all old cached accounts and sync queue for fresh login
      if (response.token && isBackendAvailable) {
        await localAuth.clearAllCachedAccounts();
        await syncManager.clearSyncQueue();
        console.log('🧹 Cleared all cached accounts and sync queue for fresh login');
        syncManager.setupAutoSync(response.token);
        await syncManager.syncToBackend(response.token);
      }
      
      router.replace('/home');
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to login.';
      setError(errorMessage);
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header style={styles.headerOverride} logoStyle={styles.logo} />

      <View style={styles.formContainer}>
        <Input
          label="username or email"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholder=""
          accessibilityLabel="Username or email"
          accessibilityHint="Enter your username or email address"
        />

        <Text 
          style={styles.label}
          accessible={true}
          accessibilityRole="text"
        >
          password
        </Text>
        <View style={styles.passwordContainer}>
          <Input
            value={password}
            onChangeText={(text) => setPassword(text.replace(/\s/g, ''))}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            placeholder=""
            containerStyle={styles.passwordInputContainer}
            inputStyle={styles.passwordInput}
            accessibilityLabel="Password"
            accessibilityHint="Enter your password"
          />
          <TouchableOpacity 
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            accessibilityHint="Toggles password visibility"
          >
            <Image 
              source={showPassword 
                ? require('../assets/cramodoro-assets/hidepass-icon.png')
                : require('../assets/cramodoro-assets/showpass-icon.png')
              } 
              style={styles.iconImage}
              resizeMode="contain"
              accessible={false}
            />
          </TouchableOpacity>
        </View>

        {error ? (
          <Text 
            style={styles.errorText}
            accessible={true}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {error}
          </Text>
        ) : null}

        <Button
          title="Log In"
          onPress={handleLogin}
          loading={isLoading}
          variant="primary"
          style={styles.loginButton}
          accessibilityLabel="Log in"
          accessibilityHint="Logs into your account"
        />

        {/* Debug/Sync Tools - Can be removed later */}
        <TouchableOpacity 
          onPress={() => setShowDebugTools(!showDebugTools)}
          style={styles.debugToggle}
        >
          <Text style={styles.debugToggleText}>
            {showDebugTools ? '▼' : '▶'} Offline Sync Tools
          </Text>
        </TouchableOpacity>

        {showDebugTools && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Account Not Synced?</Text>
            <Text style={styles.debugDescription}>
              If you created your account online but can't login offline, use this tool to sync it.
            </Text>
            <TouchableOpacity
              style={styles.syncButton}
              onPress={handleManualSync}
              disabled={isLoading}
            >
              <Text style={styles.syncButtonText}>
                🔄 Sync Account for Offline Use
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.debugButton}
              onPress={async () => {
                const users = await debugAuth.listAllUsers();
                Alert.alert('Cached Users', `Found ${users.length} cached accounts`);
              }}
            >
              <Text style={styles.debugButtonText}>
                📋 List Cached Accounts
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  headerOverride: {
    paddingTop: 60,
    paddingBottom: 10,
  },
  logo: {
    width: '45%',
    aspectRatio: 1.5,
    maxWidth: 180,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    color: '#000',
    marginBottom: 8,
  },
  passwordInputContainer: {
    marginBottom: 0,
  },
  passwordContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 16,
  },
  passwordInput: {
    paddingRight: 50,
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  iconImage: {
    width: 24,
    height: 24,
  },
  loginButton: {
    marginTop: 8,
  },
  errorText: {
    color: '#DC3545',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  debugToggle: {
    marginTop: 20,
    padding: 10,
    alignItems: 'center',
  },
  debugToggleText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  debugContainer: {
    marginTop: 10,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  debugDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    lineHeight: 18,
  },
  syncButton: {
    backgroundColor: '#2196F3',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  debugButton: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  debugButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
  },
});
