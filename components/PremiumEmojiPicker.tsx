import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/ThemeProvider';

const { width } = Dimensions.get('window');

interface PremiumEmojiPickerProps {
  visible: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
  hasEmojiPack: boolean;
}

const PremiumEmojiPicker: React.FC<PremiumEmojiPickerProps> = ({
  visible,
  onClose,
  onEmojiSelect,
  hasEmojiPack
}) => {
  const { theme, hasFeature } = useTheme();
  
  // Temel emojiler (ücretsiz)
  const basicEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💯'
  ];

  // Premium emojiler (sadece premium kullanıcılar için)
  const premiumEmojis = [
    '🦄', '🌈', '✨', '💎', '👑', '🔥', '💫', '⭐', '🌟', '💥',
    '🎊', '🎉', '🎈', '🎀', '🏆', '🥇', '🏅', '🎖️', '🏵️', '🎗️',
    '💝', '💖', '💗', '💓', '💞', '💕', '💟', '💌', '💘', '💋',
    '🦋', '🌺', '🌸', '🌼', '🌻', '🌷', '🌹', '🥀', '💐', '🌿',
    '🍀', '🌱', '🌳', '🌲', '🌴', '🌵', '🌾', '🌿', '☘️', '🍃',
    '🦚', '🦜', '🦩', '🐳', '🐬', '🦭', '🐧', '🦢', '🕊️', '🦅'
  ];

  const handleEmojiPress = (emoji: string) => {
    onEmojiSelect(emoji);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.cardColor }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.textColor }]}>
              Emoji Seç
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.textColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView}>
            {/* Temel Emojiler */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
                ✨ Temel Emojiler
              </Text>
              <View style={styles.emojiGrid}>
                {basicEmojis.map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.emojiButton}
                    onPress={() => handleEmojiPress(emoji)}
                  >
                    <Text style={styles.emoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Premium Emojiler */}
            <View style={styles.section}>
              <View style={styles.premiumHeader}>
                <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
                  👑 Premium Emoji Paketi
                </Text>
                {!hasEmojiPack && (
                  <View style={styles.lockBadge}>
                    <Ionicons name="lock-closed" size={12} color="#fff" />
                    <Text style={styles.lockText}>KİLİTLİ</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.emojiGrid}>
                {premiumEmojis.map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.emojiButton,
                      !hasEmojiPack && styles.lockedEmojiButton
                    ]}
                    onPress={() => {
                      if (hasEmojiPack) {
                        handleEmojiPress(emoji);
                      } else {
                        // Premium olmayan kullanıcı için uyarı
                        alert('👑 Premium Emoji Paketi gerekli!\nBu emojileri kullanmak için XP ile satın alın.');
                      }
                    }}
                    disabled={!hasEmojiPack}
                  >
                    <Text style={[
                      styles.emoji,
                      !hasEmojiPack && styles.lockedEmoji
                    ]}>
                      {emoji}
                    </Text>
                    {!hasEmojiPack && (
                      <View style={styles.lockOverlay}>
                        <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.8)" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {!hasEmojiPack && (
                <View style={styles.upgradePrompt}>
                  <Text style={[styles.upgradeText, { color: theme.textColor }]}>
                    🎁 Premium Emoji Paketi ile 60+ özel emoji kullan!
                  </Text>
                  <Text style={[styles.upgradeSubtext, { color: theme.textColor }]}>
                    Profil → Ödüller bölümünden satın alabilirsin
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  scrollView: {
    maxHeight: 400,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  lockText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emojiButton: {
    width: width * 0.12,
    height: width * 0.12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  lockedEmojiButton: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    position: 'relative',
  },
  emoji: {
    fontSize: 24,
  },
  lockedEmoji: {
    opacity: 0.3,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
  },
  upgradePrompt: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  upgradeText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 5,
  },
  upgradeSubtext: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default PremiumEmojiPicker; 