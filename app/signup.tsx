import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

// Validation helper functions
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
    // Validation
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
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      // Simulate signup - frontend only
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Save mock data to AsyncStorage
      await AsyncStorage.setItem('authToken', 'mock-token-' + Date.now());
      await AsyncStorage.setItem('userData', JSON.stringify({ email: trimmedEmail }));
      
      Alert.alert('Success', 'Account created successfully!');
      
      // Navigate back to landing
      router.replace('/');
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
        source={require('../cramodoro-assets/login-logo.png')} 
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
                ? require('../cramodoro-assets/hidepass-icon.png')
                : require('../cramodoro-assets/showpass-icon.png')
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
                ? require('../cramodoro-assets/hidepass-icon.png')
                : require('../cramodoro-assets/showpass-icon.png')
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
