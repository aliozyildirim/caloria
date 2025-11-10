import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../lib/ThemeProvider';
import ApiService from '../lib/api';

export default function NutritionistScreen() {
  const { theme } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Merhaba! Beslenme Uzmanıyla birlikte hedeflerinize ulaşın.' },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const expertFeatures = [
    'Kişiselleştirilmiş beslenme planı',
    'Haftalık online görüşme (30dk)',
    'Sınırsız mesajlaşma desteği',
    'Özel tarifler ve öneriler',
    'İlerleme takibi ve raporlama',
    'Hedef belirleme ve motivasyon desteği',
  ];

  const plans = {
    monthly: {
      price: '299,99',
      period: 'ay',
      features: [
        'Kişiselleştirilmiş beslenme planı',
        'Haftalık online görüşme (30dk)',
        'Sınırsız mesajlaşma desteği',
        'Özel tarifler ve öneriler',
        'İlerleme takibi ve raporlama',
        'Hedef belirleme ve motivasyon desteği',
      ]
    },
    yearly: {
      price: '2.499,99',
      period: 'yıl',
      features: [
        'Tüm aylık plan özellikleri',
        'Ekstra 2 ay ücretsiz',
        'Öncelikli destek hattı',
        'Detaylı sağlık analizi',
        'Özel egzersiz programı',
        'Yıllık sağlık raporu',
      ]
    }
  };

  const handleSubscribe = async () => {
    try {
      Alert.alert(
        'Abonelik Onayı',
        `${selectedPlan === 'monthly' ? 'Aylık' : 'Yıllık'} plan için ödeme sayfasına yönlendirileceksiniz.\n\nFiyat: ${plans[selectedPlan].price}₺/${plans[selectedPlan].period}`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Devam Et',
            onPress: async () => {
              // Burada ödeme sayfasına yönlendirme yapılacak
              Alert.alert('Yakında!', 'Ödeme sistemi yakında aktif olacak! 🚀');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert('Hata', 'İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleSend = async () => {
    if (!inputMessage.trim()) return;

    setIsLoading(true);
    setInputMessage('');

    const userMessage = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await ApiService.sendMessage(inputMessage);
      setMessages(prev => [...prev, { role: 'ai', content: response.message }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Mesaj gönderirken bir hata oluştu.' }]);
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.primaryColor, theme.secondaryColor]}
        style={styles.backgroundGradient}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.textColor} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.textColor }]}>
              👩‍⚕️ Beslenme Uzmanı
            </Text>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Expert Info */}
            <View style={styles.expertSection}>
              <Image 
                source={require('../assets/images/nutritionist.png')} 
                style={styles.expertImage}
              />
              <Text style={[styles.expertName, { color: theme.textColor }]}>
                Dr. Ayşe Yılmaz
              </Text>
              <Text style={[styles.expertTitle, { color: `${theme.textColor}CC` }]}>
                Beslenme ve Diyet Uzmanı
              </Text>
              <View style={styles.expertStats}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.textColor }]}>10+</Text>
                  <Text style={[styles.statLabel, { color: `${theme.textColor}99` }]}>Yıl Deneyim</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.textColor }]}>1000+</Text>
                  <Text style={[styles.statLabel, { color: `${theme.textColor}99` }]}>Danışan</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.textColor }]}>4.9</Text>
                  <Text style={[styles.statLabel, { color: `${theme.textColor}99` }]}>Puan</Text>
                </View>
              </View>
            </View>

            {/* Features */}
            <View style={styles.featuresSection}>
              <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
                Özellikler
              </Text>
              <View style={[styles.featuresCard, { backgroundColor: theme.cardColor }]}>
                {expertFeatures.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    <Text style={[styles.featureText, { color: theme.textColor }]}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Additional Info */}
            <View style={styles.infoSection}>
              <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
                Nasıl Çalışır?
              </Text>

              <View style={[styles.infoCard, { backgroundColor: theme.cardColor }]}>
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="person" size={24} color="#4CAF50" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoTitle, { color: theme.textColor }]}>
                      Kişiye Özel Yaklaşım
                    </Text>
                    <Text style={[styles.infoDesc, { color: `${theme.textColor}99` }]}>
                      Size özel hazırlanan beslenme planı ile hedeflerinize ulaşın
                    </Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="time" size={24} color="#4CAF50" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoTitle, { color: theme.textColor }]}>
                      7/24 Destek
                    </Text>
                    <Text style={[styles.infoDesc, { color: `${theme.textColor}99` }]}>
                      İhtiyaç duyduğunuz her an uzman desteği alın
                    </Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="trending-up" size={24} color="#4CAF50" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoTitle, { color: theme.textColor }]}>
                      Sürekli Takip
                    </Text>
                    <Text style={[styles.infoDesc, { color: `${theme.textColor}99` }]}>
                      Düzenli ölçüm ve raporlarla ilerlemenizi görün
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Chat Section */}
            <View style={styles.chatSection}>
              <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
                💬 Sohbet
              </Text>

              <View style={[styles.chatContainer, { backgroundColor: theme.cardColor }]}>
                <ScrollView style={styles.messagesContainer}>
                  {messages.map((message, index) => (
                    <View 
                      key={index} 
                      style={[
                        styles.messageBox,
                        message.role === 'user' ? styles.userMessage : styles.aiMessage,
                        { backgroundColor: message.role === 'user' ? '#4CAF50' : theme.cardColor + '40' }
                      ]}
                    >
                      <Text style={[styles.messageText, { color: message.role === 'user' ? 'white' : theme.textColor }]}>
                        {message.content}
                      </Text>
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      { 
                        backgroundColor: theme.cardColor + '40',
                        color: theme.textColor,
                        borderColor: theme.cardColor
                      }
                    ]}
                    placeholder="Mesajınızı yazın..."
                    placeholderTextColor={`${theme.textColor}99`}
                    value={inputMessage}
                    onChangeText={setInputMessage}
                    multiline
                  />
                  <TouchableOpacity 
                    style={[styles.sendButton, { opacity: isLoading ? 0.5 : 1 }]}
                    onPress={handleSend}
                    disabled={isLoading || !inputMessage.trim()}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Ionicons name="send" size={24} color="white" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  expertSection: {
    alignItems: 'center',
    padding: 20,
  },
  expertImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  expertName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  expertTitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  expertStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  planSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  planToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    padding: 4,
    marginBottom: 20,
  },
  planToggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 21,
  },
  planToggleButtonActive: {
    backgroundColor: '#4CAF50',
  },
  planToggleText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
  planToggleTextActive: {
    color: 'white',
  },
  planCard: {
    borderRadius: 16,
    padding: 20,
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  currency: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 4,
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  period: {
    fontSize: 16,
    marginLeft: 4,
    marginBottom: 6,
  },
  featuresList: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  featureText: {
    fontSize: 16,
  },
  subscribeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoSection: {
    padding: 20,
  },
  infoCard: {
    borderRadius: 16,
    padding: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(76,175,80,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 14,
  },
  featuresSection: {
    padding: 20,
  },
  featuresCard: {
    borderRadius: 16,
    padding: 20,
  },
  chatSection: {
    padding: 20,
  },
  chatContainer: {
    borderRadius: 16,
    height: 400,
    padding: 16,
  },
  messagesContainer: {
    flex: 1,
    marginBottom: 16,
  },
  messageBox: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  aiMessage: {
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingRight: 40,
    fontSize: 16,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 