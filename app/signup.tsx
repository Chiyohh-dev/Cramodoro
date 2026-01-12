import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { authAPI, checkBackendHealth } from "../api/api";
import localAuth from "../utils/localAuth";
import syncManager from "../utils/syncManager";

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const hasUpperCase = (str: string): boolean => /[A-Z]/.test(str);
const hasLowerCase = (str: string): boolean => /[a-z]/.test(str);
const hasNumber = (str: string): boolean => /[0-9]/.test(str);
const hasSpecialChar = (str: string): boolean => /[!@#$%^&*(),.?":{}|<>]/.test(str);

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail) {
      setError("Please enter your email");
      return;
    }
    
    if (!trimmedEmail.includes('@')) {
      setError("Please enter a valid email address");
      return;
    }
    
    if (!isValidEmail(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }
    
    if (!password) {
      setError("Please enter a password");
      return;
    }
    
    if (password.includes(' ')) {
      setError("Password cannot contain spaces");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    if (!hasLowerCase(password) || !hasUpperCase(password)) {
      setError("Password must contain both uppercase and lowercase letters");
      return;
    }
    
    if (!hasNumber(password)) {
      setError("Password must contain at least one number");
      return;
    }
    
    if (!confirmPassword) {
      setError("Please confirm your password");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      // Quick backend health check (2 second timeout)
      const isBackendAvailable = await checkBackendHealth();
      let response;
      
      if (!isBackendAvailable) {
        console.log('📴 Offline mode - creating local account');
        response = await localAuth.signup(trimmedEmail, password, confirmPassword);
      } else {
        try {
          console.log('🌐 Backend available - creating backend account');
          response = await authAPI.signup(trimmedEmail, password, confirmPassword);
          
          // Cache backend credentials locally for offline access
          console.log('💾 Caching credentials for offline use');
          try {
            await localAuth.cacheBackendUser(trimmedEmail, password, response);
          } catch (cacheErr) {
            console.error('⚠️ Failed to cache credentials, but continuing:', cacheErr);
            // Don't fail the signup if caching fails
          }
        } catch (backendErr) {
          console.log('⚠️ Backend signup failed, creating local account');
          response = await localAuth.signup(trimmedEmail, password, confirmPassword);
        }
      }
      
      await AsyncStorage.setItem('authToken', response.token);
      await AsyncStorage.setItem('userData', JSON.stringify(response.user));
      
      // Clear any existing decks from previous accounts
      await AsyncStorage.removeItem('decks');
      console.log('🧹 Cleared local decks for new account');
      
      // Setup auto-sync
      if (response.token && isBackendAvailable) {
        syncManager.setupAutoSync(response.token);
      }
      
      Alert.alert('Success', 'Account created successfully!');
      
      router.replace('/home');
    } catch (err) {
      console.error('Signup error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account';
      setError(errorMessage);
      Alert.alert('Signup Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/cramodoro-assets/login-logo.png')} 
        style={styles.logo}
        resizeMode="contain"
      />

      <View style={styles.formContainer}>
        <Text style={styles.label}>email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder=""
        />

        <Text style={styles.label}>password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={(text) => setPassword(text.replace(/\s/g, ''))}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            placeholder=""
          />
          <TouchableOpacity 
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Image 
              source={showPassword 
                ? require('../assets/cramodoro-assets/hidepass-icon.png')
                : require('../assets/cramodoro-assets/showpass-icon.png')
              } 
              style={styles.iconImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>confirm password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            value={confirmPassword}
            onChangeText={(text) => setConfirmPassword(text.replace(/\s/g, ''))}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            placeholder=""
          />
          <TouchableOpacity 
            style={styles.eyeIcon}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Image 
              source={showConfirmPassword 
                ? require('../assets/cramodoro-assets/hidepass-icon.png')
                : require('../assets/cramodoro-assets/showpass-icon.png')
              } 
              style={styles.iconImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity 
          style={[styles.signupButton, isLoading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signupButtonText}>Sign Up</Text>
          )}
        </TouchableOpacity>
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
    paddingTop: 60,
  },
  logo: {
    width: '45%',
    aspectRatio: 1.5,
    maxWidth: 180,
    marginBottom: '6%',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  label: {
    fontSize: 14,
    color: '#000',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    width: '100%',
  },
  passwordContainer: {
    position: 'relative',
    width: '100%',
  },
  passwordInput: {
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  iconImage: {
    width: 24,
    height: 24,
  },
  signupButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#DC3545',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});
