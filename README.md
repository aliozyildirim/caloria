# 🍽️ Caloria - AI-Powered Calorie Tracking App

Caloria is a modern React Native mobile application that uses AI to analyze food photos and track nutritional information. Simply snap a photo of your meal, and Caloria will provide detailed calorie and macronutrient analysis.

## ✨ Features

### 📸 **Smart Food Recognition**
- Take photos of your meals using the built-in camera
- Upload images from your photo gallery
- AI-powered food identification and analysis
- Confidence scoring for accuracy

### 📊 **Detailed Nutrition Analysis**
- Comprehensive calorie calculation
- Macronutrient breakdown (Protein, Carbs, Fat)
- Portion size estimation
- Editable results for manual corrections

### 🏠 **Dashboard Overview**
- Daily calorie consumption tracking
- Progress towards nutrition goals
- Quick action buttons for photo capture
- Nutrition summary cards

### 📈 **History & Tracking**
- View meal history by date
- Daily nutrition summaries
- Calendar navigation
- Meal statistics and trends

### 👤 **Profile & Settings**
- Customizable daily calorie goals
- Nutrition target settings
- App preferences and notifications
- Weekly statistics overview

## 🛠️ Technology Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **Database**: SQLite (local storage)
- **UI Components**: React Native Paper + Custom Components
- **Camera**: Expo Camera
- **Image Processing**: Expo Image Picker
- **Charts**: React Native SVG for progress indicators
- **Styling**: StyleSheet with modern design patterns

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or later)
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator (for testing)
- Physical device with Expo Go app

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Caloria
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on device/emulator**
   ```bash
   # For iOS
   npm run ios
   
   # For Android
   npm run android
   
   # For web (development)
   npm run web
   ```

## 📱 App Structure

```
Caloria/
├── app/                    # App screens and navigation
│   ├── (tabs)/            # Tab-based screens
│   │   ├── index.tsx      # Home/Dashboard
│   │   ├── camera.tsx     # Camera screen
│   │   ├── history.tsx    # Meal history
│   │   └── profile.tsx    # User profile
│   ├── analysis.tsx       # Food analysis results
│   └── _layout.tsx        # Root layout
├── components/            # Reusable UI components
│   ├── CircularProgress.tsx
│   ├── NutritionCard.tsx
│   └── RecentMealCard.tsx
├── lib/                   # Utilities and services
│   ├── database.ts        # SQLite database functions
│   └── foodAnalysis.ts    # Food recognition logic
└── assets/               # Images and static files
```

## 🎯 Key Features Walkthrough

### 1. Home Dashboard
- Real-time calorie tracking with circular progress indicator
- Quick access to camera for food scanning
- Recent meals display
- Daily nutrition overview with color-coded macronutrients

### 2. Food Scanner
- Intuitive camera interface with focus frame
- Gallery import option
- Real-time analysis with loading states
- Confidence percentage display

### 3. Analysis Results
- Large food image display
- Editable nutrition information
- Save or discard options
- Professional, clean design

### 4. History Tracking
- Date-based meal browsing
- Daily nutrition summaries
- Calendar navigation with date picker
- Comprehensive meal cards with all nutrition info

### 5. Profile Management
- Goal setting for calories and macronutrients
- App preferences and settings
- Weekly statistics
- About and support information

## 🔧 Configuration

### Food Analysis
The app currently uses a mock food analysis system for demonstration. In production, you can integrate with:

- **Google Vision API** + Custom ML model
- **Clarifai Food Model**
- **Custom TensorFlow Lite model**
- **OpenAI Vision API**

Update the `lib/foodAnalysis.ts` file to integrate with your preferred service.

### Database
The app uses SQLite for local data storage. The database schema includes:
- Meals table with nutrition information
- Image URI storage for meal photos
- Timestamp tracking for history

## 🎨 Design System

### Colors
- **Primary Green**: #4CAF50 (main brand color)
- **Secondary Colors**: 
  - Protein: #FF6B6B (red)
  - Carbs: #42A5F5 (blue)
  - Fat: #FFA726 (orange)
- **Background**: #f8f9fa (light gray)
- **Cards**: #ffffff (white)

### Typography
- **Headings**: Bold, 24-28px
- **Body**: Regular, 16px
- **Captions**: 12-14px
- **Font**: System default (San Francisco on iOS, Roboto on Android)

### Components
- **Cards**: Rounded corners (12px), subtle shadows
- **Buttons**: Gradient backgrounds, rounded edges
- **Progress**: Circular indicators with smooth animations
- **Navigation**: Bottom tabs with icons

## 📊 Mock Data

The app includes realistic mock data for demonstration:
- 8 different food types with varying nutritional profiles
- Randomized analysis results for realistic feel
- Sample meal history and statistics

## 🔐 Privacy & Security

- All data stored locally on device
- No personal information transmitted to external servers
- Photos processed locally (in mock implementation)
- Privacy-first approach to nutrition tracking

## 🚀 Future Enhancements

- [ ] Real AI food recognition integration
- [ ] Barcode scanning for packaged foods
- [ ] Recipe builder and meal planning
- [ ] Social features and meal sharing
- [ ] Integration with fitness trackers
- [ ] Export data functionality
- [ ] Multi-language support
- [ ] Dark mode theme

## 📱 Screenshots

The app features a modern, clean design with:
- **Vibrant green theme** reflecting health and nutrition
- **Card-based layouts** for easy information consumption
- **Smooth animations** and transitions
- **Intuitive navigation** with clear visual hierarchy
- **Professional photography-style** food image displays

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support, feature requests, or questions:
- Email: support@caloria.app
- Create an issue in this repository

---

**Caloria** - Making nutrition tracking simple, accurate, and beautiful! 🌟 