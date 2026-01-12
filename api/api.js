import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BACKEND_TUNNEL_URL = 'https://jackson-veristic-instantaneously.ngrok-free.dev/api';
const MANUAL_IP = '10.110.171.56';
const DEFAULT_ANDROID_HOST = '10.0.2.2';
const BACKEND_PORT = 5000;

const envTunnelUrl = (typeof process !== 'undefined' && process.env && process.env.BACKEND_TUNNEL_URL)
  || (Constants && (Constants.manifest?.extra?.BACKEND_TUNNEL_URL || Constants.expoConfig?.extra?.BACKEND_TUNNEL_URL))
  || BACKEND_TUNNEL_URL;

let API_HOST = 'localhost';
try {
  const manifest = Constants?.manifest || Constants?.expoConfig || {};
  const debuggerHost = (manifest?.debuggerHost || '').split(':')[0];
  if (debuggerHost) {
    API_HOST = debuggerHost;
  } else if (MANUAL_IP && MANUAL_IP !== 'localhost') {
    API_HOST = MANUAL_IP;
  }
} catch (e) {
  if (MANUAL_IP && MANUAL_IP !== 'localhost') {
    API_HOST = MANUAL_IP;
  }
}

const resolvedHost = Platform.OS === 'android' && API_HOST === 'localhost' ? DEFAULT_ANDROID_HOST : API_HOST;
const LAN_API_URL = `http://${resolvedHost}:${BACKEND_PORT}/api`;

// Prefer LAN (localhost) for offline operation. Ngrok tunnel remains available as fallback.
let USE_TUNNEL_PRIORITY = process.env.USE_TUNNEL === 'true' || false;
const API_URL = USE_TUNNEL_PRIORITY ? envTunnelUrl : LAN_API_URL;
const TOKEN_KEY = 'authToken';

// Network state tracking
let isConnected = true;
let connectionType = 'unknown';
let backendAvailable = null; // null = not checked, true = available, false = offline
let useTunnelForRequests = false; // Set to true when tunnel is the working connection

NetInfo.addEventListener(state => {
  isConnected = state.isConnected ?? true;
  connectionType = state.type;
  console.log('📡 Network status:', { isConnected, type: connectionType });
});

export const getNetworkStatus = async () => {
  const state = await NetInfo.fetch();
  return {
    isConnected: state.isConnected ?? false,
    type: state.type,
    isInternetReachable: state.isInternetReachable ?? false
  };
};

// Quick backend health check with short timeout
export const checkBackendHealth = async () => {
  if (backendAvailable !== null) {
    return backendAvailable;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

  try {
    console.log('🔍 Checking backend availability...');
    console.log(`   Trying: ${envTunnelUrl}/health`);
    
    // Try ngrok tunnel first (more reliable for emulator)
    const response = await fetch(`${envTunnelUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning page
      },
    });
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log('✅ Backend is available via tunnel - Online mode');
      backendAvailable = true;
      useTunnelForRequests = true; // Use tunnel for all subsequent requests
    } else {
      console.log('📴 Backend not responding - Offline mode');
      backendAvailable = false;
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.log('📴 Backend not available via tunnel - Offline mode');
    backendAvailable = false;
  }

  return backendAvailable;
};

// Reset backend check (useful for manual retry)
export const resetBackendCheck = () => {
  backendAvailable = null;
  useTunnelForRequests = false;
};

const apiRequest = async (endpoint, options = {}, retryCount = 0) => {
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true', // Skip ngrok warning page
      ...options.headers,
    },
  };

  // If health check determined tunnel works, use it first. Otherwise try LAN first.
  const urls = useTunnelForRequests 
    ? [envTunnelUrl, LAN_API_URL]
    : [LAN_API_URL, envTunnelUrl];

  const currentUrl = urls[retryCount] || urls[0];
  const isLastAttempt = retryCount >= urls.length - 1;

  // Add timeout for faster fallback
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    console.log(`🌐 Attempting request to: ${currentUrl}${endpoint}`);
    const response = await fetch(`${currentUrl}${endpoint}`, {
      ...config,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    let data = null;
    
    try {
      data = await response.json();
    } catch (parseErr) {
      data = null;
    }

    if (!response.ok) {
      const message = data?.error?.message || data?.message || 'Something went wrong';
      console.error(`❌ Request failed to: ${currentUrl}`, message);
      console.error('Response status:', response.status);
      console.error('Response data:', JSON.stringify(data, null, 2));
      throw new Error(message);
    }

    console.log(`✅ Request successful to: ${currentUrl}`);
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`❌ Request failed to: ${currentUrl}`, err.message);
    
    if (err instanceof Error) {
      // Network error or timeout - try fallback URL if available
      const isNetworkError = err.message === 'Network request failed' || 
                            err.name === 'AbortError' || 
                            err.message.includes('aborted');
      
      if (isNetworkError && !isLastAttempt) {
        console.log(`🔄 Retrying with fallback URL...`);
        return apiRequest(endpoint, options, retryCount + 1);
      }
      
      // All attempts failed
      if (err.message === 'Network request failed') {
        const networkStatus = await getNetworkStatus();
        if (!networkStatus.isConnected) {
          throw new Error('No internet connection. Please check your network settings.');
        }
        throw new Error('Cannot reach backend server. Make sure:\n1. MongoDB is running\n2. Backend server is running (npm run dev)\n3. Android emulator can reach 10.0.2.2:5000');
      }
      
      throw err;
    }
    throw new Error('Unknown error');
  }
};

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

export const deckAPI = {
  // Get all decks from backend
  getDecks: async (token) => {
    return apiRequest('/decks', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // Create deck on backend
  create: async (token, deckData) => {
    return apiRequest('/decks', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(deckData),
    });
  },

  // Update deck on backend
  update: async (token, deckId, deckData) => {
    return apiRequest(`/decks/${deckId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(deckData),
    });
  },

  // Delete deck on backend
  delete: async (token, deckId) => {
    return apiRequest(`/decks/${deckId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

export { API_URL, LAN_API_URL, TOKEN_KEY, envTunnelUrl as TUNNEL_URL };

