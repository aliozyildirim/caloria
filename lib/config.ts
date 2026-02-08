import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Android emulator uses 10.0.2.2 to reach host machine's localhost
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

// Environment configuration
const ENV = {
  dev: {
    apiUrl: `http://${DEV_HOST}:3001/api`,
    pythonApiUrl: `http://${DEV_HOST}:5001`,
    wsUrl: `ws://${DEV_HOST}:3001`,
  },
  staging: {
    apiUrl: 'https://api-staging.caloria.app/api',
    pythonApiUrl: 'https://ai-staging.caloria.app',
    wsUrl: 'wss://api-staging.caloria.app',
  },
  prod: {
    apiUrl: 'https://caloria.qrsef.com/api',
    pythonApiUrl: 'https://caloria.qrsef.com:5001',
    wsUrl: 'wss://caloria.qrsef.com',
  },
};

// Get current environment
const getEnvVars = () => {
  // Check if running in Expo Go
  const isExpoGo = Constants.appOwnership === 'expo';
  
  // Check environment variable
  const environment = Constants.expoConfig?.extra?.environment || 'prod';
  
  // Use environment from app.json
  if (environment === 'dev') {
    return ENV.dev;
  }
  
  if (environment === 'staging') {
    return ENV.staging;
  }
  
  if (environment === 'prod') {
    return ENV.prod;
  }
  
  // Fallback: For development, use localhost
  if (__DEV__ || isExpoGo) {
    return ENV.dev;
  }
  
  return ENV.prod; // Default to production
};

const config = getEnvVars();

// Debug: Log which environment is being used
console.log('🔧 API Config:', {
  environment: Constants.expoConfig?.extra?.environment || 'prod',
  isExpoGo: Constants.appOwnership === 'expo',
  __DEV__,
  apiUrl: config.apiUrl,
  pythonApiUrl: config.pythonApiUrl,
});

export default config;

// Helper to check if we're in development
export const isDevelopment = __DEV__;
export const isProduction = !__DEV__;
