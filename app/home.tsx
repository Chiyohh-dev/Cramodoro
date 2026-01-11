import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { userAPI } from "../api/api";

export default function Home() {
  const router = useRouter();
  const [profilePic, setProfilePic] = useState(require('../cramodoro-assets/defaultpfp.png'));

  useFocusEffect(
    useCallback(() => {
      loadProfilePic();
    }, [])
  );

  const loadProfilePic = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        const response = await userAPI.getProfile(token);
        if (response.user.profilePicture) {
          setProfilePic({ uri: response.user.profilePicture });
        }
      }
    } catch (error) {
      console.error('Error loading profile picture:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image 
          source={require('../cramodoro-assets/homescreen-icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Recent Cards</Text>

        {/* Empty State - No recent decks */}
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No recent decks</Text>
          <Text style={styles.emptySubtext}>Create a deck to get started</Text>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Image 
            source={require('../cramodoro-assets/home-filled.png')} 
            style={styles.navIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
        >
          <Image 
            source={require('../cramodoro-assets/card.png')} 
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
