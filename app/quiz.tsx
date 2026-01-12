import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { userAPI } from "../api/api";
import localAuth from "../utils/localAuth";
import userDecks from "../utils/userDecks";
export default function Quiz() {
  const router = useRouter();
  const { deckId } = useLocalSearchParams();
  const [deck, setDeck] = useState<any>(null);
  const [shuffledCards, setShuffledCards] = useState<any[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [typedChars, setTypedChars] = useState("");
  const [streak, setStreak] = useState(0);
  const [showStreak, setShowStreak] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [attemptsByCard, setAttemptsByCard] = useState<{[key: number]: number}>({});
  const [failedCards, setFailedCards] = useState<number[]>([]);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [retryQueue, setRetryQueue] = useState<number[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timeSeconds, setTimeSeconds] = useState(0);
  const [isRestTime, setIsRestTime] = useState(false);
  const [showRestModal, setShowRestModal] = useState(false);
  const [pomodoroMinutes, setPomodoroMinutes] = useState(0);
  const [restMinutes, setRestMinutes] = useState(0);
  const [profilePic, setProfilePic] = useState(require('../assets/cramodoro-assets/defaultpfp.png'));
  const [timerSwitched, setTimerSwitched] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);
  const pomodoroMinutesRef = useRef(0);
  const restMinutesRef = useRef(0);
  
  // Update refs when minutes change
  useEffect(() => {
    pomodoroMinutesRef.current = pomodoroMinutes;
    restMinutesRef.current = restMinutes;
  }, [pomodoroMinutes, restMinutes]);

  useFocusEffect(
    useCallback(() => {
      loadDeck();
      loadProfilePic();
    }, [])
  );
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(prevMin => {
        const currentMin = prevMin;
        
        setTimeSeconds(prevSec => {
          setIsRestTime(prevRestTime => {
            setTimerSwitched(prevSwitched => {
              // Check if we hit 00:00 and haven't switched yet
              if (currentMin === 0 && prevSec === 0 && !prevSwitched) {
                if (!prevRestTime && restMinutesRef.current > 0) {
                  // Switch to rest
                  setShowRestModal(true);
                  setTimeRemaining(restMinutesRef.current);
                  setTimeSeconds(0);
                  setIsRestTime(true);
                  return true; // switched = true
                } else if (prevRestTime && pomodoroMinutesRef.current > 0) {
                  // Switch back to pomodoro
                  setShowRestModal(false);
                  setTimeRemaining(pomodoroMinutesRef.current);
                  setTimeSeconds(0);
                  setIsRestTime(false);
                  return true; // switched = true
                }
              }
              
              // Reset switched flag when timer is running
              if ((currentMin > 0 || prevSec > 0) && prevSwitched) {
                return false;
              }
              
              return prevSwitched;
            });
            return prevRestTime;
          });
          
          // Count down seconds
          if (currentMin > 0 || prevSec > 0) {
            if (prevSec > 0) {
              return prevSec - 1;
            } else if (currentMin > 0) {
              setTimeRemaining(currentMin - 1);
              return 59;
            }
          }
          
          return prevSec;
        });
        
        return currentMin;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, []); // No dependencies - use refs instead

  const fisherYatesShuffle = (array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const loadProfilePic = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        let response;
        
        if (token.startsWith('offline_')) {
          const user = await localAuth.getProfile(token);
          response = { user };
        } else {
          try {
            response = await userAPI.getProfile(token);
          } catch (backendErr) {
            const user = await localAuth.getProfile(token);
            response = { user };
          }
        }
        
        if (response.user.profilePicture) {
          setProfilePic({ uri: response.user.profilePicture });
          
          // Cache profile picture in userData for persistence
          const userData = await AsyncStorage.getItem('userData');
          if (userData) {
            const user = JSON.parse(userData);
            user.profilePicture = response.user.profilePicture;
            await AsyncStorage.setItem('userData', JSON.stringify(user));
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile picture:', error);
    }
  };

  const loadDeck = async () => {
    try {
      const decks = await AsyncStorage.getItem('decks');
      if (decks) {
        const decksList = JSON.parse(decks);
        const currentDeck = decksList.find((d: any) => d.id === deckId);
        if (currentDeck) {
          setDeck(currentDeck);
          if (!currentDeck.cards || currentDeck.cards.length === 0) {
            Alert.alert('No Cards', 'This deck has no cards yet. Add some cards first.', [
              { text: 'OK', onPress: () => router.back() }
            ]);
          } else {
            const shuffled = fisherYatesShuffle(currentDeck.cards);
            setShuffledCards(shuffled);
            
            // Set timer based on pomodoro and rest minutes
            if (currentDeck.pomodoroMinutes) {
              setPomodoroMinutes(currentDeck.pomodoroMinutes);
              setTimeRemaining(currentDeck.pomodoroMinutes);
              setTimeSeconds(0);
            }
            if (currentDeck.restMinutes) {
              setRestMinutes(currentDeck.restMinutes);
            }
            
            // Update deck's lastUsed timestamp
            await updateDeckLastUsed(deckId as string);
          }
        }
      }
    } catch (error) {
      console.error('Error loading deck:', error);
    }
  };
  
  const updateDeckLastUsed = async (id: string) => {
    try {
      const decks = await AsyncStorage.getItem('decks');
      if (decks) {
        const decksList = JSON.parse(decks);
        const updatedDecks = decksList.map((d: any) => 
          d.id === id ? { ...d, lastUsed: new Date().toISOString() } : d
        );
        await userDecks.saveCurrentUserDecks(updatedDecks);
      }
    } catch (error) {
      console.error('Error updating deck last used:', error);
    }
  };

  const shakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };
  
  const getOrdinalSuffix = (num: number) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return num + "st";
    if (j === 2 && k !== 12) return num + "nd";
    if (j === 3 && k !== 13) return num + "rd";
    return num + "th";
  };

  const handleAnswerChange = (text: string) => {
    const correctAnswer = shuffledCards[currentCardIndex].answer;
    
    // Filter out only spaces from input (keep dashes)
    const filteredText = text.replace(/[ ]/g, '');
    
    // Count how many non-space characters we need
    const requiredChars = correctAnswer.replace(/[ ]/g, '').length;
    
    // Limit to required characters only
    const newTypedChars = filteredText.slice(0, requiredChars);
    setTypedChars(newTypedChars);
    
    // Build the display answer with auto-filled spaces
    let newAnswer = '';
    let charIndex = 0;
    
    for (let i = 0; i < correctAnswer.length; i++) {
      if (correctAnswer[i] === ' ') {
        newAnswer += ' ';
      } else {
        if (charIndex < newTypedChars.length) {
          newAnswer += newTypedChars[charIndex];
          charIndex++;
        } else {
          break;
        }
      }
    }
    
    setUserAnswer(newAnswer);
    
    // Check answer when all characters are filled
    if (charIndex === requiredChars) {
      checkAnswer(newAnswer);
    }
  };

  const checkAnswer = (answer: string) => {
    const correctAnswer = shuffledCards[currentCardIndex].answer.trim();
    const userAnswerTrimmed = answer.trim();

    if (userAnswerTrimmed === correctAnswer) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      
      if (newStreak >= 2) {
        setShowStreak(true);
        setTimeout(() => setShowStreak(false), 1500);
      }

      // Clear attempts for this card on correct answer
      const newAttemptsByCard = { ...attemptsByCard };
      delete newAttemptsByCard[currentCardIndex];
      setAttemptsByCard(newAttemptsByCard);

      setTimeout(() => {
        moveToNextCard();
      }, 500);
    } else {
      // Wrong answer - track attempts per card
      const currentAttempts = (attemptsByCard[currentCardIndex] || 0) + 1;
      const newAttemptsByCard = { ...attemptsByCard, [currentCardIndex]: currentAttempts };
      setAttemptsByCard(newAttemptsByCard);
      
      shakeAnimation();
      setStreak(0);
      
      if (currentAttempts >= 2) {
        // Second incorrect attempt - show answer
        setShowCorrectAnswer(true);
      } else {
        // First incorrect attempt - clear and move to next
        setUserAnswer("");
        setTypedChars("");
        setTimeout(() => {
          moveToNextCard();
        }, 500);
      }
    }
  };

  const moveToNextCard = () => {
    setShowCorrectAnswer(false);
    setUserAnswer("");
    setTypedChars("");
    
    if (currentCardIndex < shuffledCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      // Quiz complete - shuffle and restart
      const reshuffled = fisherYatesShuffle(shuffledCards);
      setShuffledCards(reshuffled);
      setCurrentCardIndex(0);
      // Don't reset attemptsByCard - keep tracking across loops
    }
  };

  if (!deck || shuffledCards.length === 0) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const currentCard = shuffledCards[currentCardIndex];
  const answerLength = currentCard.answer.length;

  return (
    <>
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/decks')} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Image 
          source={require('../assets/cramodoro-assets/homescreen-icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Image 
          source={profilePic} 
          style={styles.profilePic}
          resizeMode="cover"
        />
      </View>

      <View style={styles.streakBar}>
        <View style={styles.streakInfo}>
          <Image 
            source={require('../assets/cramodoro-assets/fire-streak.png')} 
            style={styles.fireIcon}
            resizeMode="contain"
          />
          <Text style={styles.streakText}>{streak}</Text>
        </View>
        <View style={styles.timerInfo}>
          <Image 
            source={require('../assets/cramodoro-assets/timer-icon.png')} 
            style={styles.timerIcon}
            resizeMode="contain"
          />
          <Text style={styles.timerText}>
            {isRestTime ? 'Rest: ' : 'Study: '}
            {String(Math.floor(timeRemaining / 60)).padStart(2, '0')}:{String(timeRemaining % 60).padStart(2, '0')}:{String(timeSeconds).padStart(2, '0')}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.cardContainer, { transform: [{ translateX: shakeAnim }] }]}>
          <View style={styles.quizCard}>
            <View style={styles.questionSection}>
              <Text style={styles.questionText}>{currentCard.question}</Text>
            </View>
            <View style={styles.dividerLine} />
            <View style={styles.answerSection}>
              {showCorrectAnswer ? (
                <>
                  <Text style={styles.correctAnswerLabel}>Correct Answer:</Text>
                  <Text style={styles.correctAnswerText}>{currentCard.answer}</Text>
                  <TouchableOpacity style={styles.gotItButton} onPress={moveToNextCard}>
                    <Text style={styles.gotItButtonText}>Got it</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity 
                    style={styles.answerInputContainer}
                    activeOpacity={1}
                    onPress={() => inputRef.current?.focus()}
                  >
                    <View style={styles.underlineWrapper}>
                      {currentCard.answer.split('').map((char: string, index: number) => {
                        if (char === ' ') {
                          return (
                            <Text key={index} style={styles.spaceChar}>
                              {' '}
                            </Text>
                          );
                        }
                        
                        // For all other characters (including dashes), show underscore if empty
                        const displayChar = (userAnswer && userAnswer[index]) ? userAnswer[index] : '_';
                        return (
                          <Text key={index} style={styles.underlinedChar}>
                            {displayChar}
                          </Text>
                        );
                      })}
                    </View>
                  </TouchableOpacity>
                  <TextInput
                    ref={inputRef}
                    style={styles.hiddenInput}
                    value={typedChars}
                    onChangeText={handleAnswerChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    editable={!isRestTime && !showCorrectAnswer}
                  />
                </>
              )}
            </View>
          </View>
        </Animated.View>
        
        <View style={styles.noteContainer}>
          <Text style={styles.noteText}>
            ⚠️ Answer must be exactly the same as how you set it up. Case sensitive
          </Text>
        </View>
      </ScrollView>
      </View>

      {showRestModal && (
        <>
          <View style={styles.restModalBackdrop} />
          <View style={styles.restModalOverlay}>
            <View style={styles.restModalContent}>
              <Text style={styles.restModalTitle}>Rest Time!</Text>
              <Text style={styles.restModalTimer}>
                {String(Math.floor(timeRemaining / 60)).padStart(2, '0')}:{String(timeRemaining % 60).padStart(2, '0')}:{String(timeSeconds).padStart(2, '0')}
              </Text>
              <Text style={styles.restModalText}>Take a break. You can exit using the arrow at the top.</Text>
            </View>
          </View>
        </>
      )}

      <Modal
        visible={showStreak}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <Image 
            source={require('../assets/cramodoro-assets/fire-streak.png')} 
            style={styles.streakFireIcon}
            resizeMode="contain"
          />
          <Text style={styles.streakModalText}>{getOrdinalSuffix(streak)} Streak!</Text>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 28,
    color: '#2196F3',
  },
  logo: {
    width: '25%',
    aspectRatio: 1,
    maxWidth: 100,
  },
  profilePic: {
    width: 35,
    height: 35,
    borderRadius: 20,
  },
  streakBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fireIcon: {
    width: 24,
    height: 24,
  },
  streakText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  timerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerIcon: {
    width: 24,
    height: 24,
  },
  timerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  cardContainer: {
    marginBottom: 30,
  },
  quizCard: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 400,
  },
  questionSection: {
    padding: 20,
    minHeight: 180,
    justifyContent: 'center',
  },
  questionText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  dividerLine: {
    height: 2,
    backgroundColor: '#fff',
  },
  answerSection: {
    padding: 20,
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  answerInputContainer: {
    width: '100%',
    paddingHorizontal: 15,
  },
  underlineWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  underlinedChar: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
    borderBottomWidth: 2,
    borderBottomColor: '#fff',
    paddingBottom: 4,
    paddingHorizontal: 4,
    marginHorizontal: 2,
    marginBottom: 8,
    minWidth: 20,
    textAlign: 'center',
  },
  spaceChar: {
    fontSize: 24,
    color: '#fff',
    paddingHorizontal: 8,
    marginHorizontal: 2,
    minWidth: 16,
  },
  dashCharDisplay: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
    paddingHorizontal: 4,
    marginHorizontal: 2,
    marginBottom: 8,
    minWidth: 20,
    textAlign: 'center',
  },
  noteContainer: {
    marginTop: 20,
    marginBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  noteText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  correctAnswerLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
  },
  correctAnswerText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '700',
    marginBottom: 30,
  },
  gotItButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
  },
  gotItButtonText: {
    color: '#2196F3',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakFireIcon: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  streakModalText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  restModalBackdrop: {
    position: 'absolute',
    top: 135,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 9,
  },
  restModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    pointerEvents: 'none',
  },
  restModalContent: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  restModalTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
  },
  restModalTimer: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
  },
  restModalText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
});
