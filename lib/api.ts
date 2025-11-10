import AuthService from './auth';

const API_BASE_URL = 'http://localhost:3001/api';

export interface Meal {
  id: number;
  user_id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image_uri?: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  created_at: string;
}

export interface Story {
  id: number;
  user_id: number;
  user_name: string;
  user_avatar?: string;
  image_uri?: string;
  description: string;
  calories: number;
  likes: number;
  is_liked: boolean;
  created_at: string;
}

export interface UserProfile {
  id: number;
  user_id: number;
  name: string;
  age: number;
  height: number;
  weight: number;
  gender: 'male' | 'female';
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'lose' | 'maintain' | 'gain';
  target_weight: number;
  daily_calorie_goal: number;
  daily_protein_goal: number;
  daily_carbs_goal: number;
  daily_fat_goal: number;
  created_at: string;
  updated_at: string;
}

export interface DietPlan {
  id: number;
  name: string;
  description: string;
  type: string;
  duration: number;
  daily_calories: number;
  daily_protein: number;
  daily_carbs: number;
  daily_fat: number;
  benefits: string[];
  restrictions: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  disclaimer: string;
  created_at: string;
}

export interface UserDietPlan {
  id: number;
  user_id: number;
  diet_plan_id: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
  created_at: string;
  diet_plan: DietPlan;
}

export interface DietLog {
  id: number;
  user_id: number;
  date: string;
  weight: number;
  mood: number;
  energy: number;
  water: number;
  notes: string;
  exercise: string;
  sleep: number;
  created_at: string;
  updated_at: string;
}

export interface WeightProgress {
  weightEntries: Array<{
    date: string;
    weight: number;
    bmi: number;
  }>;
  adherenceScores: Array<{
    date: string;
    score: number;
  }>;
  totalDays: number;
  completedDays: number;
  averageAdherence: number;
  weightLoss: number;
  startWeight: number;
  currentWeight: number;
  targetWeight: number;
}

export interface Challenge {
  id: number;
  title: string;
  description: string;
  type: string;
  target_days: number;
  xp_reward: number;
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard';
  is_active: boolean;
  created_at: string;
}

export interface UserChallenge {
  id: number;
  user_id: number;
  challenge_id: number;
  start_date: string;
  end_date: string;
  current_progress: number;
  target_progress: number;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  title?: string;
  description?: string;
  type?: string;
  xp_reward?: number;
  icon?: string;
  difficulty?: string;
}

export interface XPInfo {
  totalXP: number;
  level: number;
  nextLevelXP: number;
}

export interface XPTransaction {
  id: number;
  user_id: number;
  amount: number;
  source: 'challenge' | 'meal_log' | 'daily_goal' | 'streak' | 'achievement';
  source_id?: number;
  description: string;
  created_at: string;
}

export interface MealPlan {
  id: number;
  user_id: number;
  diet_plan_id: number;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  planned_food_name: string;
  planned_calories: number;
  planned_protein: number;
  planned_carbs: number;
  planned_fat: number;
  instructions?: string;
  is_completed: boolean;
  actual_calories?: number;
  actual_protein?: number;
  actual_carbs?: number;
  actual_fat?: number;
  notes?: string;
  completed_at?: string;
  created_at: string;
  diet_plan_name?: string;
  diet_type?: string;
}

export interface Reward {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: 'avatar' | 'theme' | 'badge' | 'feature' | 'discount';
  xp_cost: number;
  reward_data: any;
  is_active: boolean;
  is_purchased?: boolean;
  created_at: string;
}

export interface LeaderboardEntry {
  user_id: number;
  username: string;
  full_name: string;
  avatar?: string;
  total_xp: number;
  level: number;
  rank: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
  period: string;
}

export interface RewardsShopResponse {
  rewards: Reward[];
  userXP: number;
  categories: string[];
}

export interface UserReward {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: 'avatar' | 'theme' | 'badge' | 'feature' | 'discount';
  xp_cost: number;
  reward_data: any;
  is_active: boolean;
  is_purchased?: boolean;
  purchased_at?: string;
  created_at: string;
}

// Game Room interfaces
export interface GameRoom {
  id: string;
  room_code: string;
  game_type: 'quiz' | 'guess' | 'math' | 'word';
  game_mode: 'quick' | 'friend' | 'tournament';
  host_user_id: number;
  host_name: string;
  max_players: number;
  current_players: number;
  status: 'waiting' | 'playing' | 'finished';
  players: GamePlayer[];
  created_at: string;
  started_at?: string;
  finished_at?: string;
}

export interface GamePlayer {
  user_id: number;
  player_name: string;
  is_host: boolean;
  is_ready: boolean;
  score: number;
  joined_at: string;
}

export interface GameRoomResponse {
  rooms: GameRoom[];
  totalRooms: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

class ApiService {
  private static async makeRequest(endpoint: string, options: RequestInit = {}) {
    // Token'ı AsyncStorage'dan yükle
    const token = await AuthService.getTokenAsync();
    
    // Public endpoint'ler (auth, stories, diet-plans listesi)
    const publicEndpoints = ['/auth/', '/stories', '/diet-plans'];
    const isPublicEndpoint = publicEndpoints.some(ep => endpoint.includes(ep));
    
    // Token yoksa ve endpoint auth gerektiriyorsa hata döndür
    if (!token && !isPublicEndpoint) {
      // Token yok, auth ekranına yönlendir
      const error = new Error('Authentication required. Please login again.');
      (error as any).status = 401;
      throw error;
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        // Try to get error details from response body
        let errorData = null;
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          // If we can't parse the error response, use the status
          console.log('Could not parse error response:', parseError);
        }
        
        // Eğer token geçersizse, kullanıcıyı logout yap
        if ((response.status === 401 || response.status === 403) && 
            (errorMessage.includes('Invalid token') || 
             errorMessage.includes('invalid signature') || 
             errorMessage.includes('Unauthorized'))) {
          console.log('🔄 Geçersiz token tespit edildi, logout yapılıyor...');
          // Logout işlemini async olarak yap ama beklemeden devam et
          AuthService.logout().catch(err => console.error('Logout error:', err));
          
          // Session expired hatası fırlat
          const sessionError = new Error('Session expired. Please login again.');
          (sessionError as any).status = 401;
          throw sessionError;
        }
        
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).response = { data: errorData || { error: errorMessage } };
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Stories
  static async getStories() {
    return this.makeRequest('/stories');
  }

  static async createStory(data: { imageUri?: string; description: string; calories: number }) {
    return this.makeRequest('/stories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async likeStory(storyId: number) {
    return this.makeRequest(`/stories/${storyId}/like`, {
      method: 'POST',
    });
  }

  // User Profile - Using Python backend (port 5001) because auth is there
  static async getUserProfile() {
    const token = await AuthService.getTokenAsync();

    const response = await fetch('http://localhost:5001/api/user/profile', {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to get profile' }));
      throw new Error(errorData.error || 'Failed to get profile');
    }

    return await response.json();
  }

  static async updateUserProfile(data: any) {
    const token = await AuthService.getTokenAsync();

    const response = await fetch('http://localhost:5001/api/user/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to update profile' }));
      throw new Error(errorData.error || 'Failed to update profile');
    }

    return await response.json();
  }

  // Meals
  static async getMeals(date?: string) {
    const params = date ? `?date=${date}` : '';
    return this.makeRequest(`/meals${params}`);
  }

  static async createMeal(data: any) {
    return this.makeRequest('/meals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateMeal(id: number, data: any) {
    return this.makeRequest(`/meals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteMeal(id: number) {
    return this.makeRequest(`/meals/${id}`, {
      method: 'DELETE',
    });
  }

  // Diet Plans
  static async getActiveDietPlan() {
    const response = await this.makeRequest('/diet-plans/active');
    return response;
  }

  static async getDietPlans() {
    return this.makeRequest('/diet-plans');
  }

  static async activateDietPlan(planId: number) {
    return this.makeRequest(`/diet-plans/${planId}/activate`, {
      method: 'POST',
    });
  }

  // Favorites
  static async getFavorites() {
    return this.makeRequest('/favorites');
  }

  static async addToFavorites(data: any) {
    return this.makeRequest('/favorites', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async removeFromFavorites(id: number) {
    return this.makeRequest(`/favorites/${id}`, {
      method: 'DELETE',
    });
  }

  // Statistics
  static async getStats(period: 'week' | 'month' | 'year' = 'week') {
    return this.makeRequest(`/stats?period=${period}`);
  }

  // Admin
  static async getUsers() {
    return this.makeRequest('/admin/users');
  }

  static async getAdminStats() {
    return this.makeRequest('/admin/stats');
  }

  // Create demo data
  static async createDemoData() {
    const response = await this.makeRequest('/admin/create-demo-data', {
      method: 'POST',
    });
    return response;
  }

  // Diet Logs
  static async saveDietLog(data: {
    date: string;
    weight: number;
    mood: number;
    energy: number;
    water: number;
    notes: string;
    exercise: string;
    sleep: number;
  }) {
    return this.makeRequest('/diet-log', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async getDietLog(date: string): Promise<DietLog | null> {
    return this.makeRequest(`/diet-log/${date}`);
  }

  static async getDietLogs(startDate?: string, endDate?: string, limit: number = 30): Promise<DietLog[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    params.append('limit', limit.toString());
    
    return this.makeRequest(`/diet-logs?${params.toString()}`);
  }

  static async getWeightProgress(period: 'week' | 'month' | 'all' = 'month'): Promise<WeightProgress> {
    const params = `?period=${period}`;
    return this.makeRequest(`/weight-progress${params}`);
  }

  // Challenges
  static async getChallenges(): Promise<Challenge[]> {
    return this.makeRequest('/challenges');
  }

  static async getRandomChallenge(): Promise<Challenge> {
    return this.makeRequest('/challenges/random');
  }

  static async acceptChallenge(challengeId: number) {
    return this.makeRequest(`/challenges/${challengeId}/accept`, {
      method: 'POST',
    });
  }

  static async updateChallengeProgress(userChallengeId: number, increment: number = 1) {
    return this.makeRequest(`/user-challenges/${userChallengeId}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ increment }),
    });
  }

  static async getActiveChallenge(): Promise<UserChallenge | null> {
    return this.makeRequest('/user/active-challenge');
  }

  static async getUserXP(): Promise<XPInfo> {
    return this.makeRequest('/user/xp');
  }

  static async getXPHistory(limit: number = 10): Promise<XPTransaction[]> {
    const params = new URLSearchParams({ limit: limit.toString() });
    return this.makeRequest(`/user/xp-history?${params}`);
  }

  // Meal Plans
  static async getMealPlans(period?: string, weekOffset?: number): Promise<MealPlan[]> {
    try {
      const token = await AuthService.getTokenAsync();
      if (!token) throw new Error('No auth token');

      let url = `${API_BASE_URL}/meal-plans`;
      const params = new URLSearchParams();
      
      if (period === 'week') {
        params.append('week', 'true');
        if (weekOffset !== undefined) {
          params.append('weekOffset', weekOffset.toString());
        }
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get meal plans error:', error);
      throw error;
    }
  }

  static async generateMealPlans() {
    return this.makeRequest('/meal-plans/generate', {
      method: 'POST',
    });
  }

  static async completeMealPlan(id: number, data: {
    actualCalories?: number;
    actualProtein?: number;
    actualCarbs?: number;
    actualFat?: number;
    notes?: string;
  }) {
    return this.makeRequest(`/meal-plans/${id}/complete`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Water Tracking APIs
  static async getTodayWaterIntake() {
    return this.makeRequest('/water/today');
  }

  static async updateWaterIntake(glassesCount: number) {
    return this.makeRequest('/water/intake', {
      method: 'POST',
      body: JSON.stringify({ glasses_count: glassesCount })
    });
  }

  static async getWaterSettings() {
    return this.makeRequest('/water/settings');
  }

  static async updateWaterSettings(settings: {
    notifications_enabled: boolean;
    reminder_hours: number[];
    daily_goal: number;
  }) {
    return this.makeRequest('/water/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }

  static async getWaterHistory(days: number = 7) {
    const response = await this.makeRequest(`/water/history?days=${days}`);
    return response;
  }

  // ===============================
  // NOTIFICATION METHODS
  // ===============================

  static async registerPushToken(token: string) {
    const response = await fetch(`${API_BASE_URL}/notifications/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await AuthService.getTokenAsync()}`
      },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      throw new Error('Failed to register push token');
    }

    return response.json();
  }

  static async getPushTokens() {
    const response = await this.makeRequest('/notifications/tokens');
    return response;
  }

  static async getNotificationSettings() {
    const response = await fetch(`${API_BASE_URL}/notifications/settings`, {
      headers: {
        'Authorization': `Bearer ${await AuthService.getTokenAsync()}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get notification settings');
    }

    return response.json();
  }

  static async updateNotificationSettings(settings: any) {
    const response = await fetch(`${API_BASE_URL}/notifications/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await AuthService.getTokenAsync()}`
      },
      body: JSON.stringify(settings)
    });

    if (!response.ok) {
      throw new Error('Failed to update notification settings');
    }

    return response.json();
  }

  static async sendTestNotification(title?: string, body?: string) {
    const response = await this.makeRequest('/notifications/send-test', {
      method: 'POST',
      body: JSON.stringify({ title, body })
    });
    return response;
  }

  static async getNotificationHistory(limit: number = 50) {
    const response = await this.makeRequest(`/notifications/history?limit=${limit}`);
    return response;
  }

  static async deactivatePushToken(token: string) {
    const response = await this.makeRequest('/notifications/deactivate-token', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
    return response;
  }

  // ===============================
  // XP REWARDS & LEADERBOARD METHODS
  // ===============================

  static async getLeaderboard(period: 'all_time' | 'weekly' | 'monthly' = 'all_time', limit: number = 50): Promise<LeaderboardResponse> {
    const params = new URLSearchParams({ period, limit: limit.toString() });
    return this.makeRequest(`/leaderboard?${params}`);
  }

  static async getRewardsShop(): Promise<RewardsShopResponse> {
    return this.makeRequest('/rewards-shop');
  }

  static async purchaseReward(rewardId: number): Promise<{ message: string; reward: Reward; xpSpent: number }> {
    return this.makeRequest(`/rewards/${rewardId}/purchase`, {
      method: 'POST'
    });
  }

  static async getUserRewards(): Promise<UserReward[]> {
    return this.makeRequest('/user/rewards');
  }

  static async claimDailyBonus() {
    return this.makeRequest('/user/daily-bonus', {
      method: 'POST'
    });
  }

  static async getActiveUserTheme(): Promise<any> {
    return this.makeRequest('/user/active-theme');
  }

  static async getActiveUserFeatures(): Promise<any[]> {
    return this.makeRequest('/user/active-features');
  }

  static async unlockFeature(featureId: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest('/user/features/unlock', {
      method: 'POST',
      body: JSON.stringify({ featureId })
    });
  }

  static async activateReward(rewardId: number): Promise<{ message: string }> {
    return this.makeRequest(`/user/rewards/${rewardId}/activate`, {
      method: 'POST'
    });
  }

  static async deactivateAllThemes(): Promise<{ message: string }> {
    const response = await this.makeRequest('/user/themes/deactivate-all', {
      method: 'POST'
    });
    return response;
  }

  // Simple theme setting (not reward-based)
  static async setUserTheme(theme: 'light' | 'dark'): Promise<{ message: string; theme: string }> {
    const response = await this.makeRequest('/user/theme', {
      method: 'POST',
      body: JSON.stringify({ theme })
    });
    return response;
  }

  static async getUserTheme(): Promise<{ theme: string; name: string }> {
    const response = await this.makeRequest('/user/theme');
    return response;
  }

  // Nutrition Expert methods
  static async getDailyNutritionAdvice() {
    const response = await fetch(`${API_BASE_URL}/nutrition/daily-advice`, {
      headers: {
        'Authorization': `Bearer ${await AuthService.getTokenAsync()}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get daily nutrition advice');
    }

    return response.json();
  }

  static async getWeeklyNutritionPlan() {
    const response = await fetch(`${API_BASE_URL}/nutrition/weekly-plan`, {
      headers: {
        'Authorization': `Bearer ${await AuthService.getTokenAsync()}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get weekly nutrition plan');
    }

    return response.json();
  }

  static async getNutritionAnalysis(days: number = 7) {
    const response = await fetch(`${API_BASE_URL}/nutrition/analysis?days=${days}`, {
      headers: {
        'Authorization': `Bearer ${await AuthService.getTokenAsync()}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get nutrition analysis');
    }

    return response.json();
  }

  static async createCustomNutritionPlan(preferences: any, restrictions: string[], goal: string) {
    const response = await fetch(`${API_BASE_URL}/nutrition/custom-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await AuthService.getTokenAsync()}`
      },
      body: JSON.stringify({ preferences, restrictions, goal })
    });

    if (!response.ok) {
      throw new Error('Failed to create custom nutrition plan');
    }

    return response.json();
  }

  static async checkNutritionistAccess(): Promise<{ hasAccess: boolean }> {
    return this.makeRequest('/user/features/check-nutritionist');
  }

  // Game Room API methods
  static async getGameRooms(gameType?: string): Promise<GameRoomResponse> {
    const params = gameType ? `?game_type=${gameType}` : '';
    return this.makeRequest(`/game-rooms${params}`);
  }

  static async createGameRoom(data: {
    game_type: 'quiz' | 'guess' | 'math' | 'word';
    game_mode: 'quick' | 'friend' | 'tournament';
    player_name: string;
    max_players?: number;
  }): Promise<GameRoom> {
    return this.makeRequest('/game-rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async joinGameRoom(roomCode: string, playerName: string): Promise<GameRoom> {
    return this.makeRequest('/game-rooms/join', {
      method: 'POST',
      body: JSON.stringify({ room_code: roomCode, player_name: playerName }),
    });
  }

  static async leaveGameRoom(roomCode: string): Promise<{ message: string }> {
    return this.makeRequest('/game-rooms/leave', {
      method: 'POST',
      body: JSON.stringify({ room_code: roomCode }),
    });
  }

  static async startGame(roomCode: string): Promise<{ message: string; game_data: any }> {
    return this.makeRequest('/game-rooms/start', {
      method: 'POST',
      body: JSON.stringify({ room_code: roomCode }),
    });
  }

  static async submitGameScore(roomCode: string, score: number): Promise<{ message: string; final_results?: any }> {
    return this.makeRequest('/game-rooms/score', {
      method: 'POST',
      body: JSON.stringify({ room_code: roomCode, score }),
    });
  }

  static async getGameRoom(roomCode: string): Promise<GameRoom> {
    return this.makeRequest(`/game-rooms/${roomCode}`);
  }

  static async setPlayerReady(roomCode: string, isReady: boolean): Promise<{
    message: string;
    all_ready: boolean;
    ready_count: number;
    total_count: number;
  }> {
    return this.makeRequest('/game-rooms/ready', {
      method: 'POST',
      body: JSON.stringify({ room_code: roomCode, is_ready: isReady }),
    });
  }

  static async chatWithNutritionist(messages: Message[]) {
    const response = await fetch(`${API_BASE_URL}/chat/nutritionist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await AuthService.getTokenAsync()}`
      },
      body: JSON.stringify({ messages })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Chat request failed');
    }

    return response.json();
  }

  // ===============================
}

export default ApiService; 