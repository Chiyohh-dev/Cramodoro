import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { userAPI } from "../api/api";

export default function Profile() {
  const router = useRouter();
  const [userData, setUserData] = useState({
    name: "",
    bio: "",
    profilePic: require('../cramodoro-assets/defaultpfp.png'),
  });
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/');
        return;
      }

      const response = await userAPI.getProfile(token);
      const profilePicSource = response.user.profilePicture 
        ? { uri: response.user.profilePicture } 
        : require('../cramodoro-assets/defaultpfp.png');
      
      setUserData({
        name: response.user.name || "",
        bio: response.user.bio || "",
        profilePic: profilePicSource,
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('userData');
            router.replace('/');
          },
        },
      ]
    );
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Picture */}
        <View style={styles.profileSection}>
          <Image 
            source={userData.profilePic}
            style={styles.profilePic}
            resizeMode="cover"
          />
          <TouchableOpacity 
            style={styles.editLink}
            onPress={() => router.push('/edit-profile')}
          >
            <Image 
              source={require('../cramodoro-assets/edit-icon.png')} 
              style={styles.editIcon}
              resizeMode="contain"
            />
            <Text style={styles.editText}>edit</Text>
          </TouchableOpacity>
        </View>

        {/* Name Section */}
        <View style={styles.infoSection}>
          <Text style={styles.label}>Name</Text>
          <Text style={[styles.nameValue, !userData.name && styles.placeholderText]}>
            {userData.name || "Your name here..."}
          </Text>
        </View>

        {/* Bio Section */}
        <View style={styles.infoSection}>
          <Text style={styles.label}>Bio</Text>
          <View style={styles.bioBox}>
            <Text style={[styles.bioText, !userData.bio && styles.placeholderText]}>
              {userData.bio || "Your bio here..."}
            </Text>
          </View>
        </View>

        {/* Log Out Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/home')}
        >
          <Image 
            source={require('../cramodoro-assets/home.png')} 
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
        
        <TouchableOpacity style={styles.navItem}>
          <Image 
            source={userData.profilePic} 
            style={styles.profileIconActive}
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
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
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
  profileSection: {
    alignItems: 'center',
    marginTop: '8%',
    marginBottom: '-15%',
  },
  profilePic: {
    width: '45%',
    height: '45%',
    borderRadius: 175,
    aspectRatio: 1,
    marginBottom: '3%',
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  editIcon: {
    width: 16,
    height: 16,
  },
  editText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '500',
  },
  infoSection: {
    marginBottom: '5%',
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 10,
  },
  nameValue: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
  bioBox: {
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    minHeight: 80,
    width: '100%',
  },
  bioText: {
    fontSize: 15,
    color: '#2196F3',
    lineHeight: 22,
  },
  placeholderText: {
    color: '#999',
    fontStyle: 'italic',
  },
  logoutButton: {
    backgroundColor: '#DC3545',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: '6%',
    marginBottom: '8%',
    width: '100%',
  },
  logoutText: {
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
  profileIconActive: {
    width: 35,
    height: 35,
    borderRadius: 20,
  },
});
