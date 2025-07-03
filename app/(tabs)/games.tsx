import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import ApiService, { Challenge, UserChallenge, XPInfo, LeaderboardResponse, RewardsShopResponse, GameRoom, GameRoomResponse } from '../../lib/api';
import { useTheme } from '../../lib/ThemeProvider';

const { width } = Dimensions.get('window');

type GameMode = 'quick' | 'friend' | 'tournament';
type GameType = 'quiz' | 'guess' | 'math' | 'word';

// Base styles
const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
});

// Layout styles
const layoutStyles = StyleSheet.create({
  backgroundGradient: {
    flex: 1,
  },
  safeAreaContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
});

// Header styles
const headerStyles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

// Game Room styles
const gameRoomStyles = StyleSheet.create({
  currentRoomCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  currentRoomGradient: {
    padding: 12,
  },
  roomHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomTitleSection: {
    flex: 1,
  },
  currentRoomTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  roomCode: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  roomStatusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  readyCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: 'rgba(76,175,80,0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roomActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
});

// Button styles
const buttonStyles = StyleSheet.create({
  readyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 8,
    borderRadius: 6,
    minWidth: 90,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  readyButtonActive: {
    backgroundColor: 'rgba(76,175,80,0.5)',
  },
  readyButtonInactive: {
    backgroundColor: 'rgba(244,67,54,0.5)',
  },
  readyButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  startGameButton: {
    backgroundColor: '#FFD700',
    padding: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 80,
  },
  startGameText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  leaveRoomButton: {
    backgroundColor: 'rgba(255,87,34,0.9)',
    padding: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 60,
  },
  leaveRoomText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
});

// Game Components
const QuizGame = ({ onGameEnd }: { onGameEnd: (score: number) => void }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const questions = [
    {
      question: "Bir orta boy elmada kaç kalori vardır?",
      options: ["52", "95", "125", "180"],
      correct: 1
    },
    {
      question: "Hangi vitamin C kaynağıdır?",
      options: ["Portakal", "Et", "Ekmek", "Süt"],
      correct: 0
    },
    {
      question: "Günde kaç bardak su içmeliyiz?",
      options: ["2-3", "5-6", "8-10", "12-15"],
      correct: 2
    },
    {
      question: "Protein hangi besinlerde bulunur?",
      options: ["Şeker", "Tavuk", "Patates", "Yağ"],
      correct: 1
    },
    {
      question: "Hangi besin grubundan enerji alırız?",
      options: ["Vitamin", "Mineral", "Karbonhidrat", "Su"],
      correct: 2
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleNextQuestion();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestion]);

  const handleAnswer = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
    setShowResult(true);
    
    if (answerIndex === questions[currentQuestion].correct) {
      setScore(prev => prev + 20);
    }
    
    setTimeout(() => {
      handleNextQuestion();
    }, 1500);
  };

  const handleNextQuestion = () => {
    if (currentQuestion + 1 >= questions.length) {
      onGameEnd(score);
    } else {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setTimeLeft(15);
    }
  };

  return (
    <View style={styles.gameContainer}>
      {/* Progress Bar */}
      <View style={styles.gameScreenHeader}>
        <Text style={styles.gameScore}>Puan: {score}</Text>
        <View style={styles.progressContainer}>
          <View style={[styles.gameProgressBar, { width: `${((currentQuestion + 1) / questions.length) * 100}%` }]} />
        </View>
        <Text style={styles.gameTimer}>{timeLeft}s</Text>
      </View>

      <View style={styles.questionContainer}>
        <Text style={styles.questionNumber}>Soru {currentQuestion + 1}/{questions.length}</Text>
        <Text style={styles.questionText}>{questions[currentQuestion].question}</Text>
      </View>

      <View style={styles.optionsContainer}>
        {questions[currentQuestion].options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionButton,
              selectedAnswer === index && (
                index === questions[currentQuestion].correct 
                  ? styles.optionButtonCorrect 
                  : styles.optionButtonWrong
              ),
              showResult && index === questions[currentQuestion].correct && styles.optionButtonCorrect
            ]}
            onPress={() => handleAnswer(index)}
            disabled={showResult}
          >
            <Text style={styles.optionText}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const GuessGame = ({ onGameEnd }: { onGameEnd: (score: number) => void }) => {
  const [currentFood, setCurrentFood] = useState(0);
  const [score, setScore] = useState(0);
  const [guess, setGuess] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);

  const foods = [
    { name: "Hamburger", calories: 540, image: "🍔" },
    { name: "Pizza Dilimi", calories: 285, image: "🍕" },
    { name: "Elma", calories: 95, image: "🍎" },
    { name: "Çikolata", calories: 210, image: "🍫" },
    { name: "Avokado", calories: 160, image: "🥑" }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleNextFood();
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentFood]);

  const handleGuess = () => {
    const guessNum = parseInt(guess);
    const actual = foods[currentFood].calories;
    const difference = Math.abs(guessNum - actual);
    
    let points = 0;
    if (difference <= 10) points = 50;
    else if (difference <= 25) points = 30;
    else if (difference <= 50) points = 15;
    else if (difference <= 100) points = 5;

    setScore(prev => prev + points);
    setShowResult(true);

    setTimeout(() => {
      handleNextFood();
    }, 2000);
  };

  const handleNextFood = () => {
    if (currentFood + 1 >= foods.length) {
      onGameEnd(score);
    } else {
      setCurrentFood(prev => prev + 1);
      setGuess('');
      setShowResult(false);
      setTimeLeft(20);
    }
  };

  return (
    <View style={styles.gameContainer}>
      <View style={styles.gameScreenHeader}>
        <Text style={styles.gameScore}>Puan: {score}</Text>
        <Text style={styles.gameTimer}>{timeLeft}s</Text>
      </View>

      <View style={styles.foodContainer}>
        <Text style={styles.foodEmoji}>{foods[currentFood].image}</Text>
        <Text style={styles.foodName}>{foods[currentFood].name}</Text>
        <Text style={styles.guessPrompt}>Kaç kalori tahmin ediyorsun?</Text>
      </View>

      {!showResult ? (
        <View style={styles.guessInputContainer}>
          <TextInput
            style={styles.guessInput}
            value={guess}
            onChangeText={setGuess}
            placeholder="Kalori tahmininiz"
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.guessButton} onPress={handleGuess}>
            <Text style={styles.guessButtonText}>Tahmin Et!</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>Gerçek: {foods[currentFood].calories} kalori</Text>
          <Text style={styles.resultText}>Tahmininiz: {guess}</Text>
          <Text style={styles.pointsEarned}>+{score} puan!</Text>
        </View>
      )}
    </View>
  );
};

const MathGame = ({ onGameEnd }: { onGameEnd: (score: number) => void }) => {
  const [currentProblem, setCurrentProblem] = useState(0);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(10);
  const [problems, setProblems] = useState<Array<{question: string, answer: number}>>([]);

  useEffect(() => {
    // Generate math problems
    const newProblems = [];
    for (let i = 0; i < 5; i++) {
      const num1 = Math.floor(Math.random() * 500) + 100;
      const num2 = Math.floor(Math.random() * 300) + 50;
      const operation = Math.random() > 0.5 ? '+' : '-';
      const question = `${num1} ${operation} ${num2}`;
      const answer = operation === '+' ? num1 + num2 : num1 - num2;
      newProblems.push({ question, answer });
    }
    setProblems(newProblems);
  }, []);

  useEffect(() => {
    if (problems.length === 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleNextProblem();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentProblem, problems]);

  const handleAnswer = () => {
    const userAnswer = parseInt(answer);
    if (userAnswer === problems[currentProblem].answer) {
      setScore(prev => prev + (timeLeft * 5)); // More points for faster answers
    }
    handleNextProblem();
  };

  const handleNextProblem = () => {
    if (currentProblem + 1 >= problems.length) {
      onGameEnd(score);
    } else {
      setCurrentProblem(prev => prev + 1);
      setAnswer('');
      setTimeLeft(10);
    }
  };

  if (problems.length === 0) {
    return <View style={styles.gameContainer}><Text>Yükleniyor...</Text></View>;
  }

  return (
    <View style={styles.gameContainer}>
      <View style={styles.gameScreenHeader}>
        <Text style={styles.gameScore}>Puan: {score}</Text>
        <Text style={styles.gameTimer}>{timeLeft}s</Text>
      </View>

      <View style={styles.mathContainer}>
        <Text style={styles.mathProblem}>{problems[currentProblem].question} = ?</Text>
        <TextInput
          style={styles.mathInput}
          value={answer}
          onChangeText={setAnswer}
          placeholder="Cevabınız"
          keyboardType="numeric"
          autoFocus
        />
        <TouchableOpacity style={styles.mathButton} onPress={handleAnswer}>
          <Text style={styles.mathButtonText}>Cevapla</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const WordGame = ({ onGameEnd }: { onGameEnd: (score: number) => void }) => {
  const [currentWord, setCurrentWord] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [inputWord, setInputWord] = useState('');

  const wordCategories = [
    {
      category: "Meyveler",
      words: ["elma", "muz", "portakal", "çilek", "üzüm", "karpuz", "kavun", "şeftali"],
      hint: "Tatlı ve sağlıklı besinler"
    },
    {
      category: "Sebzeler", 
      words: ["domates", "salatalık", "havuç", "brokoli", "ıspanak", "lahana", "biber"],
      hint: "Vitamin deposu yeşillikler"
    }
  ];

  const currentCategory = wordCategories[currentWord] || wordCategories[0];

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onGameEnd(score);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleWordSubmit = () => {
    const word = inputWord.toLowerCase().trim();
    if (word && currentCategory.words.includes(word) && !foundWords.includes(word)) {
      setFoundWords(prev => [...prev, word]);
      setScore(prev => prev + 10);
      setInputWord('');
    } else if (foundWords.includes(word)) {
      Alert.alert('Bu kelimeyi zaten buldun!');
    } else {
      Alert.alert('Bu kelime listede yok!');
    }
    setInputWord('');
  };

  return (
    <View style={styles.gameContainer}>
      <View style={styles.gameScreenHeader}>
        <Text style={styles.gameScore}>Puan: {score}</Text>
        <Text style={styles.gameTimer}>{timeLeft}s</Text>
      </View>

      <View style={styles.wordGameContainer}>
        <Text style={styles.wordCategory}>{currentCategory.category}</Text>
        <Text style={styles.wordHint}>{currentCategory.hint}</Text>
        
        <View style={styles.foundWordsContainer}>
          <Text style={styles.foundWordsTitle}>Bulunan Kelimeler ({foundWords.length}/{currentCategory.words.length}):</Text>
          <View style={styles.foundWordsList}>
            {foundWords.map((word, index) => (
              <View key={index} style={styles.foundWord}>
                <Text style={styles.foundWordText}>{word}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.wordInputContainer}>
          <TextInput
            style={styles.wordInput}
            value={inputWord}
            onChangeText={setInputWord}
            placeholder="Kelime yazın..."
            onSubmitEditing={handleWordSubmit}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.submitWordButton} onPress={handleWordSubmit}>
            <Text style={styles.submitWordButtonText}>Gönder</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default function GamesScreen() {
  const { openModal } = useLocalSearchParams();
  const { theme } = useTheme();
  
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<UserChallenge | null>(null);
  const [userXP, setUserXP] = useState<XPInfo>({ totalXP: 0, level: 1, nextLevelXP: 100 });
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // New states for XP features
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [rewardsData, setRewardsData] = useState<RewardsShopResponse | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse | null>(null);
  const [dailyBonusClaimed, setDailyBonusClaimed] = useState(false);
  const [userRewards, setUserRewards] = useState<any[]>([]);
  const [showMyRewardsModal, setShowMyRewardsModal] = useState(false);

  // New game states
  const [selectedTab, setSelectedTab] = useState<'games' | 'challenges'>('games');
  const [selectedGameType, setSelectedGameType] = useState<GameType | null>(null);
  const [gameRooms, setGameRooms] = useState<GameRoom[]>([]);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  
  // Game playing states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentGame, setCurrentGame] = useState<GameType | null>(null);
  const [showGameResult, setShowGameResult] = useState(false);
  const [gameScore, setGameScore] = useState(0);

  const [isReady, setIsReady] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [allPlayersReady, setAllPlayersReady] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Handle automatic modal opening based on parameter
    if (openModal) {
      setTimeout(() => {
        switch (openModal) {
          case 'shop':
            loadRewardsShop();
            setShowRewardsModal(true);
            break;
          case 'leaderboard':
            loadLeaderboard();
            setShowLeaderboardModal(true);
            break;
          case 'rewards':
            setShowMyRewardsModal(true);
            break;
        }
      }, 500);
    }
  }, [openModal]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const [challengesData, activeChallengeData, xpData, userRewardsData] = await Promise.all([
        ApiService.getChallenges().catch(() => []),
        ApiService.getActiveChallenge().catch(() => null),
        ApiService.getUserXP().catch(() => ({ totalXP: 0, level: 1, nextLevelXP: 100 })),
        ApiService.getUserRewards().catch(() => [])
      ]);

      setChallenges(challengesData);
      setActiveChallenge(activeChallengeData);
      setUserXP(xpData);
      setUserRewards(userRewardsData);
      
      // Load real game rooms from API
      await loadGameRooms();
      
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Yükleme Hatası', 'Veriler yüklenirken bir sorun oluştu. İnternet bağlantınızı kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGameRooms = async () => {
    try {
      const response: GameRoomResponse = await ApiService.getGameRooms();
      setGameRooms(response.rooms);
      
      // If user is currently in a room, update the current room state
      if (currentRoom) {
        const updatedCurrentRoom = response.rooms.find(room => room.room_code === currentRoom.room_code);
        if (updatedCurrentRoom) {
          console.log('🔄 Updating current room state:', updatedCurrentRoom);
          setCurrentRoom(updatedCurrentRoom);
        } else {
          console.log('⚠️ Current room not found in updated rooms list, clearing current room');
          setCurrentRoom(null);
        }
      }
    } catch (error) {
      console.error('Error loading game rooms:', error);
      // Fallback to empty array if API fails
      setGameRooms([]);
    }
  };

  const getGameInfo = (type: GameType) => {
    switch (type) {
      case 'quiz':
        return {
          title: 'Beslenme Quiz',
          icon: '🧠',
          description: 'Beslenme sorularını yarışarak cevapla',
          xp: '10-50 XP',
          color: ['#667eea', '#764ba2']
        };
      case 'guess':
        return {
          title: 'Yemek Tahmin',
          icon: '🍔',
          description: 'Yemek fotoğrafından kalori tahmin et',
          xp: '15-40 XP',
          color: ['#f093fb', '#f5576c']
        };
      case 'math':
        return {
          title: 'Hızlı Matematik',
          icon: '🔢',
          description: 'Kalori hesaplama yarışması',
          xp: '12-35 XP',
          color: ['#4facfe', '#00f2fe']
        };
      case 'word':
        return {
          title: 'Kelime Oyunu',
          icon: '💬',
          description: 'Sağlık kelime çağrışımı',
          xp: '8-30 XP',
          color: ['#43e97b', '#38f9d7']
        };
    }
  };

  const handleGameSelect = (gameType: GameType) => {
    setSelectedGameType(gameType);
    Alert.alert(
      '🎮 Oyun Modu Seç',
      'Nasıl oynamak istiyorsun?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: '⚡ Hızlı Oyun', onPress: () => handleQuickGame(gameType) },
        { text: '👥 Arkadaş', onPress: () => handleFriendGame(gameType) },
        { text: '🏆 Turnuva', onPress: () => handleTournament(gameType) },
      ]
    );
  };

  const handleQuickGame = (gameType: GameType) => {
    setCurrentGame(gameType);
    setIsPlaying(true);
  };

  const handleFriendGame = (gameType: GameType) => {
    setSelectedGameType(gameType);
    setShowRoomModal(true);
    console.log('Opening room modal for game type:', gameType);
  };

  const handleTournament = (gameType: GameType) => {
    Alert.alert('🏆 Turnuva', 'Turnuva modu yakında gelecek!');
  };

  const createRoom = async () => {
    if (!playerName.trim()) {
      Alert.alert('Hata', 'Lütfen oyuncu adınızı girin');
      return;
    }
    
    if (!selectedGameType) {
      Alert.alert('Hata', 'Oyun türü seçilmedi');
      return;
    }

    try {
      const newRoom = await ApiService.createGameRoom({
        game_type: selectedGameType,
        game_mode: 'friend',
        player_name: playerName,
        max_players: 2
      });
      
      Alert.alert('🎉 Oda Oluşturuldu!', `Oda Kodu: ${newRoom.room_code}\nArkadaşlarınızla paylaşın!`);
      setCurrentRoom(newRoom);
      setShowRoomModal(false);
      setRoomCode('');
      setPlayerName('');
      
      // Refresh game rooms list
      loadGameRooms();
    } catch (error: any) {
      console.error('Create room error:', error);
      Alert.alert('Oda Oluşturulamadı', 'Oda oluşturulurken bir sorun oluştu. Lütfen tekrar deneyin.');
    }
  };

  const joinRoom = async () => {
    if (!roomCode.trim() || !playerName.trim()) {
      Alert.alert('Hata', 'Lütfen oda kodunu ve oyuncu adınızı girin');
      return;
    }
    
    try {
      Alert.alert('🎮 Odaya Katılıyorsun...', 'Lütfen bekle...');
      
      const joinedRoom = await ApiService.joinGameRoom(roomCode.toUpperCase(), playerName);
      
      Alert.alert('✅ Odaya Katıldın!', 'Oyun sahibi oyunu başlatana kadar bekle.');
      setCurrentRoom(joinedRoom);
      setShowRoomModal(false);
      setRoomCode('');
      setPlayerName('');
      
      // Refresh game rooms list
      loadGameRooms();
    } catch (error: any) {
      console.error('Join room error:', error);
      
      if (error.message && error.message.includes('Room not found')) {
        Alert.alert('Oda Bulunamadı', 'Bu oda kodu ile bir oda bulunamadı. Kodu kontrol edin.');
      } else if (error.message && error.message.includes('Room is full')) {
        Alert.alert('Oda Dolu', 'Bu oda maksimum oyuncu sayısına ulaştı.');
      } else if (error.message && error.message.includes('Game already started')) {
        Alert.alert('Oyun Başlamış', 'Bu odada oyun zaten başlamış. Başka bir oda deneyin.');
      } else {
        Alert.alert('Odaya Katılamadı', 'Odaya katılırken bir sorun oluştu. Lütfen tekrar deneyin.');
      }
    }
  };

  const handleGameEnd = (score: number) => {
    setGameScore(score);
    setIsPlaying(false);
    setShowGameResult(true);
    
    // Calculate XP earned
    const xpEarned = Math.floor(score / 10);
    setUserXP(prev => ({ ...prev, totalXP: prev.totalXP + xpEarned }));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAcceptChallenge = async (challenge: Challenge) => {
    try {
      if (activeChallenge && !activeChallenge.is_completed) {
        Alert.alert(
          'Aktif Challenge Var',
          'Zaten aktif bir challenge\'ınız var. Önce onu tamamlayın.',
          [{ text: 'Tamam' }]
        );
        return;
      }

      Alert.alert(
        'Challenge Kabul Et',
        `"${challenge.title}" challenge'ını kabul etmek istediğinizden emin misiniz?\n\n${challenge.description}\n\nÖdül: ${challenge.xp_reward} XP`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Kabul Et',
            onPress: async () => {
              try {
                await ApiService.acceptChallenge(challenge.id);
                Alert.alert('Başarılı! 🎯', 'Challenge kabul edildi! Başarılar!');
                loadData(); // Refresh data
              } catch (error: any) {
                console.error('Error accepting challenge:', error);
                
                if (error.message && error.message.includes('404')) {
                  Alert.alert('Challenge Bulunamadı', 'Bu challenge artık mevcut değil. Lütfen sayfayı yenileyin.');
                  loadData(); // Refresh challenges
                } else if (error.message && error.message.includes('400')) {
                  Alert.alert('Challenge Kabul Edilemedi', 'Zaten aktif bir challenge\'ınız var veya bu challenge kabul edilemez.');
                } else {
                  Alert.alert('Kabul Edilemedi', 'Challenge kabul edilirken bir sorun oluştu. Lütfen tekrar deneyin.');
                }
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleAcceptChallenge:', error);
      Alert.alert('Beklenmeyen Hata', 'Bir sorun oluştu. Lütfen uygulamayı yeniden başlatın.');
    }
  };

  const handleUpdateProgress = async () => {
    if (!activeChallenge) return;

    try {
      const result = await ApiService.updateChallengeProgress(activeChallenge.id, 1);
      
      if (result.completed) {
        Alert.alert(
          'Tebrikler! 🎉',
          `Challenge tamamlandı! ${result.completionXP} XP kazandınız!`,
          [{ text: 'Harika!' }]
        );
      } else {
        Alert.alert('Başarılı! ⭐', result.message || 'Günlük ilerleme kaydedildi! +5 XP');
      }
      
      loadData(); // Refresh data
    } catch (error: any) {
      console.error('Error updating progress:', error);
      
      // Handle specific error cases with user-friendly messages
      if (error.message && error.message.includes('Bu challenge için bugün zaten ilerleme kaydettiniz')) {
        Alert.alert('Zaten Tamamlandı! 😊', 'Bu challenge için bugün zaten ilerleme kaydettiniz. Yarın tekrar deneyin!');
      } else if (error.message && error.message.includes('400')) {
        Alert.alert('Zaten Tamamlandı! 😊', 'Bu challenge için bugün zaten ilerleme kaydettiniz. Yarın tekrar deneyin!');
      } else if (error.message && error.message.includes('404')) {
        Alert.alert('Challenge Bulunamadı', 'Bu challenge artık mevcut değil. Lütfen sayfayı yenileyin.');
        loadData(); // Refresh to get current challenges
      } else {
        Alert.alert('İlerleme Kaydedilemedi', 'Challenge ilerlemesi kaydedilirken bir sorun oluştu. Lütfen tekrar deneyin.');
      }
    }
  };

  // New XP feature functions
  const loadRewardsShop = async () => {
    try {
      const data = await ApiService.getRewardsShop();
      setRewardsData(data);
    } catch (error) {
      console.error('Error loading rewards shop:', error);
      Alert.alert('Mağaza Yüklenemedi', 'Ödül mağazası şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
    }
  };

  const loadLeaderboard = async () => {
    try {
      const data = await ApiService.getLeaderboard('all_time', 20);
      setLeaderboardData(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      Alert.alert('Liderlik Tablosu Yüklenemedi', 'Liderlik tablosu şu anda kullanılamıyor. Sunucu ile bağlantı sorunu olabilir.');
    }
  };

  const claimDailyBonus = async () => {
    try {
      const result = await ApiService.claimDailyBonus();
      Alert.alert(
        'Günlük Bonus! 🎁',
        `${result.xpAwarded} XP kazandınız! (${result.streak} günlük seri)`,
        [{ text: 'Harika!' }]
      );
      setDailyBonusClaimed(true);
      loadData(); // Refresh XP data
    } catch (error: any) {
      console.error('Daily bonus error:', error);
      
      // Check for specific error messages
      if (error.message && error.message.includes('Daily bonus already claimed today')) {
        Alert.alert('Günlük Bonus Alınmış', 'Bugünkü bonusunuzu zaten aldınız! Yarın tekrar gelin. 😊');
        setDailyBonusClaimed(true);
      } else if (error.message && error.message.includes('400')) {
        Alert.alert('Günlük Bonus Alınmış', 'Bugünkü bonusunuzu zaten aldınız! Yarın tekrar gelin. 😊');
        setDailyBonusClaimed(true);
      } else {
        Alert.alert('Bonus Alınamadı', 'Günlük bonus alınırken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
      }
    }
  };

  const purchaseReward = async (rewardId: number, rewardName: string, cost: number) => {
    Alert.alert(
      'Ödül Satın Al',
      `"${rewardName}" ödülünü ${cost} XP karşılığında satın almak istiyor musunuz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Satın Al',
          onPress: async () => {
            try {
              const result = await ApiService.purchaseReward(rewardId);
              Alert.alert('Başarılı! 🎉', result.message || 'Ödül başarıyla satın alındı!');
              loadRewardsShop(); // Refresh rewards
              loadData(); // Refresh XP data
            } catch (error: any) {
              console.error('Purchase reward error:', error);
              
              if (error.message && error.message.includes('Insufficient XP')) {
                Alert.alert('Yetersiz XP', 'Bu ödülü satın almak için yeterli XP\'niz yok. Daha fazla challenge tamamlayın!');
              } else if (error.message && error.message.includes('Reward already purchased')) {
                Alert.alert('Zaten Satın Alınmış', 'Bu ödülü zaten satın almışsınız.');
              } else if (error.message && error.message.includes('Database error')) {
                Alert.alert('Sunucu Sorunu', 'Satın alma işlemi şu anda gerçekleştirilemiyor. Lütfen birkaç dakika sonra tekrar deneyin.');
              } else if (error.message && error.message.includes('400')) {
                Alert.alert('Satın Alınamadı', 'Yetersiz XP veya ödül zaten satın alınmış!');
              } else if (error.message && error.message.includes('404')) {
                Alert.alert('Ödül Bulunamadı', 'Bu ödül artık mevcut değil.');
                loadRewardsShop(); // Refresh rewards
              } else if (error.message && error.message.includes('500')) {
                Alert.alert('Sunucu Hatası', 'Sunucuda bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
              } else {
                Alert.alert('Satın Alma Başarısız', 'Ödül satın alınırken beklenmeyen bir sorun oluştu. Lütfen tekrar deneyin.');
              }
            }
          }
        }
      ]
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return ['#4CAF50', '#45a049'];
      case 'medium': return ['#FF9800', '#FF8F00'];
      case 'hard': return ['#F44336', '#E53935'];
      default: return ['#666', '#555'];
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Kolay';
      case 'medium': return 'Orta';
      case 'hard': return 'Zor';
      default: return 'Bilinmiyor';
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'vegetables': return '🥗';
      case 'water': return '💧';
      case 'exercise': return '💪';
      case 'healthy_fats': return '🥑';
      case 'no_sugar': return '🍎';
      case 'sleep': return '😴';
      case 'meditation': return '🧘';
      default: return '⭐';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'vegetables': return '🥗';
      case 'water': return '💧';
      case 'exercise': return '💪';
      case 'healthy_fats': return '🥑';
      case 'no_sugar': return '🍎';
      case 'sleep': return '😴';
      case 'meditation': return '🧘';
      default: return '⭐';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'vegetables': return 'Sebze';
      case 'water': return 'Su';
      case 'exercise': return 'Egzersiz';
      case 'healthy_fats': return 'Sağlıklı Yağlar';
      case 'no_sugar': return 'Şeker';
      case 'sleep': return 'Uyku';
      case 'meditation': return 'Meditasyon';
      case 'avatar': return 'Avatar';
      case 'theme': return 'Tema';
      case 'badge': return 'Rozet';
      case 'feature': return 'Özellik';
      case 'discount': return 'İndirim';
      default: return 'Diğer';
    }
  };

  const getRewardIcon = (iconName: string) => {
    switch (iconName) {
      case 'bronze': return '🥉';
      case 'silver': return '🥈';
      case 'gold': return '🥇';
      case 'moon': return '🌙';
      case 'water': return '💧';
      case 'apple': return '🍎';
      case 'fire': return '🔥';
      case 'trophy': return '🏆';
      case 'star': return '⭐';
      case 'diamond': return '💎';
      case 'crown': return '👑';
      case 'medal': return '🏅';
      default: return iconName || '🎁';
    }
  };

  const handleReadyToggle = async () => {
    try {
      console.log('🎯 Ready button pressed');
      const newReadyStatus = !isReady;
      
      // Update local state immediately
      setIsReady(newReadyStatus);
      
      // Update current room state
      setCurrentRoom(prevRoom => {
        if (!prevRoom) return prevRoom;
        
        const updatedPlayers = prevRoom.players?.map(player => {
          if (player.player_name === playerName) {
            return { ...player, is_ready: newReadyStatus };
          }
          return player;
        });
        
        return { ...prevRoom, players: updatedPlayers };
      });
      
      const response = await ApiService.setPlayerReady(currentRoom!.room_code, newReadyStatus);
      console.log('✅ Ready status response:', response);
      
      // Also refresh room data from server
      await loadGameRooms();
      
      if (response.all_ready) {
        Alert.alert('🎉 Tüm Oyuncular Hazır!', 'Host oyunu başlatabilir.');
      }
    } catch (error: any) {
      console.error('❌ Ready status error:', error);
      
      // Revert local state on error
      setIsReady(!isReady);
      
      setCurrentRoom(prevRoom => {
        if (!prevRoom) return prevRoom;
        
        const updatedPlayers = prevRoom.players?.map(player => {
          if (player.player_name === playerName) {
            return { ...player, is_ready: !isReady };
          }
          return player;
        });
        
        return { ...prevRoom, players: updatedPlayers };
      });
      
      Alert.alert('Hata', `Hazır durumu güncellenirken bir sorun oluştu: ${error.message || 'Bilinmeyen hata'}`);
    }
  };

  const handleStartGame = () => {
    Alert.alert('🚀 Oyunu Başlat', 'Oyunu başlatmak istediğinizden emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { 
        text: 'Başlat', 
        onPress: () => {
          setCurrentGame(currentRoom!.game_type as GameType);
          setIsPlaying(true);
        }
      }
    ]);
  };

  const handleLeaveRoom = () => {
    Alert.alert('🚪 Odadan Çık', 'Odadan çıkmak istediğinizden emin misiniz?', [
      { text: 'Kalsam', style: 'cancel' },
      { 
        text: 'Çık', 
        onPress: async () => {
          try {
            console.log('🚪 Leaving room:', currentRoom!.room_code);
            
            // Clear current room immediately
            setCurrentRoom(null);
            
            // API call to leave room
            const response = await ApiService.leaveGameRoom(currentRoom!.room_code);
            console.log('✅ Leave room API response:', response);
            
            // Show success message
            Alert.alert('👋 Odadan Çıktın', 'Başka bir odaya katılabilirsin.');
            
            // Refresh rooms to see updated count
            await loadGameRooms(); 
            
          } catch (error: any) {
            console.error('❌ Leave room error:', error);
            
            // Even if API fails, remove from local state
            setCurrentRoom(null);
            
            // Show error but still clear local state
            Alert.alert('⚠️ Uyarı', `Odadan çıkarken hata oluştu ama yerel durum temizlendi: ${error.message || 'Bilinmeyen hata'}`);
            
            // Still refresh to get current state
            try {
              await loadGameRooms();
            } catch (refreshError) {
              console.error('❌ Refresh error after leave:', refreshError);
            }
          }
        }
      }
    ]);
  };

  // Update isHost and allPlayersReady when currentRoom changes
  useEffect(() => {
    if (currentRoom) {
      setIsHost(currentRoom.host_name === playerName);
      setIsReady(currentRoom.players?.find(p => p.player_name === playerName)?.is_ready || false);
      setAllPlayersReady(
        currentRoom.players?.every(p => p.is_ready) && 
        currentRoom.current_players >= 2
      );
    }
  }, [currentRoom, playerName]);

  // Render the active game if playing
  if (isPlaying && currentGame) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.primaryColor, theme.secondaryColor]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeAreaContainer}>
            <View style={styles.gameScreenHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  Alert.alert(
                    'Oyunu Bırak',
                    'Oyunu bırakmak istediğinizden emin misiniz? İlerlemeniz kaybedilecek.',
                    [
                      { text: 'Devam Et', style: 'cancel' },
                      { text: 'Bırak', onPress: () => setIsPlaying(false) }
                    ]
                  );
                }}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
                <Text style={styles.backButtonText}>Geri</Text>
              </TouchableOpacity>
              <Text style={styles.gameTitle}>{getGameInfo(currentGame).title}</Text>
            </View>
            
            {currentGame === 'quiz' && <QuizGame onGameEnd={handleGameEnd} />}
            {currentGame === 'guess' && <GuessGame onGameEnd={handleGameEnd} />}
            {currentGame === 'math' && <MathGame onGameEnd={handleGameEnd} />}
            {currentGame === 'word' && <WordGame onGameEnd={handleGameEnd} />}
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
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeAreaContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>
              🎮 Oyunlar & Challenges
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : theme.textColor + 'CC' }]}>
              Oyna, yarış, kazan!
            </Text>
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                selectedTab === 'games' && styles.activeTabButton,
                { backgroundColor: selectedTab === 'games' ? theme.accentColor : 'rgba(255,255,255,0.1)' }
              ]}
              onPress={() => setSelectedTab('games')}
            >
              <Ionicons 
                name="game-controller" 
                size={20} 
                color={selectedTab === 'games' ? 'white' : (theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.7)' : theme.textColor + 'CC')} 
              />
              <Text style={[
                styles.tabButtonText, 
                { color: selectedTab === 'games' ? 'white' : (theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.7)' : theme.textColor + 'CC') }
              ]}>
                Oyunlar
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.tabButton,
                selectedTab === 'challenges' && styles.activeTabButton,
                { backgroundColor: selectedTab === 'challenges' ? theme.accentColor : 'rgba(255,255,255,0.1)' }
              ]}
              onPress={() => setSelectedTab('challenges')}
            >
              <Ionicons 
                name="trophy" 
                size={20} 
                color={selectedTab === 'challenges' ? 'white' : (theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.7)' : theme.textColor + 'CC')} 
              />
              <Text style={[
                styles.tabButtonText, 
                { color: selectedTab === 'challenges' ? 'white' : (theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.7)' : theme.textColor + 'CC') }
              ]}>
                Challenges
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false} 
            style={styles.scrollView}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {selectedTab === 'games' ? (
              <>
                {/* XP Display */}
                <View style={styles.xpCard}>
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.xpGradient}
                  >
                    <View style={styles.xpContent}>
                      <View style={styles.xpInfo}>
                        <Text style={styles.xpTitle}>⭐ Level {userXP.level}</Text>
                        <Text style={styles.xpText}>{userXP.totalXP} XP</Text>
                      </View>
                      <View style={styles.xpProgressContainer}>
                        <Text style={styles.xpProgressText}>
                          {userXP.totalXP % 100}/{userXP.nextLevelXP} XP
                        </Text>
                        <View style={styles.xpProgressBar}>
                          <View 
                            style={[
                              styles.xpProgressFill, 
                              { width: `${(userXP.totalXP % 100) / 100 * 100}%` }
                            ]} 
                          />
                        </View>
                      </View>
                    </View>
                  </LinearGradient>
                </View>

                {/* Current Room Status */}
                {currentRoom && (
                  <View style={styles.currentRoomCard}>
                    <LinearGradient
                      colors={getGameInfo(currentRoom.game_type as GameType).color}
                      style={styles.currentRoomGradient}
                    >
                      {/* Header Row */}
                      <View style={styles.roomHeaderRow}>
                        <View style={styles.roomTitleSection}>
                          <Text style={styles.currentRoomTitle}>
                            🎮 {getGameInfo(currentRoom.game_type as GameType).title}
                            <Text style={styles.roomCode}> • Oda: {currentRoom.room_code}</Text>
                          </Text>
                        </View>
                        <View style={styles.roomStatusSection}>
                          <Text style={styles.playerCount}>{currentRoom.current_players}/2</Text>
                          <Text style={styles.readyCount}>
                            ✓ {currentRoom.players?.filter(p => p.is_ready).length || 0}/2
                          </Text>
                        </View>
                      </View>

                      {/* Actions Row */}
                      <View style={styles.roomActionsRow}>
                        <TouchableOpacity
                          style={[
                            styles.readyButton,
                            isReady ? styles.readyButtonActive : styles.readyButtonInactive
                          ]}
                          onPress={handleReadyToggle}
                        >
                          <Ionicons name={isReady ? "checkmark-circle" : "close-circle"} size={16} color="#fff" />
                          <Text style={styles.readyButtonText}>{isReady ? "Hazırım!" : "Hazır Değilim"}</Text>
                        </TouchableOpacity>

                        {isHost && allPlayersReady && (
                          <TouchableOpacity style={styles.startGameButton} onPress={handleStartGame}>
                            <Ionicons name="play" size={16} color="#333" />
                            <Text style={styles.startGameText}>Başlat</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.leaveRoomButton} onPress={handleLeaveRoom}>
                          <Ionicons name="exit" size={16} color="#fff" />
                          <Text style={styles.leaveRoomText}>Çık</Text>
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  </View>
                )}

                {/* Games Grid */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>
                    🎯 Multiplayer Oyunlar
                  </Text>
                  <View style={styles.gamesGrid}>
                    {(['quiz', 'guess', 'math', 'word'] as GameType[]).map((gameType) => {
                      const gameInfo = getGameInfo(gameType);
                      return (
                        <TouchableOpacity
                          key={gameType}
                          style={styles.gameCard}
                          onPress={() => handleGameSelect(gameType)}
                        >
                          <LinearGradient
                            colors={gameInfo.color}
                            style={styles.gameCardGradient}
                          >
                            <Text style={styles.gameIcon}>{gameInfo.icon}</Text>
                            <Text style={styles.gameTitle}>{gameInfo.title}</Text>
                            <Text style={styles.gameDescription}>{gameInfo.description}</Text>
                            <View style={styles.gameStats}>
                              <Text style={styles.gameXP}>{gameInfo.xp}</Text>
                              <View style={styles.playersOnline}>
                                <Ionicons name="people" size={12} color="rgba(255,255,255,0.8)" />
                                <Text style={styles.playersCount}>
                                  {gameRooms.filter(room => room.game_type === gameType && room.status === 'waiting').length} oda
                                </Text>
                              </View>
                            </View>
                          </LinearGradient>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>
                    ⚡ Hızlı İşlemler
                  </Text>
                  <View style={styles.quickActionsGrid}>
                    <TouchableOpacity
                      style={styles.quickActionButton}
                      onPress={() => {
                        loadLeaderboard();
                        setShowLeaderboardModal(true);
                      }}
                    >
                      <LinearGradient
                        colors={['#FF6B6B', '#FF8E53']}
                        style={styles.quickActionGradient}
                      >
                        <Ionicons name="trophy" size={24} color="white" />
                        <Text style={styles.quickActionText}>Liderlik Tablosu</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.quickActionButton}
                      onPress={() => {
                        loadRewardsShop();
                        setShowRewardsModal(true);
                      }}
                    >
                      <LinearGradient
                        colors={['#4ECDC4', '#44A08D']}
                        style={styles.quickActionGradient}
                      >
                        <Ionicons name="storefront" size={24} color="white" />
                        <Text style={styles.quickActionText}>Mağaza</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.quickActionButton}
                      onPress={() => setShowMyRewardsModal(true)}
                    >
                      <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        style={styles.quickActionGradient}
                      >
                        <Ionicons name="medal" size={24} color="white" />
                        <Text style={styles.quickActionText}>Ödüllerim</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.quickActionButton}
                      onPress={claimDailyBonus}
                    >
                      <LinearGradient
                        colors={['#FFD93D', '#FF9A3C']}
                        style={styles.quickActionGradient}
                      >
                        <Ionicons name="gift" size={24} color="white" />
                        <Text style={styles.quickActionText}>Günlük Bonus</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              <>
                {/* Challenges Content */}
            {/* XP Display */}
            <View style={styles.xpCard}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.xpGradient}
              >
                <View style={styles.xpContent}>
                  <View style={styles.xpInfo}>
                    <Text style={styles.xpTitle}>⭐ Level {userXP.level}</Text>
                    <Text style={styles.xpText}>{userXP.totalXP} XP</Text>
                  </View>
                  <View style={styles.xpProgressContainer}>
                    <Text style={styles.xpProgressText}>
                      {userXP.totalXP % 100}/{userXP.nextLevelXP} XP
                    </Text>
                    <View style={styles.xpProgressBar}>
                      <View 
                        style={[
                          styles.xpProgressFill, 
                          { width: `${(userXP.totalXP % 100) / 100 * 100}%` }
                        ]} 
                      />
                    </View>
                  </View>
                </View>
                
                {/* XP Action Buttons */}
                <View style={styles.xpActionsContainer}>
                  <TouchableOpacity
                    style={[styles.xpActionButton, dailyBonusClaimed && styles.xpActionButtonDisabled]}
                    onPress={claimDailyBonus}
                    disabled={dailyBonusClaimed}
                  >
                    <Ionicons name="gift" size={16} color="#fff" />
                    <Text style={styles.xpActionButtonText}>
                      {dailyBonusClaimed ? 'Alındı' : 'Günlük Bonus'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.xpActionButton}
                    onPress={() => {
                      loadRewardsShop();
                      setShowRewardsModal(true);
                    }}
                  >
                    <Ionicons name="storefront" size={16} color="#fff" />
                    <Text style={styles.xpActionButtonText}>Mağaza</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.xpActionButton}
                    onPress={() => {
                      loadLeaderboard();
                      setShowLeaderboardModal(true);
                    }}
                  >
                    <Ionicons name="trophy" size={16} color="#fff" />
                    <Text style={styles.xpActionButtonText}>Liderlik</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.xpActionButton}
                    onPress={() => setShowMyRewardsModal(true)}
                  >
                    <Ionicons name="medal" size={16} color="#fff" />
                    <Text style={styles.xpActionButtonText}>Ödüllerim</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>

            {/* Active Challenge */}
            {activeChallenge && (
              <View style={styles.activeChallengeCard}>
                <LinearGradient
                  colors={activeChallenge.is_completed ? ['#4CAF50', '#45a049'] : ['#FF6B6B', '#FF8E53']}
                  style={styles.activeChallengeGradient}
                >
                  <View style={styles.activeChallengeHeader}>
                    <Text style={styles.activeChallengeTitle}>
                      {activeChallenge.is_completed ? '✅ Tamamlanan Challenge' : '🎯 Aktif Challenge'}
                    </Text>
                    <Text style={styles.activeChallengeIcon}>
                      {getIconForType(activeChallenge.type || '')}
                    </Text>
                  </View>
                  
                  <Text style={styles.activeChallengeName}>
                    {activeChallenge.title || 'Challenge'}
                  </Text>
                  <Text style={styles.activeChallengeDescription}>
                    {activeChallenge.description || 'Açıklama yok'}
                  </Text>
                  
                  <View style={styles.activeChallengeProgress}>
                    <View style={styles.progressInfo}>
                      <Text style={styles.progressText}>
                        {activeChallenge.current_progress}/{activeChallenge.target_progress} gün
                      </Text>
                      <Text style={styles.progressPercentage}>
                        %{Math.round((activeChallenge.current_progress / activeChallenge.target_progress) * 100)}
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            width: `${(activeChallenge.current_progress / activeChallenge.target_progress) * 100}%` 
                          }
                        ]} 
                      />
                    </View>
                  </View>
                  
                  {!activeChallenge.is_completed && (
                    <TouchableOpacity 
                      style={styles.updateProgressButton}
                      onPress={handleUpdateProgress}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                      <Text style={styles.updateProgressText}>Bugün Tamamladım!</Text>
                    </TouchableOpacity>
                  )}
                  
                  <View style={styles.challengeInfo}>
                    <Text style={styles.challengeInfoText}>
                      🎁 Ödül: +{activeChallenge.xp_reward} XP
                    </Text>
                    {!activeChallenge.is_completed && (
                      <Text style={styles.challengeInfoText}>
                        ⏱️ Kalan: {Math.max(0, Math.ceil((new Date(activeChallenge.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} gün
                      </Text>
                    )}
                  </View>
                </LinearGradient>
              </View>
            )}

            {/* Available Challenges */}
            <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>Mevcut Challenges</Text>
              {challenges.map((challenge) => {
                const isUnavailable = !!(activeChallenge && !activeChallenge.is_completed);
                return (
                  <View 
                    key={challenge.id} 
                    style={[
                      styles.challengeCard,
                      isUnavailable && styles.challengeCardDisabled
                    ]}
                  >
                    <LinearGradient
                      colors={getDifficultyColor(challenge.difficulty)}
                      style={[
                        styles.challengeGradient,
                        isUnavailable && styles.challengeGradientDisabled
                      ]}
                    >
                      <View style={styles.challengeHeader}>
                        <View style={styles.challengeIconContainer}>
                          <Text style={styles.challengeIcon}>
                            {getIconForType(challenge.type)}
                          </Text>
                        </View>
                        <View style={styles.challengeHeaderInfo}>
                          <Text style={styles.challengeTitle}>{challenge.title}</Text>
                          <View style={styles.challengeBadges}>
                            <View style={styles.difficultyBadge}>
                              <Text style={styles.difficultyText}>
                                {getDifficultyText(challenge.difficulty)}
                              </Text>
                            </View>
                            <View style={styles.durationBadge}>
                              <Text style={styles.durationText}>
                                {challenge.target_days} gün
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                      
                      <Text style={styles.challengeDescription}>
                        {challenge.description}
                      </Text>
                      
                      <View style={styles.challengeFooter}>
                        <View style={styles.rewardInfo}>
                          <Ionicons name="star" size={16} color="#FFD700" />
                          <Text style={styles.rewardText}>+{challenge.xp_reward} XP</Text>
                        </View>
                        
                        <TouchableOpacity
                          style={[
                            styles.acceptButton,
                            isUnavailable && styles.acceptButtonDisabled
                          ]}
                          onPress={() => handleAcceptChallenge(challenge)}
                          disabled={isUnavailable}
                        >
                          <Text style={[
                            styles.acceptButtonText,
                            isUnavailable && styles.acceptButtonTextDisabled
                          ]}>
                            {isUnavailable ? 'Aktif Challenge Var' : 'Kabul Et'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  </View>
                );
              })}
              
              {challenges.length === 0 && !isLoading && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    Henüz challenge yok. Yakında yeni challenges eklenecek! 🚀
                  </Text>
                </View>
              )}
            </View>
              </>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        </SafeAreaView>
        
        {/* Room Creation/Join Modal - Improved Design */}
        <Modal
          visible={showRoomModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowRoomModal(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>🎮 Arkadaş Odası</Text>
                <Text style={styles.modalSubtitle}>Arkadaşlarınla özel oyun oda</Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseButton, {
                  padding: 12,
                  borderRadius: 24,
                  backgroundColor: '#f8f9fa',
                  minWidth: 48,
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                }]}
                onPress={() => {
                  console.log('Close button pressed!');
                  setShowRoomModal(false);
                }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Current Game Info */}
              {selectedGameType && (
                <View style={styles.selectedGameCard}>
                  <LinearGradient
                    colors={getGameInfo(selectedGameType).color}
                    style={styles.selectedGameGradient}
                  >
                    <Text style={styles.selectedGameIcon}>{getGameInfo(selectedGameType).icon}</Text>
                    <Text style={styles.selectedGameTitle}>{getGameInfo(selectedGameType).title}</Text>
                    <Text style={styles.selectedGameDesc}>{getGameInfo(selectedGameType).description}</Text>
                  </LinearGradient>
                </View>
              )}

              {/* Player Name Input */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>👤 Oyuncu Adın</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.1)' : '#f8f9fa',
                    color: theme.textColor,
                    borderColor: theme.accentColor 
                  }]}
                  value={playerName}
                  onChangeText={setPlayerName}
                  placeholder="Oyuncu adınızı girin"
                  placeholderTextColor={theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.5)' : '#6c757d'}
                  maxLength={20}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.roomActionSection}>
                <TouchableOpacity
                  style={[styles.primaryRoomButton, { backgroundColor: '#4CAF50' }]}
                  onPress={createRoom}
                  disabled={!playerName.trim()}
                >
                  <Ionicons name="add-circle" size={24} color="white" />
                  <Text style={styles.primaryRoomButtonText}>Yeni Oda Oluştur</Text>
                  <Text style={styles.primaryRoomButtonSubtext}>Arkadaşların katılabilir</Text>
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>veya</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Join Room Section */}
              <View style={styles.joinRoomSection}>
                <Text style={styles.sectionTitle}>🔗 Mevcut Odaya Katıl</Text>
                
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Oda Kodu</Text>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.1)' : '#f8f9fa',
                      color: theme.textColor,
                      borderColor: theme.accentColor,
                      textAlign: 'center',
                      fontSize: 18,
                      fontWeight: 'bold',
                      letterSpacing: 2
                    }]}
                    value={roomCode}
                    onChangeText={setRoomCode}
                    placeholder="ABC123"
                    placeholderTextColor={theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.5)' : '#6c757d'}
                    autoCapitalize="characters"
                    maxLength={6}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.secondaryRoomButton, { 
                    backgroundColor: '#2196F3',
                    opacity: (!playerName.trim() || !roomCode.trim()) ? 0.5 : 1
                  }]}
                  onPress={joinRoom}
                  disabled={!playerName.trim() || !roomCode.trim()}
                >
                  <Ionicons name="enter" size={20} color="white" />
                  <Text style={styles.secondaryRoomButtonText}>Odaya Katıl</Text>
                </TouchableOpacity>
              </View>

              {/* Available Rooms */}
              <View style={styles.availableRoomsSection}>
                <Text style={styles.sectionTitle}>🏠 Mevcut Odalar</Text>
                
                {gameRooms.length > 0 ? (
                  <View style={styles.roomsList}>
                    {gameRooms.filter(room => room.status === 'waiting').slice(0, 5).map((room) => (
                      <TouchableOpacity
                        key={room.id}
                        style={styles.roomCard}
                        onPress={() => {
                          setRoomCode(room.room_code);
                        }}
                      >
                        <View style={styles.roomCardContent}>
                          <View style={styles.roomCardHeader}>
                            <Text style={styles.roomGameIcon}>{getGameInfo(room.game_type as GameType).icon}</Text>
                            <View style={styles.roomInfo}>
                              <Text style={styles.roomName}>{getGameInfo(room.game_type as GameType).title}</Text>
                              <Text style={styles.roomDetails}>Host: {room.host_name}</Text>
                            </View>
                            <View style={styles.roomStatus}>
                              <Text style={styles.roomStatusText}>{room.current_players}/{room.max_players} oyuncu</Text>
                              <Text style={styles.roomStatusText}>{room.players?.filter(p => p.is_ready).length || 0}/2 hazır</Text>
                            </View>
                            <TouchableOpacity style={styles.roomJoinButton} onPress={() => {
                              setRoomCode(room.room_code);
                              setPlayerName(playerName);
                              setShowRoomModal(true);
                            }}>
                              <Text style={styles.roomJoinButtonText}>Katıl</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyRooms}>
                    <Text style={styles.emptyRoomsIcon}>🎮</Text>
                    <Text style={styles.emptyRoomsText}>Henüz aktif oda yok</Text>
                    <Text style={styles.emptyRoomsSubtext}>İlk odayı sen oluştur!</Text>
                  </View>
                )}
              </View>

              <View style={styles.roomModalInfo}>
                <Text style={styles.roomModalInfoText}>
                  💡 Oda oluşturup arkadaşlarınla özel oyunlar oynayabilirsin!
                </Text>
                <Text style={styles.roomModalInfoText}>
                  🔄 Sayfa yenilendiğinde yeni odalar görünür.
                </Text>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </SafeAreaView>
        </Modal>
        
        {/* Rewards Shop Modal */}
        <Modal
          visible={showRewardsModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>🏪 XP Mağazası</Text>
                <Text style={styles.modalSubtitle}>Ödüllerini keşfet ve satın al</Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseButton, {
                  padding: 12,
                  borderRadius: 24,
                  backgroundColor: '#f8f9fa',
                  minWidth: 48,
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                }]}
                onPress={() => {
                  console.log('Rewards modal close button pressed!');
                  setShowRewardsModal(false);
                }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {rewardsData && (
              <View style={styles.modalContent}>
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  style={styles.userXpCard}
                >
                  <View style={styles.userXpContent}>
                    <Text style={styles.userXpLabel}>Mevcut XP Bakiyeniz</Text>
                    <Text style={styles.userXpAmount}>{rewardsData.userXP.toLocaleString()}</Text>
                    <Text style={styles.userXpSubtext}>XP kazanmak için challenge'ları tamamlayın</Text>
                  </View>
                  <View style={styles.xpIcon}>
                    <Ionicons name="star" size={32} color="#FFD700" />
                  </View>
                </LinearGradient>
                
                <ScrollView style={styles.rewardsScrollView} showsVerticalScrollIndicator={false}>
                  {/* Group rewards by category */}
                  {rewardsData.categories.map((category) => {
                    const categoryRewards = rewardsData.rewards.filter(r => r.category === category);
                    if (categoryRewards.length === 0) return null;
                    
                    return (
                      <View key={category} style={styles.categorySection}>
                        <Text style={styles.categoryTitle}>
                          {getCategoryIcon(category)} {getCategoryName(category)}
                        </Text>
                        
                        <View style={styles.categoryRewards}>
                          {categoryRewards.map((reward) => (
                            <View key={reward.id} style={styles.rewardCard}>
                              <View style={styles.rewardCardInner}>
                                <View style={styles.rewardCardHeader}>
                                  <View style={styles.rewardIconContainer}>
                                    <Text style={styles.rewardIcon}>{getRewardIcon(reward.icon)}</Text>
                                  </View>
                                  <View style={styles.rewardMainInfo}>
                                    <Text style={styles.rewardName}>{reward.name}</Text>
                                    <Text style={styles.rewardDescription} numberOfLines={2}>
                                      {reward.description}
                                    </Text>
                                  </View>
                                </View>
                                
                                <View style={styles.rewardCardFooter}>
                                  <View style={styles.costContainer}>
                                    <Ionicons name="star" size={16} color="#FFD700" />
                                    <Text style={styles.rewardCost}>{reward.xp_cost.toLocaleString()} XP</Text>
                                  </View>
                                  
                                  <TouchableOpacity
                                    style={[
                                      styles.purchaseButton,
                                      reward.is_purchased && styles.purchaseButtonPurchased,
                                      (!reward.is_purchased && rewardsData.userXP < reward.xp_cost) && styles.purchaseButtonDisabled
                                    ]}
                                    onPress={() => purchaseReward(reward.id, reward.name, reward.xp_cost)}
                                    disabled={reward.is_purchased || rewardsData.userXP < reward.xp_cost}
                                  >
                                    {reward.is_purchased ? (
                                      <Ionicons name="checkmark" size={16} color="#fff" />
                                    ) : (
                                      <Ionicons name="card" size={16} color="#fff" />
                                    )}
                                    <Text style={styles.purchaseButtonText}>
                                      {reward.is_purchased ? 'Satın Alındı' : 'Satın Al'}
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                  
                  {rewardsData.rewards.length === 0 && (
                    <View style={styles.emptyRewards}>
                      <Text style={styles.emptyRewardsIcon}>🎁</Text>
                      <Text style={styles.emptyRewardsText}>Henüz ödül bulunmuyor</Text>
                      <Text style={styles.emptyRewardsSubtext}>Yakında yeni ödüller eklenecek!</Text>
                    </View>
                  )}
                  
                  <View style={{ height: 20 }} />
                </ScrollView>
              </View>
            )}
          </SafeAreaView>
        </Modal>
        
        {/* Leaderboard Modal */}
        <Modal
          visible={showLeaderboardModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🏆 Liderlik Tablosu</Text>
              <TouchableOpacity
                style={[styles.modalCloseButton, {
                  padding: 12,
                  borderRadius: 24,
                  backgroundColor: '#f8f9fa',
                  minWidth: 48,
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                }]}
                onPress={() => {
                  console.log('Leaderboard modal close button pressed!');
                  setShowLeaderboardModal(false);
                }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {leaderboardData && (
              <View style={styles.modalContent}>
                {leaderboardData.userRank && (
                  <View style={styles.userRankDisplay}>
                    <Text style={styles.userRankText}>Sıralamanız: #{leaderboardData.userRank}</Text>
                  </View>
                )}
                
                <ScrollView style={styles.leaderboardScrollView}>
                  {leaderboardData.leaderboard.map((entry, index) => (
                    <View key={entry.user_id} style={styles.leaderboardItem}>
                      <View style={styles.rankContainer}>
                        <Text style={styles.rankText}>#{entry.rank}</Text>
                        {index < 3 && (
                          <Text style={styles.rankIcon}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          </Text>
                        )}
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{entry.full_name || entry.username}</Text>
                        <Text style={styles.userLevel}>Level {entry.level}</Text>
                      </View>
                      <Text style={styles.userXpAmount}>{entry.total_xp} XP</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </SafeAreaView>
        </Modal>
        
        {/* My Rewards Modal */}
        <Modal
          visible={showMyRewardsModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>🏅 Ödüllerim</Text>
                <Text style={styles.modalSubtitle}>Satın aldığınız ödüller ve özellikler</Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseButton, {
                  padding: 12,
                  borderRadius: 24,
                  backgroundColor: '#f8f9fa',
                  minWidth: 48,
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                }]}
                onPress={() => {
                  console.log('My rewards modal close button pressed!');
                  setShowMyRewardsModal(false);
                }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <ScrollView style={styles.rewardsScrollView} showsVerticalScrollIndicator={false}>
                {userRewards.length > 0 ? (
                  <View style={styles.myRewardsGrid}>
                    {userRewards.map((reward) => (
                      <View key={reward.id} style={styles.myRewardCard}>
                        <LinearGradient
                          colors={['#FFD700', '#FFA500']}
                          style={styles.myRewardGradient}
                        >
                          <View style={styles.myRewardHeader}>
                            <Text style={styles.myRewardIcon}>{getRewardIcon(reward.icon)}</Text>
                            <View style={styles.myRewardBadge}>
                              <Text style={styles.myRewardBadgeText}>SAHIP</Text>
                            </View>
                          </View>
                          
                          <Text style={styles.myRewardName}>{reward.name}</Text>
                          <Text style={styles.myRewardDescription} numberOfLines={2}>
                            {reward.description}
                          </Text>
                          
                          <View style={styles.myRewardFooter}>
                            <Text style={styles.myRewardCategory}>
                              {reward.category === 'avatar' && '👤 Avatar'}
                              {reward.category === 'theme' && '🎨 Tema'}
                              {reward.category === 'badge' && '🏅 Rozet'}
                              {reward.category === 'feature' && '⚡ Özellik'}
                              {reward.category === 'discount' && '💰 İndirim'}
                            </Text>
                            <Text style={styles.myRewardDate}>
                              {new Date(reward.purchased_at).toLocaleDateString('tr-TR')}
                            </Text>
                          </View>
                        </LinearGradient>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyMyRewards}>
                    <Text style={styles.emptyMyRewardsIcon}>🎁</Text>
                    <Text style={styles.emptyMyRewardsText}>Henüz ödülünüz yok</Text>
                    <Text style={styles.emptyMyRewardsSubtext}>
                      XP kazanın ve mağazadan ödül satın alın!
                    </Text>
                    <TouchableOpacity
                      style={styles.goToShopButton}
                      onPress={() => {
                        setShowMyRewardsModal(false);
                        loadRewardsShop();
                        setShowRewardsModal(true);
                      }}
                    >
                      <Ionicons name="storefront" size={16} color="#fff" />
                      <Text style={styles.goToShopButtonText}>Mağazaya Git</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 20,
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
  },
  quickActionButton: {
    flex: 1,
    minWidth: width / 2 - 24,
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  quickActionGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 8,
  },

  // XP Related Styles
  xpRewardListItemProgressBar: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  xpRewardListItemProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  xpRewardListItemProgressPercentage: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  xpRewardListItemProgressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  currentRoomCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  currentRoomGradient: {
    padding: 12,
  },
  roomHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomTitleSection: {
    flex: 1,
  },
  currentRoomTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  roomCode: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  playersList: {
    marginTop: 8,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  playerName: {
    fontSize: 12,
    color: '#fff',
    flex: 1,
  },
  playerStatus: {
    fontSize: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  roomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  challengeCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  challengeCardDisabled: {
    opacity: 0.6,
  },
  challengeGradient: {
    padding: 16,
  },
  challengeGradientDisabled: {
    opacity: 0.8,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  challengeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeIcon: {
    fontSize: 20,
  },
  challengeHeaderInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  challengeDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 16,
  },
  challengeProgress: {
    marginTop: 12,
  },
  challengeProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  challengeProgressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  challengeProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  challengeProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  xpRewardsList: {
    marginTop: 16,
  },
  xpRewardsListTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  xpRewardListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  xpRewardListItemIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  xpRewardListItemInfo: {
    flex: 1,
  },
  xpRewardListItemTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  xpRewardListItemDescription: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },
  xpRewardListItemProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  xpRewardListItemProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  xpRewardListItemProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  xpRewardListItemProgressPercentage: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  xpRewardListItemProgressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },

  // Game Screen Styles
  gameContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  gameScreenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  gameScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  progressContainer: {
    marginBottom: 16,
  },
  gameProgressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  gameTimer: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  questionContainer: {
    marginBottom: 24,
  },
  questionNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionButtonSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
    borderWidth: 1,
  },
  optionButtonCorrect: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  optionButtonWrong: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
    borderWidth: 1,
  },
  optionText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  optionIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIndexText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },

  // Food Guessing Game Styles
  foodContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  foodEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  foodName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  guessPrompt: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  guessInputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  guessInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
  },
  guessButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  guessButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    marginTop: 24,
  },
  resultText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#000',
  },
  resultCorrect: {
    color: '#4CAF50',
  },
  resultWrong: {
    color: '#F44336',
  },

  // Points Display
  pointsEarned: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 16,
  },

  // Math Game Styles
  mathContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mathProblem: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 24,
  },
  mathInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    color: '#000',
    width: '100%',
    textAlign: 'center',
    marginBottom: 16,
  },
  mathButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  mathButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Word Game Styles
  wordGameContainer: {
    flex: 1,
    padding: 16,
  },
  wordCategory: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  wordHint: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  foundWordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  foundWord: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  foundWordText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
  },
  wordInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  wordInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  submitWordButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 12,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitWordButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Word Game List Styles
  foundWordsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  foundWordsList: {
    marginBottom: 24,
  },

  // Game Screen Layout
  backgroundGradient: {
    flex: 1,
  },
  safeAreaContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
  },
  gameTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },

  // Header Styles
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },

  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },

  // Content
  scrollView: {
    flex: 1,
  },

  // XP Card Styles
  xpCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  xpGradient: {
    padding: 16,
  },
  xpContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  xpInfo: {
    flex: 1,
  },
  xpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  xpText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  xpProgressContainer: {
    marginTop: 12,
  },
  xpProgressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  xpProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },

  // Room Status Styles
  roomStatusSection: {
    marginBottom: 16,
  },
  playerCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  readyCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },

  // Room Action Buttons
  roomActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  readyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  readyButtonActive: {
    backgroundColor: '#4CAF50',
  },
  readyButtonInactive: {
    backgroundColor: '#F44336',
  },
  readyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  startGameButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  startGameText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Leave Room Button
  leaveRoomButton: {
    backgroundColor: '#F44336',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  leaveRoomText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Games Grid
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    padding: 16,
  },
  gameCard: {
    flex: 1,
    minWidth: width / 2 - 24,
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gameCardGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  gameIcon: {
    fontSize: 32,
    color: '#fff',
    marginBottom: 8,
  },
  gameDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  gameStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gameXP: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  playersOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  playersCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },

  // XP Actions
  xpActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  activeChallengeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  activeChallengeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  activeChallengeDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
  },
  activeChallengeProgress: {
    marginTop: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  // Progress Bar
  progressText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  progressPercentage: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },

  // Update Progress Button
  updateProgressButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  updateProgressText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Challenge Info
  challengeInfo: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  challengeInfoText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },

  // Challenge Badges
  challengeBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  difficultyBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  difficultyText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  durationBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },

  // Challenge Footer
  challengeFooter: {
    marginTop: 16,
  },
  rewardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rewardText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },

  // Active Challenge Title
  activeChallengeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },

  // Accept Button
  acceptButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  acceptButtonDisabled: {
    opacity: 0.5,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  acceptButtonTextDisabled: {
    color: 'rgba(255,255,255,0.6)',
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitleContainer: {
    flex: 1,
  },

  // Modal Title
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  modalCloseButton: {
    padding: 8,
    marginRight: -8,
  },
  modalContent: {
    flex: 1,
  },

  // Selected Game Card
  selectedGameCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  selectedGameGradient: {
    padding: 20,
  },
  selectedGameIcon: {
    fontSize: 48,
    color: '#fff',
    marginBottom: 16,
  },
  selectedGameTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  selectedGameDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },

  // Input Section
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
  },

  // Room Actions
  roomActionSection: {
    marginTop: 24,
  },
  primaryRoomButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  primaryRoomButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryRoomButtonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 12,
  },

  // Join Room Section
  joinRoomSection: {
    marginTop: 24,
  },
  secondaryRoomButton: {
    backgroundColor: 'rgba(33,150,243,0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  secondaryRoomButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },

  // Available Rooms
  availableRoomsSection: {
    marginTop: 24,
  },
  roomsList: {
    marginTop: 16,
  },
  roomCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  roomCardContent: {
    padding: 16,
  },
  roomCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  roomGameIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(33,150,243,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roomGameIconText: {
    fontSize: 20,
    color: '#2196F3',
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  roomDetails: {
    fontSize: 12,
    color: '#666',
  },
  roomStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  roomStatusText: {
    fontSize: 12,
    color: '#666',
  },
  roomJoinButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  roomJoinButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty Rooms
  emptyRooms: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyRoomsIcon: {
    fontSize: 48,
    color: '#666',
    marginBottom: 16,
  },
  emptyRoomsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyRoomsSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

  // Room Modal Info
  roomModalInfo: {
    backgroundColor: 'rgba(33,150,243,0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  roomModalInfoText: {
    fontSize: 14,
    color: '#2196F3',
    lineHeight: 20,
  },

  // User XP Card
  userXpCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userXpContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  // User XP Details
  userXpLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  userXpAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  userXpSubtext: {
    fontSize: 12,
    color: '#666',
  },
  xpIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(76,175,80,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Rewards
  rewardsScrollView: {
    paddingHorizontal: 16,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  categoryRewards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  rewardCard: {
    width: width / 2 - 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  rewardCardInner: {
    flex: 1,
  },
  rewardCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rewardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(33,150,243,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rewardIcon: {
    fontSize: 20,
    color: '#2196F3',
  },
  rewardMainInfo: {
    flex: 1,
  },
  rewardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  rewardCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  costContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Purchase Button
  rewardCost: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  purchaseButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  purchaseButtonPurchased: {
    backgroundColor: '#E0E0E0',
  },
  purchaseButtonDisabled: {
    backgroundColor: '#E0E0E0',
    opacity: 0.5,
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty Rewards
  emptyRewards: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyRewardsIcon: {
    fontSize: 48,
    color: '#666',
    marginBottom: 16,
  },
  emptyRewardsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyRewardsSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

  // Add missing XP Action styles
  xpActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  xpActionButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  xpActionButtonDisabled: {
    opacity: 0.5,
  },
  xpActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },

  // Add missing Active Challenge styles
  activeChallengeCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  activeChallengeGradient: {
    padding: 20,
  },
  activeChallengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  // Add missing leaderboard styles
  userRankDisplay: {
    backgroundColor: 'rgba(33,150,243,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  userRankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  leaderboardScrollView: {
    flex: 1,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  rankContainer: {
    width: 60,
    alignItems: 'center',
    marginRight: 16,
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  rankIcon: {
    fontSize: 24,
    marginTop: 4,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userLevel: {
    fontSize: 14,
    color: '#666',
  },

  // Add missing My Rewards styles
  myRewardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  myRewardCard: {
    width: width / 2 - 24,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  myRewardGradient: {
    padding: 16,
  },
  myRewardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  myRewardIcon: {
    fontSize: 24,
    color: '#fff',
  },
  myRewardBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  myRewardBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  myRewardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  myRewardDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 16,
    marginBottom: 12,
  },
  myRewardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  myRewardCategory: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  myRewardDate: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },

  // Add missing empty my rewards styles
  emptyMyRewards: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyMyRewardsIcon: {
    fontSize: 64,
    color: '#ccc',
    marginBottom: 16,
  },
  emptyMyRewardsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMyRewardsSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  goToShopButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  goToShopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 