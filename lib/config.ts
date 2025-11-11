import Constants from 'expo-constants';

// Environment configuration
const ENV = {
  dev: {
    apiUrl: 'http://localhost:3001/api',
    pythonApiUrl: 'http://localhost:5001',
    wsUrl: 'ws://localhost:3001',
  },
  staging: {
    apiUrl: 'https://api-staging.caloria.app/api',
    pythonApiUrl: 'https://ai-staging.caloria.app',
    wsUrl: 'wss://api-staging.caloria.app',
  },
  prod: {
    apiUrl: 'http://caloria.qrsef.com/api',
    pythonApiUrl: 'http://caloria.qrsef.com/api',
    wsUrl: 'ws://caloria.qrsef.com',
  },
};

// Get current environment
const getEnvVars = () => {
  // Check if running in Expo Go
  const isExpoGo = Constants.appOwnership === 'expo';
  
  // Check environment variable
  const environment = Constants.expoConfig?.extra?.environment || 'dev';
  
  // For development, use localhost
  if (__DEV__ || isExpoGo) {
    return ENV.dev;
  }
  
  // For production builds
  if (environment === 'prod') {
    return ENV.prod;
  }
  
  if (environment === 'staging') {
    return ENV.staging;
  }
  
  return ENV.dev;
};

export default getEnvVars();

// Helper to check if we're in development
export const isDevelopment = __DEV__;
export const isProduction = !__DEV__;
