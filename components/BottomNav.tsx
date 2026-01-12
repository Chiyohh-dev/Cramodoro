import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, TouchableOpacity, View } from 'react-native';

interface BottomNavProps {
  activeRoute: 'home' | 'decks' | 'profile';
  profilePic?: ImageSourcePropType;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeRoute, profilePic }) => {
  const router = useRouter();
  const defaultProfilePic = require('../assets/cramodoro-assets/defaultpfp.png');

  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => router.push('/home')}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Home"
        accessibilityHint="Navigate to home screen"
        accessibilityState={{ selected: activeRoute === 'home' }}
      >
        <Image 
          source={
            activeRoute === 'home' 
              ? require('../assets/cramodoro-assets/home-filled.png')
              : require('../assets/cramodoro-assets/home.png')
          } 
          style={styles.navIcon}
          resizeMode="contain"
          accessible={false}
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => router.push('/decks')}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Decks"
        accessibilityHint="Navigate to decks screen"
        accessibilityState={{ selected: activeRoute === 'decks' }}
      >
        <Image 
          source={
            activeRoute === 'decks'
              ? require('../assets/cramodoro-assets/cards-filled.png')
              : require('../assets/cramodoro-assets/card.png')
          } 
          style={styles.navIcon}
          resizeMode="contain"
          accessible={false}
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => router.push('/profile')}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Profile"
        accessibilityHint="Navigate to profile screen"
        accessibilityState={{ selected: activeRoute === 'profile' }}
      >
        <Image 
          source={profilePic || defaultProfilePic} 
          style={activeRoute === 'profile' ? styles.profileIconActive : styles.profileIcon}
          resizeMode="cover"
          accessible={false}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
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
  profileIconActive: {
    width: 35,
    height: 35,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#2196F3',
  },
});
