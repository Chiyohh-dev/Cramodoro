import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { userAPI } from "../api/api";
import { BottomNav } from "../components/BottomNav";
import { DeckCard } from "../components/DeckCard";
import { Header } from "../components/Header";
import localAuth from "../utils/localAuth";

export default function Home() {
  const router = useRouter();
  const [profilePic, setProfilePic] = useState(require('../assets/cramodoro-assets/defaultpfp.png'));
  const [recentDecks, setRecentDecks] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      
      const loadProfilePic = async () => {
        try {
          const token = await AsyncStorage.getItem('authToken');
          if (!isMounted) return;
          
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
            
            if (!isMounted) return;
            
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
          if (!isMounted) return;
          console.error('Error loading profile picture:', error);
        }
      };
      
      const loadRecentDecks = async () => {
        try {
          const decks = await AsyncStorage.getItem('decks');
          if (!isMounted) return;
          
          if (decks) {
            const decksList = JSON.parse(decks);
            const usedDecks = decksList
              .filter((d: any) => d.lastUsed)
              .sort((a: any, b: any) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
              .slice(0, 5);
            
            if (!isMounted) return;
            setRecentDecks(usedDecks);
          }
        } catch (error) {
          if (!isMounted) return;
          console.error('Error loading recent decks:', error);
        }
      };
      
      loadProfilePic();
      loadRecentDecks();
      
      return () => {
        isMounted = false;
      };
    }, [])
  );
  
  const formatTimer = (studyStart: string, studyEnd: string) => {
    if (!studyStart || !studyEnd) {
      return 'No timer set';
    }
    
    const [startHour, startMin] = studyStart.split(':').map(Number);
    const [endHour, endMin] = studyEnd.split(':').map(Number);
    
    const startHourDisplay = startHour === 0 ? 12 : startHour > 12 ? startHour - 12 : startHour;
    const endHourDisplay = endHour === 0 ? 12 : endHour > 12 ? endHour - 12 : endHour;
    
    const startPeriod = startHour >= 12 ? 'PM' : 'AM';
    const endPeriod = endHour >= 12 ? 'PM' : 'AM';
    
    return `${startHourDisplay}:${startMin.toString().padStart(2, '0')} ${startPeriod} - ${endHourDisplay}:${endMin.toString().padStart(2, '0')} ${endPeriod}`;
  };

  return (
    <View style={styles.container}>
      <Header />

      {/* Main Content */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        accessible={true}
        accessibilityRole="scrollbar"
        accessibilityLabel="Recent decks list"
      >
        <Text 
          style={styles.sectionTitle}
          accessible={true}
          accessibilityRole="header"
        >
          Recent Cards
        </Text>

        {/* Recent Decks or Empty State */}
        {recentDecks.length === 0 ? (
          <View 
            style={styles.emptyState}
            accessible={true}
            accessibilityLabel="No recent decks. Create a deck to get started"
            accessibilityRole="text"
          >
            <Text style={styles.emptyText}>No recent decks</Text>
            <Text style={styles.emptySubtext}>Create a deck to get started</Text>
          </View>
        ) : (
          recentDecks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onPress={() => router.push(`/quiz?deckId=${deck.id}`)}
              showActions={false}
            />
          ))
        )}
      </ScrollView>

      <BottomNav activeRoute="home" profilePic={profilePic} />
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
    paddingHorizontal: 20,
    paddingTop: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 20,
  },
  emptyState: {
    marginTop: '30%',
    alignItems: 'center',
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
});
