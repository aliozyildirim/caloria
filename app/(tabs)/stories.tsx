import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import ApiService from '../../lib/api';
import AuthService from '../../lib/auth';
import { useTheme } from '../../lib/ThemeProvider';
import PremiumEmojiPicker from '../../components/PremiumEmojiPicker';

const { width } = Dimensions.get('window');
const STORY_WIDTH = width - 40;

interface Story {
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

const formatTimeAgo = (timestamp: string) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Az önce';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dk önce`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} sa önce`;
  return `${Math.floor(diffInSeconds / 86400)} gün önce`;
};

export default function StoriesScreen() {
  const [stories, setStories] = useState<Story[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('');

  // Theme context
  const { theme, hasFeature } = useTheme();

  // Check if user has premium emoji pack
  const hasEmojiPack = hasFeature('Premium Emoji Paketi');

  useEffect(() => {
    loadStories();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadStories();
    }, [])
  );

  const loadStories = async () => {
    try {
      setLoading(true);
      const storiesData = await ApiService.getStories();
      setStories(storiesData || []);
    } catch (error) {
      console.error('Error loading stories:', error);
      Alert.alert('Hata', 'Hikayeler yüklenirken bir hata oluştu');
      setStories([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStories();
    setRefreshing(false);
  };

  const handleLike = async (storyId: number) => {
    try {
      await ApiService.likeStory(storyId);
      
      // Update local state
      setStories(prevStories =>
        prevStories.map(story =>
          story.id === storyId
            ? {
                ...story,
                is_liked: !story.is_liked,
                likes: story.is_liked ? story.likes - 1 : story.likes + 1,
              }
            : story
        )
      );
    } catch (error) {
      console.error('Error liking story:', error);
      Alert.alert('Hata', 'Beğeni işlemi başarısız oldu');
    }
  };

  const handleShare = (story: Story) => {
    // In a real app, this would open share dialog
    Alert.alert('Paylaş', `${story.user_name} kullanıcısının hikayesini paylaş`);
  };

  const handleAddStory = () => {
    router.push('/(tabs)/camera');
  };

  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
    setShowEmojiPicker(false);
  };

  const renderStoryCard = ({ item: story }: { item: Story }) => (
    <View style={[styles.storyCard, { backgroundColor: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.1)' : theme.cardColor }]}>
      {/* User Header */}
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <Image 
            source={{ 
              uri: story.user_avatar || 'https://via.placeholder.com/50x50/cccccc/ffffff?text=U' 
            }} 
            style={styles.userAvatar} 
          />
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>{story.user_name}</Text>
            <Text style={[styles.timeAgo, { color: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : theme.textColor + 'CC' }]}>{formatTimeAgo(story.created_at)}</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.followButton, { backgroundColor: theme.accentColor }]}>
          <Text style={styles.followText}>Takip Et</Text>
        </TouchableOpacity>
      </View>

      {/* Food Image */}
      <TouchableOpacity style={styles.imageContainer}>
        <Image 
          source={{ 
            uri: story.image_uri || 'https://via.placeholder.com/400x300/cccccc/ffffff?text=Resim' 
          }} 
          style={styles.foodImage} 
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)']}
          style={styles.imageOverlay}
        >
          <View style={styles.calorieTag}>
            <Ionicons name="flame" size={14} color="#FF6B6B" />
            <Text style={styles.calorieText}>{story.calories} kcal</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Story Content */}
      <View style={styles.storyContent}>
        <Text style={[styles.storyDescription, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>{story.description}</Text>
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(story.id)}
          >
            <Ionicons
              name={story.is_liked ? "heart" : "heart-outline"}
              size={24}
              color={story.is_liked ? "#FF6B6B" : theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : "#666"}
            />
            <Text style={[styles.actionText, story.is_liked && styles.likedText, { color: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : '#666' }]}>
              {story.likes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleShare(story)}
          >
            <Ionicons name="share-outline" size={24} color={theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : "#666"} />
            <Text style={[styles.actionText, { color: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : '#666' }]}>Paylaş</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="bookmark-outline" size={24} color="#666" />
            <Text style={styles.actionText}>Kaydet</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="book-outline" size={80} color={theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.5)' : "#ccc"} />
      <Text style={[styles.emptyTitle, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>Henüz hikaye yok</Text>
      <Text style={[styles.emptyDescription, { color: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : theme.textColor + 'CC' }]}>
        İlk hikayeyi sen paylaş ve topluluğu büyütmeye yardım et!
      </Text>
      <TouchableOpacity style={styles.addStoryButton} onPress={handleAddStory}>
        <LinearGradient
          colors={['#4CAF50', '#45a049']}
          style={styles.addStoryGradient}
        >
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.addStoryText}>Hikaye Ekle</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.primaryColor, theme.secondaryColor]}
          style={styles.backgroundGradient}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>📖 Hikayeler</Text>
            </View>
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>Hikayeler yükleniyor...</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.primaryColor, theme.secondaryColor]}
        style={styles.backgroundGradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <LinearGradient
            colors={[theme.primaryColor, theme.secondaryColor]}
            style={styles.header}
          >
            <Text style={[styles.title, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>📖 Hikayeler</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={[styles.emojiButton, { backgroundColor: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : theme.accentColor + '40' }]}
                onPress={() => setShowEmojiPicker(true)}
              >
                <Text style={styles.emojiButtonText}>
                  {selectedEmoji || '😊'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.addButton, { backgroundColor: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : theme.accentColor + '40' }]}
                onPress={handleAddStory}
              >
                <Ionicons name="add" size={24} color={theme.textColor === '#ffffff' ? 'white' : theme.textColor} />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Stories List */}
          <ScrollView 
            style={styles.storiesContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {stories.map((story) => renderStoryCard({ item: story }))}
          </ScrollView>

          {/* Premium Emoji Picker */}
          <PremiumEmojiPicker
            visible={showEmojiPicker}
            onClose={() => setShowEmojiPicker(false)}
            onEmojiSelect={handleEmojiSelect}
            hasEmojiPack={hasEmojiPack}
          />
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  backgroundGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emojiButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiButtonText: {
    fontSize: 20,
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: 'white',
  },
  storiesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  storyCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  timeAgo: {
    fontSize: 12,
    color: '#999',
  },
  followButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  followText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  imageContainer: {
    position: 'relative',
  },
  foodImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: 'flex-end',
    padding: 16,
  },
  calorieTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  calorieText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  storyContent: {
    padding: 16,
  },
  storyDescription: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  likedText: {
    color: '#FF6B6B',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  addStoryButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  addStoryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 8,
  },
  addStoryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 