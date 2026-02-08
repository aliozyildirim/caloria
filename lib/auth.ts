import AsyncStorage from '@react-native-async-storage/async-storage';
import config from './config';

// API Configuration
// Use Node.js backend for auth, not Python backend
const API_BASE = config.apiUrl;

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
  private isLoggingOut: boolean = false;

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

    const fullUrl = `${API_BASE}${endpoint}`;
    console.log('🌐 API Call:', { method, url: fullUrl, endpoint });

    try {
      const response = await fetch(fullUrl, options);
      
      // Response'u parse etmeden önce status kontrolü yap
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const result = await response.json();
          errorMessage = result.error || errorMessage;
        } catch (e) {
          // JSON parse edilemezse text olarak al
          const text = await response.text();
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API call error:', error);
      throw error;
    }
  }

  private async validateToken(): Promise<boolean> {
    try {
      console.log('Validating token...');
      if (!this.token) {
        console.log('No token found, skipping validation');
        return false;
      }
      const userData = await this.apiCall('/user/me');
      console.log('Token validation - user data:', userData);
      this.user = userData;
      this.isLoggingOut = false; // Token geçerli, logout flag'ini sıfırla
      this.notifyListeners();
      return true;
    } catch (error: any) {
      console.error('Token validation failed:', error);
      // Token geçersizse sadece temizle, logout çağırma (sonsuz döngü olmasın)
      if (error.message?.includes('Unauthorized') || error.message?.includes('Invalid token') || error.message?.includes('401')) {
        console.log('Token is invalid, clearing from memory');
        this.token = null;
        this.user = null;
      }
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
      this.isLoggingOut = false; // Login başarılı, logout flag'ini sıfırla
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
      console.log('📝 Register attempt:', { fullName, email, username });
      const response: AuthResponse = await this.apiCall('/auth/register', 'POST', {
        fullName,
        email,
        username,
        password
      });

      this.isLoggingOut = false; // Register başarılı, logout flag'ini sıfırla
      this.token = response.token;
      this.user = response.user;
      
      await AsyncStorage.setItem('auth_token', this.token);
      this.notifyListeners();
      
      return this.user;
    } catch (error: any) {
      console.error('❌ Register error:', error.message || error);
      // Daha anlamlı hata mesajı
      if (error.message?.includes('Email veya kullanıcı adı')) {
        throw new Error('Bu email veya kullanıcı adı zaten kullanılıyor');
      } else if (error.message?.includes('Server error')) {
        throw new Error('Sunucu hatası. Lütfen daha sonra tekrar deneyin.');
      }
      throw error;
    }
  }

  async logout(): Promise<void> {
    // Eğer zaten logout işlemi yapılıyorsa, tekrar yapma
    if (this.isLoggingOut) {
      console.log('⏭️ Logout zaten yapılıyor, atlanıyor...');
      return;
    }
    
    try {
      this.isLoggingOut = true;
      this.token = null;
      this.user = null;
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('auth_user'); // Varsa user bilgisini de temizle
      this.notifyListeners();
      console.log('✅ Logout başarılı, token temizlendi');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Logout işlemi tamamlandı, flag'i sıfırla
      setTimeout(() => {
        this.isLoggingOut = false;
      }, 1000); // 1 saniye sonra tekrar logout yapılabilir
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

  async getTokenAsync(): Promise<string | null> {
    // Eğer logout yapılıyorsa null döndür
    if (this.isLoggingOut) {
      return null;
    }
    
    // Eğer memory'de token varsa onu döndür
    if (this.token) {
      return this.token;
    }
    
    // Memory'de yoksa AsyncStorage'dan yükle
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      if (storedToken) {
        this.token = storedToken;
      }
    } catch (error) {
      console.error('Error loading token from storage:', error);
    }
    
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
        return await this.login('ahmet@demo.com', 'demo123');
      } catch (error) {
        // If demo account doesn't exist, try to create it
        console.log('Demo account not found, trying to register...');
        return await this.register('Demo Kullanıcı', 'demo@caloria.com', 'demo', 'demo123');
      }
    } catch (error) {
      console.error('Demo login error:', error);
      throw new Error('Demo hesabı ile giriş yapılamadı. Lütfen internet bağlantınızı kontrol edin.');
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