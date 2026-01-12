import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import syncManager from "../utils/syncManager";
import userDecks from "../utils/userDecks";

export default function AddCard() {
  const router = useRouter();
  const { deckId, cardIndex } = useLocalSearchParams();
  const [deck, setDeck] = useState<any>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = cardIndex !== undefined;

  useEffect(() => {
    loadDeck();
  }, []);

  const loadDeck = async () => {
    try {
      const decks = await AsyncStorage.getItem('decks');
      if (decks) {
        const decksList = JSON.parse(decks);
        const currentDeck = decksList.find((d: any) => d.id === deckId);
        if (currentDeck) {
          setDeck(currentDeck);
          if (isEditing && currentDeck.cards) {
            const card = currentDeck.cards[parseInt(cardIndex as string)];
            if (card) {
              setQuestion(card.question);
              setAnswer(card.answer);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading deck:', error);
    }
  };

  const handleSave = async () => {
    if (!question.trim()) {
      Alert.alert('Error', 'Please enter a question');
      return;
    }
    if (!answer.trim()) {
      Alert.alert('Error', 'Please enter an answer');
      return;
    }

    setIsLoading(true);
    try {
      const decks = await AsyncStorage.getItem('decks');
      if (decks) {
        const decksList = JSON.parse(decks);
        const deckIdx = decksList.findIndex((d: any) => d.id === deckId);
        
        if (deckIdx !== -1) {
          if (!decksList[deckIdx].cards) {
            decksList[deckIdx].cards = [];
          }

          const newCard = {
            question: question.trim(),
            answer: answer.trim()
          };

          if (isEditing) {
            decksList[deckIdx].cards[parseInt(cardIndex as string)] = newCard;
            await syncManager.queueSync('card', 'update', newCard, deckId as string);
          } else {
            decksList[deckIdx].cards.push(newCard);
            await syncManager.queueSync('card', 'create', newCard, deckId as string);
          }

          await userDecks.saveCurrentUserDecks(decksList);
          router.back();
        }
      }
    } catch (error) {
      console.error('Error saving card:', error);
      Alert.alert('Error', 'Failed to save card');
    } finally {
      setIsLoading(false);
    }
  };

  if (!deck) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Image 
          source={require('../assets/cramodoro-assets/homescreen-icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.deckName}>{deck.name}</Text>
        
        <Text style={styles.sectionTitle}>Cards</Text>

        <View style={styles.cardContainer}>
          <View style={styles.combinedCard}>
            <TextInput
              style={styles.questionInput}
              value={question}
              onChangeText={setQuestion}
              placeholder="Enter question"
              placeholderTextColor="rgba(255,255,255,0.6)"
              multiline
            />
            <View style={styles.dividerLine} />
            <TextInput
              style={styles.answerInput}
              value={answer}
              onChangeText={setAnswer}
              placeholder="Enter answer"
              placeholderTextColor="rgba(255,255,255,0.6)"
              multiline
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, isLoading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
    width: 80,
    height: 40,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  deckName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 20,
  },
  cardContainer: {
    marginBottom: 30,
  },
  combinedCard: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    overflow: 'hidden',
  },
  questionInput: {
    padding: 20,
    fontSize: 16,
    color: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#fff',
    marginHorizontal: 20,
  },
  answerInput: {
    padding: 20,
    fontSize: 16,
    color: '#fff',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  saveButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
