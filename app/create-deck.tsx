import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import syncManager from "../utils/syncManager";
import userDecks from "../utils/userDecks";

export default function CreateDeck() {
  const router = useRouter();
  const { deckId, edit } = useLocalSearchParams();
  const isEditing = edit === 'true';
  const [deckName, setDeckName] = useState("");
  const [pomodoroHours, setPomodoroHours] = useState(0);
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [restHours, setRestHours] = useState(0);
  const [restMinutes, setRestMinutes] = useState(5);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isEditing && deckId) {
      loadDeck();
    }
  }, []);

  const loadDeck = async () => {
    try {
      const decks = await AsyncStorage.getItem('decks');
      if (decks) {
        const decksList = JSON.parse(decks);
        const deck = decksList.find((d: any) => d.id === deckId);
        if (deck) {
          setDeckName(deck.name);
          const pomHours = Math.floor((deck.pomodoroMinutes || 0) / 60);
          const pomMins = (deck.pomodoroMinutes || 0) % 60;
          const restHrs = Math.floor((deck.restMinutes || 0) / 60);
          const restMins = (deck.restMinutes || 0) % 60;
          setPomodoroHours(pomHours);
          setPomodoroMinutes(pomMins);
          setRestHours(restHrs);
          setRestMinutes(restMins);
        }
      }
    } catch (error) {
      console.error('Error loading deck:', error);
    }
  };

  const handleCreate = async () => {
    if (!deckName.trim()) {
      Alert.alert('Error', 'Please enter a deck name');
      return;
    }

    const pomodoroTime = pomodoroHours * 60 + pomodoroMinutes;
    const restTime = restHours * 60 + restMinutes;

    if (pomodoroTime <= 0) {
      Alert.alert('Error', 'Pomodoro timer must be greater than 0');
      return;
    }

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/');
        return;
      }

      const newDeck = {
        name: deckName.trim(),
        pomodoroMinutes: pomodoroTime,
        restMinutes: restTime,
        cards: []
      };

      const decks = await AsyncStorage.getItem('decks');
      const decksList = decks ? JSON.parse(decks) : [];
      
      if (isEditing && deckId) {
        const deckIndex = decksList.findIndex((d: any) => d.id === deckId);
        if (deckIndex !== -1) {
          decksList[deckIndex] = {
            ...decksList[deckIndex],
            name: deckName.trim(),
            pomodoroMinutes: pomodoroTime,
            restMinutes: restTime,
          };
          await syncManager.queueSync('deck', 'update', decksList[deckIndex], deckId as string);
        }
      } else {
        const newDeckWithId = { ...newDeck, id: Date.now().toString() };
        decksList.push(newDeckWithId);
        await syncManager.queueSync('deck', 'create', newDeckWithId);
      }
      
      await userDecks.saveCurrentUserDecks(decksList);

      if (isEditing) {
        router.push({
          pathname: '/create-card',
          params: { deckId: deckId as string }
        });
      } else {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          router.push({
            pathname: '/create-card',
            params: { deckId: decksList[decksList.length - 1].id }
          });
        }, 1500);
      }
    } catch (error) {
      console.error('Error creating deck:', error);
      Alert.alert('Error', 'Failed to create deck');
    } finally {
      setIsLoading(false);
    }
  };

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
        <Text style={styles.label}>Deck Name</Text>
        <TextInput
          style={styles.input}
          value={deckName}
          onChangeText={setDeckName}
          placeholder="Enter deck name"
          placeholderTextColor="#999"
        />

        <Text style={styles.sectionTitle}>Pomodoro Timer</Text>
        <View style={styles.timerRow}>
          <View style={styles.timerGroup}>
            <Text style={styles.timerLabel}>Hour</Text>
            <ScrollView 
              style={styles.pickerScroll}
              contentContainerStyle={styles.pickerScrollContent}
              showsVerticalScrollIndicator={false}
              snapToInterval={40}
              decelerationRate="fast"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.pickerItem,
                    pomodoroHours === i && styles.pickerItemSelected
                  ]}
                  onPress={() => setPomodoroHours(i)}
                >
                  <Text style={[
                    styles.pickerItemText,
                    pomodoroHours === i && styles.pickerItemTextSelected
                  ]}>
                    {i}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.timerGroup}>
            <Text style={styles.timerLabel}>Minutes</Text>
            <ScrollView 
              style={styles.pickerScroll}
              contentContainerStyle={styles.pickerScrollContent}
              showsVerticalScrollIndicator={false}
              snapToInterval={40}
              decelerationRate="fast"
            >
              {Array.from({ length: 60 }, (_, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.pickerItem,
                    pomodoroMinutes === i && styles.pickerItemSelected
                  ]}
                  onPress={() => setPomodoroMinutes(i)}
                >
                  <Text style={[
                    styles.pickerItemText,
                    pomodoroMinutes === i && styles.pickerItemTextSelected
                  ]}>
                    {i}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Rest</Text>
        <View style={styles.timerRow}>
          <View style={styles.timerGroup}>
            <Text style={styles.timerLabel}>Hour</Text>
            <ScrollView 
              style={styles.pickerScroll}
              contentContainerStyle={styles.pickerScrollContent}
              showsVerticalScrollIndicator={false}
              snapToInterval={40}
              decelerationRate="fast"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.pickerItem,
                    restHours === i && styles.pickerItemSelected
                  ]}
                  onPress={() => setRestHours(i)}
                >
                  <Text style={[
                    styles.pickerItemText,
                    restHours === i && styles.pickerItemTextSelected
                  ]}>
                    {i}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.timerGroup}>
            <Text style={styles.timerLabel}>Minutes</Text>
            <ScrollView 
              style={styles.pickerScroll}
              contentContainerStyle={styles.pickerScrollContent}
              showsVerticalScrollIndicator={false}
              snapToInterval={40}
              decelerationRate="fast"
            >
              {Array.from({ length: 60 }, (_, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.pickerItem,
                    restMinutes === i && styles.pickerItemSelected
                  ]}
                  onPress={() => setRestMinutes(i)}
                >
                  <Text style={[
                    styles.pickerItemText,
                    restMinutes === i && styles.pickerItemTextSelected
                  ]}>
                    {i}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.createButton, isLoading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={isLoading}
        >
          <Text style={styles.createButtonText}>
            {isLoading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update' : 'Create')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Image 
              source={require('../assets/cramodoro-assets/check-icon.png')} 
              style={styles.checkIcon}
              resizeMode="contain"
            />
            <Text style={styles.successText}>{isEditing ? 'Deck updated!' : 'Deck created!'}</Text>
          </View>
        </View>
      </Modal>
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
    width: '25%',
    aspectRatio: 1,
    maxWidth: 100,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 10,
    marginTop: 10,
  },
  input: {
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#000',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 15,
    marginTop: 20,
  },
  timerRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 10,
  },
  timerGroup: {
    flex: 1,
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  pickerScroll: {
    maxHeight: 160,
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  pickerScrollContent: {
    paddingVertical: 60,
  },
  pickerItem: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  pickerItemSelected: {
    backgroundColor: '#2196F3',
  },
  pickerItemText: {
    fontSize: 18,
    color: '#666',
  },
  pickerItemTextSelected: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  createButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    minWidth: 250,
  },
  checkIcon: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  successText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2196F3',
  },
});
