import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
const API_BASE = 'http://localhost:3001/api';

export interface User {
  id: number;
  email: string;
  username: string;
  fullName: string;
  avatar?: string;
  token?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

class AuthService {
  private static instance: AuthService;
  private token: string | null = null;
  private user: User | null = null;
  private listeners: Array<(user: User | null) => void> = [];

  private constructor() {
    this.init();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async init() {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        this.token = token;
        await this.validateToken();
      }
    } catch (error) {
      console.error('Auth init error:', error);
    }
  }

  private async apiCall(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any) {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (this.token) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${this.token}`
      };
    }

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, options);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'API call failed');
      }
      
      return result;
    } catch (error) {
      console.error('API call error:', error);
      throw error;
    }
  }

  private async validateToken(): Promise<boolean> {
    try {
      console.log('Validating token...');
      const userData = await this.apiCall('/user/me');
      console.log('Token validation - user data:', userData);
      this.user = userData;
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Token validation failed:', error);
      await this.logout();
      return false;
    }
  }

  async login(emailOrUsername: string, password: string): Promise<User> {
    try {
      console.log('Login attempt for:', emailOrUsername);
      const response: AuthResponse = await this.apiCall('/auth/login', 'POST', {
        emailOrUsername,
        password
      });

      console.log('Login successful, user:', response.user);
      this.token = response.token;
      this.user = response.user;
      
      await AsyncStorage.setItem('auth_token', this.token);
      this.notifyListeners();
      
      return this.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(fullName: string, email: string, username: string, password: string): Promise<User> {
    try {
      const response: AuthResponse = await this.apiCall('/auth/register', 'POST', {
        fullName,
        email,
        username,
        password
      });

      this.token = response.token;
      this.user = response.user;
      
      await AsyncStorage.setItem('auth_token', this.token);
      this.notifyListeners();
      
      return this.user;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      this.token = null;
      this.user = null;
      await AsyncStorage.removeItem('auth_token');
      this.notifyListeners();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  getCurrentUser(): User | null {
    if (this.user && this.token) {
      return { ...this.user, token: this.token };
    }
    return this.user;
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return this.token !== null && this.user !== null;
  }

  addListener(callback: (user: User | null) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.user));
  }

  // Demo login for testing
  async demoLogin(): Promise<User> {
    try {
      // Try to login with demo account
      try {
        return await this.login('demo@caloria.com', 'demo123');
      } catch (error) {
        // If demo account doesn't exist, create it
        return await this.register('Demo Kullanıcı', 'demo@caloria.com', 'demo', 'demo123');
      }
    } catch (error) {
      console.error('Demo login error:', error);
      throw new Error('Demo hesabı oluşturulamadı');
    }
  }

  // Clear all storage (for debugging)
  async clearAllStorage(): Promise<void> {
    try {
      await AsyncStorage.clear();
      this.token = null;
      this.user = null;
      this.notifyListeners();
      console.log('All storage cleared');
    } catch (error) {
      console.error('Clear storage error:', error);
    }
  }

  // Initialize auth service
  async initializeAuth(): Promise<void> {
    // Auth service already initializes in constructor
    // This method is for compatibility with existing code
    return;
  }
}

export default AuthService.getInstance();

console.log('Auth service initialized'); 