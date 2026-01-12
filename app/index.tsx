import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/cramodoro-assets/login-logo.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.loginButtonText}>Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.signupButton}
          onPress={() => router.push('/signup')}
        >
          <Text style={styles.signupButtonText}>Sign Up</Text>
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
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logo: {
    width: '50%',
    aspectRatio: 1,
    maxWidth: 200,
    marginBottom: '10%',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  loginButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    width: '100%',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signupButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  signupButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
});
