// API configuration - pick a host that works for simulator/emulator/device
const { Platform } = require('react-native');

// IMPORTANT: Backend server IP configuration
// When using Expo Tunnel (default): backend must be accessible via ngrok or similar
// For physical device on LAN: set this to your computer's local IP (run ipconfig on Windows)
// For emulators: Android uses 10.0.2.2, iOS uses localhost
const MANUAL_IP = '10.110.171.56'; // Your computer's IP on local network

// Option 1: Use a public tunnel for backend (recommended for Expo Tunnel mode)
// Uncomment and set this if you're exposing your backend via ngrok or similar:
// const BACKEND_TUNNEL_URL = 'https://your-ngrok-url.ngrok.io/api';

// Option 2: Use local network IP (works on LAN with physical devices)
let API_HOST = 'localhost';

try {
  // Try to read Expo debugger host to infer LAN IP when using Expo Go
  const Constants = require('expo-constants');
  const manifest = Constants.manifest || Constants.expoConfig || {};
  const debuggerHost = (manifest?.debuggerHost || '').split(':')[0];
  if (debuggerHost) {
    API_HOST = debuggerHost;
    console.log('📡 Using Expo debugger host:', debuggerHost);
  } else if (MANUAL_IP && MANUAL_IP !== 'localhost') {
    // Fallback to manual IP for physical devices
    API_HOST = MANUAL_IP;
    console.log('📡 Using manual IP:', MANUAL_IP);
  }
} catch (e) {
  // Fallback to manual IP if expo-constants is not available
  if (MANUAL_IP && MANUAL_IP !== 'localhost') {
    API_HOST = MANUAL_IP;
    console.log('📡 Using manual IP (fallback):', MANUAL_IP);
  }
}

// Android emulator (default) needs 10.0.2.2 to reach host machine
const DEFAULT_ANDROID_HOST = '10.0.2.2';

// Uncomment this line to use backend tunnel URL:
// const API_URL = BACKEND_TUNNEL_URL;

// Default: use local/LAN configuration
const resolvedHost = Platform.OS === 'android' && API_HOST === 'localhost' ? DEFAULT_ANDROID_HOST : API_HOST;
const API_URL = `http://${resolvedHost}:5000/api`;

console.log('🌐 API URL:', API_URL);

// Storage key for auth token
const TOKEN_KEY = 'authToken';

// API helper function
const apiRequest = async (endpoint, options = {}) => {
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);

    // If response has no json body (network error or non-json), handle gracefully
    let data = null;
    try {
      data = await response.json();
    } catch (parseErr) {
      data = null;
    }

    if (!response.ok) {
      const message = data?.error?.message || data?.message || 'Something went wrong';
      throw new Error(message);
    }

    return data;
  } catch (err) {
    // Normalize network errors for UI
    if (err instanceof Error) {
      // Common network failure message from React Native fetch
      if (err.message === 'Network request failed') {
        throw new Error('Network request failed - is the backend server running?');
      }
      throw err;
    }
    throw new Error('Unknown error');
  }
};

// Auth API
export const authAPI = {
  login: async (usernameOrEmail, password) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail, password }),
    });
  },

  signup: async (email, password, confirmPassword) => {
    return apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, confirmPassword }),
    });
  },
};

// User API
export const userAPI = {
  getProfile: async (token) => {
    return apiRequest('/users/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  updateProfile: async (token, data) => {
    return apiRequest('/users/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  },

  deleteAccount: async (token) => {
    return apiRequest('/users/profile', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

export { API_URL, TOKEN_KEY };

