import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Animated, Image, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { userAPI } from "../api/api";
import localAuth from "../utils/localAuth";
import userDecks from "../utils/userDecks";

const SwipeableDeckCard = ({ deck, onPress, onEdit, onDelete }: any) => {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -150));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          Animated.spring(translateX, {
            toValue: -150,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const resetSwipe = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => {
            resetSwipe();
            onEdit();
          }}
        >
          <Image 
            source={require('../assets/cramodoro-assets/edit-icon.png')} 
            style={styles.actionIcon}
            resizeMode="contain"
          />
          <Text style={styles.actionText}>edit</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => {
            resetSwipe();
            onDelete();
          }}
        >
          <Image 
            source={require('../assets/cramodoro-assets/delete-icon.png')} 
            style={styles.actionIcon}
            resizeMode="contain"
          />
          <Text style={styles.actionText}>delete</Text>
        </TouchableOpacity>
      </View>
      <Animated.View
        style={[
          styles.deckCardWrapper,
          {
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          style={styles.deckCard}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Text style={styles.deckName}>{deck.name}</Text>
          <View style={styles.deckMeta}>
            <View style={styles.metaItem}>
              <Image 
                source={require('../assets/cramodoro-assets/cards-icon.png')} 
                style={styles.metaIcon}
                resizeMode="contain"
              />
              <Text style={styles.metaText}>{deck.cards?.length || 0} cards</Text>
            </View>
            <View style={styles.metaItem}>
              <Image 
                source={require('../assets/cramodoro-assets/timer-icon.png')} 
                style={styles.metaIcon}
                resizeMode="contain"
              />
              <Text style={styles.metaText}>
                {Math.floor((deck.pomodoroMinutes || 0) / 60) > 0 && `${Math.floor((deck.pomodoroMinutes || 0) / 60)} hour${Math.floor((deck.pomodoroMinutes || 0) / 60) !== 1 ? 's' : ''}, `}
                {(deck.pomodoroMinutes || 0) % 60} minute{(deck.pomodoroMinutes || 0) % 60 !== 1 ? 's' : ''} - 
                {Math.floor((deck.restMinutes || 0) / 60) > 0 && `${Math.floor((deck.restMinutes || 0) / 60)} hour${Math.floor((deck.restMinutes || 0) / 60) !== 1 ? 's' : ''}, `}
                {(deck.restMinutes || 0) % 60} minute{(deck.restMinutes || 0) % 60 !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default function Decks() {
  const router = useRouter();
  const [profilePic, setProfilePic] = useState(require('../assets/cramodoro-assets/defaultpfp.png'));
  const [decks, setDecks] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadProfilePic();
      loadDecks();
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

  const loadDecks = async () => {
    try {
      const storedDecks = await AsyncStorage.getItem('decks');
      if (storedDecks) {
        setDecks(JSON.parse(storedDecks));
      } else {
        setDecks([]);
      }
    } catch (error) {
      console.error('Error loading decks:', error);
    }
  };

  const handleDeckPress = (deckId: string) => {
    router.push({
      pathname: '/quiz',
      params: { deckId }
    });
  };

  const handleEditDeck = (deckId: string) => {
    router.push({
      pathname: '/create-deck',
      params: { deckId, edit: 'true' }
    });
  };

  const handleDeleteDeck = async (deckId: string) => {
    Alert.alert(
      'Delete Deck',
      'Are you sure you want to delete this deck? All cards will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const storedDecks = await AsyncStorage.getItem('decks');
              if (storedDecks) {
                const decksList = JSON.parse(storedDecks);
                const updatedDecks = decksList.filter((d: any) => d.id !== deckId);
                await userDecks.saveCurrentUserDecks(updatedDecks);
                loadDecks();
              }
            } catch (error) {
              console.error('Error deleting deck:', error);
              Alert.alert('Error', 'Failed to delete deck');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image 
          source={require('../assets/cramodoro-assets/homescreen-icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Your Cards</Text>
        
        {/* Add Decks Button */}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/create-deck')}
        >
          <Text style={styles.addButtonText}>+ Add Deck</Text>
        </TouchableOpacity>

        {/* Decks List or Empty State */}
        {decks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No decks created yet</Text>
            <Text style={styles.emptySubtext}>Tap "Add Deck" to create your first deck</Text>
          </View>
        ) : (
          <View style={styles.decksList}>
            {decks.map((deck, index) => (
              <SwipeableDeckCard
                key={deck.id || index}
                deck={deck}
                onPress={() => handleDeckPress(deck.id)}
                onEdit={() => handleEditDeck(deck.id)}
                onDelete={() => handleDeleteDeck(deck.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  logo: {
    width: '25%',
    aspectRatio: 1,
    maxWidth: 100,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
  },
  addButton: {
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: '5%',
    width: '100%',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2196F3',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
  },
  decksList: {
    gap: 15,
    marginBottom: 20,
  },
  swipeContainer: {
    position: 'relative',
    marginBottom: 0,
  },
  actionsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 10,
  },
  editButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
  },
  actionIcon: {
    width: 32,
    height: 32,
    marginBottom: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  deckCardWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  deckCard: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 20,
  },
  deckName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  deckMeta: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaIcon: {
    width: 16,
    height: 16,
    tintColor: '#fff',
  },
  metaText: {
    fontSize: 14,
    color: '#fff',
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
});
