import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { userAPI } from "../api/api";
import localAuth from "../utils/localAuth";
import syncManager from "../utils/syncManager";
import userDecks from "../utils/userDecks";

export default function CreateCard() {
  const router = useRouter();
  const { deckId } = useLocalSearchParams();
  const [deck, setDeck] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [profilePic, setProfilePic] = useState(require('../assets/cramodoro-assets/defaultpfp.png'));
  const [showSuccess, setShowSuccess] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadDeck();
      loadProfilePic();
    }, [])
  );

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
          setCards(currentDeck.cards || []);
        }
      }
    } catch (error) {
      console.error('Error loading deck:', error);
    }
  };

  const handleAddCard = () => {
    router.push({
      pathname: '/add-card',
      params: { deckId }
    });
  };

  const handleEditCard = (cardIndex: number) => {
    router.push({
      pathname: '/add-card',
      params: { deckId, cardIndex: cardIndex.toString() }
    });
  };

  const handleDeleteCard = async (cardIndex: number) => {
    Alert.alert(
      'Delete Card',
      'Are you sure you want to delete this card?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const decks = await AsyncStorage.getItem('decks');
              if (decks) {
                const decksList = JSON.parse(decks);
                const deckIndex = decksList.findIndex((d: any) => d.id === deckId);
                if (deckIndex !== -1) {
                  const deletedCard = decksList[deckIndex].cards[cardIndex];
                  decksList[deckIndex].cards.splice(cardIndex, 1);
                  await userDecks.saveCurrentUserDecks(decksList);
                  await syncManager.queueSync('card', 'delete', deletedCard, deckId as string);
                  loadDeck();
                }
              }
            } catch (error) {
              console.error('Error deleting card:', error);
              Alert.alert('Error', 'Failed to delete card');
            }
          }
        }
      ]
    );
  };

  const handleSave = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      router.push('/decks');
    }, 1500);
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
        
        <View style={styles.cardsSection}>
          <View style={styles.cardsSectionHeader}>
            <Text style={styles.cardsTitle}>Cards</Text>
            <TouchableOpacity onPress={handleAddCard} style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Add Card</Text>
            </TouchableOpacity>
          </View>

          {cards.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Deck Empty</Text>
              <Text style={styles.emptySubtext}>Start creating cards</Text>
            </View>
          ) : (
            <View style={styles.cardsList}>
              {cards.map((card, index) => (
                <View key={index} style={styles.cardItem}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardText} numberOfLines={1}>{card.question}</Text>
                    <View style={styles.cardActions}>
                      <TouchableOpacity onPress={() => handleEditCard(index)} style={styles.iconButton}>
                        <Image 
                          source={require('../assets/cramodoro-assets/edit-icon.png')} 
                          style={styles.actionIcon}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteCard(index)} style={styles.iconButton}>
                        <Image 
                          source={require('../assets/cramodoro-assets/delete-icon.png')} 
                          style={styles.actionIcon}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/home')}
        >
          <Image 
            source={require('../assets/cramodoro-assets/home.png')} 
            style={styles.navIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/decks')}
        >
          <Image 
            source={require('../assets/cramodoro-assets/cards-filled.png')} 
            style={styles.navIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/profile')}
        >
          <Image 
            source={profilePic} 
            style={styles.profileIcon}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <Image 
            source={require('../assets/cramodoro-assets/check-icon.png')} 
            style={styles.checkIcon}
            resizeMode="contain"
          />
          <Text style={styles.successText}>Deck updated!</Text>
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
  deckName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 20,
    marginTop: 10,
  },
  cardsSection: {
    marginBottom: 30,
  },
  cardsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  cardsList: {
    gap: 12,
  },
  cardItem: {
    backgroundColor: '#2196F3',
    padding: 20,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 10,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    width: 20,
    height: 20,
    tintColor: '#fff',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 100,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 40,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navIcon: {
    width: 35,
    height: 35,
  },
  profileIcon: {
    width: 35,
    height: 35,
    borderRadius: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  successText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
});
