// Caloria Web App JavaScript
class CaloriaApp {
    constructor() {
        this.API_BASE = window.location.origin + '/api';
        this.token = localStorage.getItem('token');
        this.currentUser = null;
        this.currentPage = 'dashboard';
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        
        // Show loading screen
        this.showLoading();
        
        // Check authentication
        await this.checkAuth();
        
        // Hide loading screen after 1 second
        setTimeout(() => {
            this.hideLoading();
        }, 1000);
    }

    setupEventListeners() {
        // Auth form listeners
        document.getElementById('loginFormElement')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerFormElement')?.addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('demoLogin')?.addEventListener('click', () => this.handleDemoLogin());
        
        // Auth tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchAuthTab(e.target.dataset.tab));
        });
        
        // Password toggle
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', (e) => this.togglePassword(e));
        });
        
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchPage(e.target.closest('.nav-btn').dataset.page));
        });
        
        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.handleLogout());
        
        // Profile form
        document.getElementById('profileForm')?.addEventListener('submit', (e) => this.handleProfileSave(e));
        
        // Add meal/story buttons
        document.getElementById('addMealBtn')?.addEventListener('click', () => this.showAddMealModal());
        document.getElementById('addStoryBtn')?.addEventListener('click', () => this.showAddStoryModal());
        
        // Modal listeners
        this.setupModalListeners();
        
        // Admin refresh
        document.getElementById('refreshStats')?.addEventListener('click', () => this.loadAdminStats());
        
        // Admin tabs
        document.querySelectorAll('.admin-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchAdminTab(e.target.dataset.tab));
        });
        
        // Filters
        document.getElementById('mealDateFilter')?.addEventListener('change', () => this.loadMeals());
        document.getElementById('mealTypeFilter')?.addEventListener('change', () => this.loadMeals());
    }

    setupModalListeners() {
        // Modal close buttons
        document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
            btn.addEventListener('click', () => this.hideModals());
        });
        
        // Modal background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideModals();
            });
        });
        
        // Add meal form
        document.getElementById('addMealForm')?.addEventListener('submit', (e) => this.handleAddMeal(e));
        
        // Add story form
        document.getElementById('addStoryForm')?.addEventListener('submit', (e) => this.handleAddStory(e));
    }

    // Authentication Methods
    async checkAuth() {
        if (!this.token) {
            this.showAuthScreen();
            return;
        }

        try {
            const response = await this.apiCall('/user/me', 'GET');
            if (response.error) {
                throw new Error(response.error);
            }
            
            this.currentUser = response;
            this.showMainApp();
            await this.loadUserProfile();
            await this.loadDashboardData();
            
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
            this.token = null;
            this.showAuthScreen();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const emailOrUsername = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const response = await this.apiCall('/auth/login', 'POST', {
                emailOrUsername,
                password
            });
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            this.token = response.token;
            localStorage.setItem('token', this.token);
            this.currentUser = response.user;
            
            this.showToast('Giriş başarılı! Hoş geldin ' + response.user.fullName, 'success');
            this.showMainApp();
            await this.loadUserProfile();
            await this.loadDashboardData();
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const fullName = document.getElementById('registerFullName').value;
        const email = document.getElementById('registerEmail').value;
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;
        
        try {
            const response = await this.apiCall('/auth/register', 'POST', {
                fullName,
                email,
                username,
                password
            });
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            this.token = response.token;
            localStorage.setItem('token', this.token);
            this.currentUser = response.user;
            
            this.showToast('Kayıt başarılı! Hoş geldin ' + response.user.fullName, 'success');
            this.showMainApp();
            await this.loadDashboardData();
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async handleDemoLogin() {
        try {
            const response = await this.apiCall('/auth/login', 'POST', {
                emailOrUsername: 'demo@caloria.com',
                password: 'demo123'
            });
            
            if (response.error) {
                // Create demo user if doesn't exist
                const registerResponse = await this.apiCall('/auth/register', 'POST', {
                    fullName: 'Demo Kullanıcı',
                    email: 'demo@caloria.com',
                    username: 'demo',
                    password: 'demo123'
                });
                
                if (registerResponse.error) {
                    throw new Error('Demo hesabı oluşturulamadı');
                }
                
                this.token = registerResponse.token;
                this.currentUser = registerResponse.user;
            } else {
                this.token = response.token;
                this.currentUser = response.user;
            }
            
            localStorage.setItem('token', this.token);
            this.showToast('Demo hesabı ile giriş yapıldı', 'success');
            this.showMainApp();
            await this.loadUserProfile();
            await this.loadDashboardData();
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    handleLogout() {
        localStorage.removeItem('token');
        this.token = null;
        this.currentUser = null;
        this.showAuthScreen();
        this.showToast('Başarıyla çıkış yapıldı', 'success');
    }

    // UI Methods
    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
    }

    showAuthScreen() {
        document.getElementById('authScreen').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        
        // Update user info in header
        if (this.currentUser) {
            document.getElementById('userName').textContent = this.currentUser.fullName || this.currentUser.username;
            if (this.currentUser.avatar) {
                document.getElementById('userAvatar').src = this.currentUser.avatar;
            }
        }
    }

    switchAuthTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        // Update forms
        document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
        document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
    }

    togglePassword(e) {
        const input = e.target.parentElement.querySelector('input');
        const icon = e.target.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }

    switchPage(page) {
        this.currentPage = page;
        
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === page);
        });
        
        // Update pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.toggle('active', p.id === page + 'Page');
        });
        
        // Load page data
        this.loadPageData(page);
    }

    async loadPageData(page) {
        switch (page) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'meals':
                await this.loadMeals();
                break;
            case 'stories':
                await this.loadStories();
                break;
            case 'profile':
                await this.loadUserProfile();
                break;
            case 'admin':
                await this.loadAdminStats();
                break;
        }
    }

    // Dashboard Methods
    async loadDashboardData() {
        try {
            // Load today's meals
            const today = new Date().toISOString().split('T')[0];
            const meals = await this.apiCall(`/meals?date=${today}`, 'GET');
            
            if (!meals.error) {
                this.updateDashboardStats(meals);
                this.renderRecentMeals(meals.slice(0, 5));
            }
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    updateDashboardStats(meals) {
        const totalCalories = meals.reduce((sum, meal) => sum + parseFloat(meal.calories), 0);
        const mealCount = meals.length;
        
        document.getElementById('todayCalories').textContent = Math.round(totalCalories);
        document.getElementById('todayMeals').textContent = mealCount;
        
        // Mock data for other stats
        document.getElementById('weeklyAvg').textContent = Math.round(totalCalories * 0.8);
        document.getElementById('currentStreak').textContent = Math.floor(Math.random() * 7) + 1;
    }

    renderRecentMeals(meals) {
        const container = document.getElementById('recentMealsList');
        
        if (meals.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: var(--text-muted); padding: 20px;">Henüz yemek eklenmemiş</p>';
            return;
        }
        
        container.innerHTML = meals.map(meal => `
            <div class="meal-card">
                <div class="meal-header">
                    <span class="meal-name">${meal.name}</span>
                    <span class="meal-type">${this.getMealTypeText(meal.meal_type)}</span>
                </div>
                <div class="meal-nutrition">
                    <span>${Math.round(meal.calories)} kcal</span>
                    <span>${Math.round(meal.protein)}g protein</span>
                    <span>${Math.round(meal.carbs)}g karb</span>
                    <span>${Math.round(meal.fat)}g yağ</span>
                </div>
                <div class="meal-time">${this.formatTime(meal.created_at)}</div>
            </div>
        `).join('');
    }

    // Meals Methods
    async loadMeals() {
        try {
            const date = document.getElementById('mealDateFilter')?.value || '';
            const type = document.getElementById('mealTypeFilter')?.value || '';
            
            let url = '/meals?limit=50';
            if (date) url += `&date=${date}`;
            
            const meals = await this.apiCall(url, 'GET');
            
            if (!meals.error) {
                let filteredMeals = meals;
                if (type) {
                    filteredMeals = meals.filter(meal => meal.meal_type === type);
                }
                this.renderMeals(filteredMeals);
            }
            
        } catch (error) {
            console.error('Failed to load meals:', error);
        }
    }

    renderMeals(meals) {
        const container = document.getElementById('mealsContainer');
        
        if (meals.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: var(--text-muted); padding: 40px;">Yemek bulunamadı</p>';
            return;
        }
        
        container.innerHTML = meals.map(meal => `
            <div class="meal-card">
                <div class="meal-header">
                    <span class="meal-name">${meal.name}</span>
                    <span class="meal-type">${this.getMealTypeText(meal.meal_type)}</span>
                </div>
                <div class="meal-nutrition">
                    <span><strong>${Math.round(meal.calories)} kcal</strong></span>
                    <span>Protein: ${Math.round(meal.protein)}g</span>
                    <span>Karb: ${Math.round(meal.carbs)}g</span>
                    <span>Yağ: ${Math.round(meal.fat)}g</span>
                </div>
                <div class="meal-time">${this.formatDateTime(meal.created_at)}</div>
            </div>
        `).join('');
    }

    // Stories Methods
    async loadStories() {
        try {
            const stories = await this.apiCall('/stories', 'GET');
            
            if (!stories.error) {
                this.renderStories(stories);
            }
            
        } catch (error) {
            console.error('Failed to load stories:', error);
        }
    }

    renderStories(stories) {
        const container = document.getElementById('storiesContainer');
        
        if (stories.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: var(--text-muted); padding: 40px;">Henüz hikaye yok</p>';
            return;
        }
        
        container.innerHTML = stories.map(story => `
            <div class="story-card">
                ${story.image_uri ? `<img src="${story.image_uri}" alt="Story" class="story-image" onerror="this.style.display='none'">` : ''}
                <div class="story-content">
                    <div class="story-header">
                        <img src="${story.user_avatar || 'https://via.placeholder.com/40'}" alt="User" class="story-avatar">
                        <div>
                            <div class="story-user">${story.user_name}</div>
                            <div class="story-time">${this.formatTimeAgo(story.created_at)}</div>
                        </div>
                    </div>
                    <div class="story-description">${story.description}</div>
                    <div class="story-actions">
                        <div class="story-likes">
                            <i class="fas fa-heart ${story.is_liked ? 'text-red-500' : ''}"></i>
                            <span>${story.likes} beğeni</span>
                        </div>
                        <div class="story-calories">${story.calories} kcal</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Profile Methods
    async loadUserProfile() {
        try {
            const profile = await this.apiCall('/user/profile', 'GET');
            
            if (profile && !profile.error) {
                this.renderProfile(profile);
            }
            
        } catch (error) {
            console.error('Failed to load profile:', error);
        }
    }

    renderProfile(profile) {
        // Update profile display
        document.getElementById('profileName').textContent = profile.name || this.currentUser.fullName;
        document.getElementById('profileEmail').textContent = this.currentUser.email;
        
        // Calculate BMI
        const bmi = profile.weight / ((profile.height / 100) ** 2);
        document.getElementById('profileBMI').textContent = bmi.toFixed(1);
        document.getElementById('profileTargetWeight').textContent = profile.target_weight + ' kg';
        document.getElementById('profileDailyGoal').textContent = profile.daily_calorie_goal + ' kcal';
        
        // Fill form
        document.getElementById('profileFormName').value = profile.name || '';
        document.getElementById('profileFormAge').value = profile.age || '';
        document.getElementById('profileFormHeight').value = profile.height || '';
        document.getElementById('profileFormWeight').value = profile.weight || '';
        document.getElementById('profileFormGender').value = profile.gender || '';
        document.getElementById('profileFormTargetWeight').value = profile.target_weight || '';
        document.getElementById('profileFormActivityLevel').value = profile.activity_level || '';
        document.getElementById('profileFormGoal').value = profile.goal || '';
    }

    async handleProfileSave(e) {
        e.preventDefault();
        
        const profileData = {
            name: document.getElementById('profileFormName').value,
            age: parseInt(document.getElementById('profileFormAge').value),
            height: parseFloat(document.getElementById('profileFormHeight').value),
            weight: parseFloat(document.getElementById('profileFormWeight').value),
            gender: document.getElementById('profileFormGender').value,
            targetWeight: parseFloat(document.getElementById('profileFormTargetWeight').value),
            activityLevel: document.getElementById('profileFormActivityLevel').value,
            goal: document.getElementById('profileFormGoal').value
        };
        
        // Calculate nutrition goals (simplified)
        const bmr = this.calculateBMR(profileData);
        const tdee = this.calculateTDEE(bmr, profileData.activityLevel);
        const calorieGoal = this.adjustCaloriesForGoal(tdee, profileData.goal);
        
        profileData.dailyCalorieGoal = Math.round(calorieGoal);
        profileData.dailyProteinGoal = Math.round(calorieGoal * 0.25 / 4);
        profileData.dailyCarbsGoal = Math.round(calorieGoal * 0.45 / 4);
        profileData.dailyFatGoal = Math.round(calorieGoal * 0.30 / 9);
        
        try {
            const response = await this.apiCall('/user/profile', 'POST', profileData);
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            this.showToast('Profil başarıyla kaydedildi', 'success');
            await this.loadUserProfile();
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // Admin Methods
    async loadAdminStats() {
        try {
            const [stats, users, meals, stories] = await Promise.all([
                this.apiCall('/admin/stats', 'GET'),
                this.apiCall('/admin/users', 'GET'),
                this.apiCall('/admin/meals', 'GET'),
                this.apiCall('/admin/stories', 'GET')
            ]);
            
            if (!stats.error) {
                document.getElementById('totalUsers').textContent = stats.users;
                document.getElementById('totalMeals').textContent = stats.meals;
                document.getElementById('totalStories').textContent = stats.stories;
                document.getElementById('totalFavorites').textContent = stats.favorites;
            }
            
            if (!users.error) this.renderAdminUsers(users);
            if (!meals.error) this.renderAdminMeals(meals);
            if (!stories.error) this.renderAdminStories(stories);
            
        } catch (error) {
            console.error('Failed to load admin stats:', error);
        }
    }

    switchAdminTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.admin-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        // Update tab content
        document.querySelectorAll('.admin-tab-content').forEach(content => {
            content.classList.toggle('hidden', !content.id.includes(tab));
        });
    }

    renderAdminUsers(users) {
        const container = document.getElementById('usersTable');
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Ad Soyad</th>
                        <th>Email</th>
                        <th>Kullanıcı Adı</th>
                        <th>Kayıt Tarihi</th>
                        <th>Son Giriş</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.id}</td>
                            <td>${user.full_name}</td>
                            <td>${user.email}</td>
                            <td>${user.username}</td>
                            <td>${this.formatDate(user.created_at)}</td>
                            <td>${user.last_login_at ? this.formatDate(user.last_login_at) : 'Hiç'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderAdminMeals(meals) {
        const container = document.getElementById('mealsTable');
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Kullanıcı</th>
                        <th>Yemek</th>
                        <th>Kalori</th>
                        <th>Öğün</th>
                        <th>Tarih</th>
                    </tr>
                </thead>
                <tbody>
                    ${meals.map(meal => `
                        <tr>
                            <td>${meal.id}</td>
                            <td>${meal.full_name}</td>
                            <td>${meal.name}</td>
                            <td>${Math.round(meal.calories)} kcal</td>
                            <td>${this.getMealTypeText(meal.meal_type)}</td>
                            <td>${this.formatDate(meal.created_at)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderAdminStories(stories) {
        const container = document.getElementById('storiesTable');
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Kullanıcı</th>
                        <th>Açıklama</th>
                        <th>Kalori</th>
                        <th>Beğeni</th>
                        <th>Tarih</th>
                    </tr>
                </thead>
                <tbody>
                    ${stories.map(story => `
                        <tr>
                            <td>${story.id}</td>
                            <td>${story.user_name}</td>
                            <td>${story.description.substring(0, 50)}...</td>
                            <td>${story.calories} kcal</td>
                            <td>${story.likes}</td>
                            <td>${this.formatDate(story.created_at)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // Modal Methods
    showAddMealModal(mealType = 'breakfast') {
        document.getElementById('mealType').value = mealType;
        document.getElementById('addMealModal').classList.add('show');
    }

    showAddStoryModal() {
        document.getElementById('addStoryModal').classList.add('show');
    }

    hideModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
    }

    async handleAddMeal(e) {
        e.preventDefault();
        
        const mealData = {
            name: document.getElementById('mealName').value,
            calories: parseFloat(document.getElementById('mealCalories').value),
            protein: parseFloat(document.getElementById('mealProtein').value),
            carbs: parseFloat(document.getElementById('mealCarbs').value),
            fat: parseFloat(document.getElementById('mealFat').value),
            mealType: document.getElementById('mealType').value,
            imageUri: null
        };
        
        try {
            const response = await this.apiCall('/meals', 'POST', mealData);
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            this.showToast('Yemek başarıyla eklendi', 'success');
            this.hideModals();
            document.getElementById('addMealForm').reset();
            
            // Refresh current page data
            if (this.currentPage === 'dashboard') {
                await this.loadDashboardData();
            } else if (this.currentPage === 'meals') {
                await this.loadMeals();
            }
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async handleAddStory(e) {
        e.preventDefault();
        
        const storyData = {
            description: document.getElementById('storyDescription').value,
            calories: parseInt(document.getElementById('storyCalories').value),
            imageUri: document.getElementById('storyImageUri').value || null
        };
        
        try {
            const response = await this.apiCall('/stories', 'POST', storyData);
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            this.showToast('Hikaye başarıyla paylaşıldı', 'success');
            this.hideModals();
            document.getElementById('addStoryForm').reset();
            
            // Refresh stories if on stories page
            if (this.currentPage === 'stories') {
                await this.loadStories();
            }
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // Utility Methods
    async apiCall(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (this.token) {
            options.headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(this.API_BASE + endpoint, options);
            return await response.json();
        } catch (error) {
            console.error('API call failed:', error);
            return { error: 'Bağlantı hatası' };
        }
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    getMealTypeText(type) {
        const types = {
            breakfast: 'Kahvaltı',
            lunch: 'Öğle',
            dinner: 'Akşam',
            snack: 'Atıştırmalık'
        };
        return types[type] || type;
    }

    formatTime(dateString) {
        return new Date(dateString).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('tr-TR');
    }

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString('tr-TR');
    }

    formatTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Az önce';
        if (diffInSeconds < 3600) return Math.floor(diffInSeconds / 60) + ' dakika önce';
        if (diffInSeconds < 86400) return Math.floor(diffInSeconds / 3600) + ' saat önce';
        return Math.floor(diffInSeconds / 86400) + ' gün önce';
    }

    calculateBMR(profile) {
        // Mifflin-St Jeor Equation
        if (profile.gender === 'male') {
            return 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
        } else {
            return 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
        }
    }

    calculateTDEE(bmr, activityLevel) {
        const multipliers = {
            sedentary: 1.2,
            light: 1.375,
            moderate: 1.55,
            active: 1.725,
            very_active: 1.9
        };
        return bmr * (multipliers[activityLevel] || 1.2);
    }

    adjustCaloriesForGoal(tdee, goal) {
        switch (goal) {
            case 'lose': return tdee - 500;
            case 'gain': return tdee + 500;
            default: return tdee;
        }
    }
}

// Global functions for inline event handlers
function addMeal(type) {
    window.app.showAddMealModal(type);
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CaloriaApp();
}); 