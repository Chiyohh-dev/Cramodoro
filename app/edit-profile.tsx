import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { userAPI } from "../api/api";
import localAuth from "../utils/localAuth";
import syncManager from "../utils/syncManager";

export default function EditProfile() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [profilePic, setProfilePic] = useState(require('../assets/cramodoro-assets/defaultpfp.png'));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const loadProfile = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (!isMounted) return;
        
        if (!token) {
          router.replace('/');
          return;
        }

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
        
        setName(response.user.name || response.user.username || "");
        setBio(response.user.bio || "");
        
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
      } catch (error) {
        if (!isMounted) return;
        console.error('Error loading profile:', error);
        Alert.alert('Error', 'Failed to load profile');
      }
    };
    
    loadProfile();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to change your profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const base64Image = `data:image/jpeg;base64,${asset.base64}`;
        setProfilePic({ uri: base64Image });
        Alert.alert('Success', 'Profile picture updated! Don\'t forget to save changes.');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        router.replace('/');
        return;
      }

      const updateData: { 
        name?: string;
        username?: string; 
        bio?: string; 
        profilePicture?: string;
      } = { 
        name,
        username: name, 
        bio
      };

      // Only include profile picture if it has changed (has uri property)
      if (profilePic && typeof profilePic === 'object' && 'uri' in profilePic) {
        const uri = profilePic.uri as string;
        // Only include if it's a data URI (base64) or actual URI, not the default require()
        if (uri && (uri.startsWith('data:') || uri.startsWith('http') || uri.startsWith('file'))) {
          updateData.profilePicture = uri;
        }
      }

      const networkState = await NetInfo.fetch();
      
      // Always try to update locally first (for cache)
      console.log('💾 Updating profile locally');
      await localAuth.updateProfile(token, updateData);
      
      // Update userData cache as well
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        if (updateData.name) user.name = updateData.name;
        if (updateData.username) user.username = updateData.username;
        if (updateData.bio !== undefined) user.bio = updateData.bio;
        if (updateData.profilePicture) user.profilePicture = updateData.profilePicture;
        await AsyncStorage.setItem('userData', JSON.stringify(user));
      }
      
      // Then try backend if online
      if (networkState.isConnected && !token.startsWith('offline_')) {
        try {
          console.log('☁️ Syncing to backend');
          await userAPI.updateProfile(token, updateData);
          console.log('✅ Profile synced to backend');
        } catch (backendErr) {
          console.log('⚠️ Backend sync failed, queued for later');
          await syncManager.queueSync('profile', 'update', updateData);
        }
      } else {
        // Queue for sync when online
        await syncManager.queueSync('profile', 'update', updateData);
      }

      Alert.alert('Success', 'Profile updated successfully');
      
      router.back();
    } catch (error) {
      console.error('Update error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      Alert.alert('Error', errorMessage);
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
        <View style={styles.profileSection}>
          <Image 
            source={profilePic}
            style={styles.profilePic}
            resizeMode="cover"
          />
          <TouchableOpacity 
            style={styles.changeLink}
            onPress={pickImage}
          >
            <Image 
              source={require('../assets/cramodoro-assets/edit-icon.png')} 
              style={styles.editIcon}
              resizeMode="contain"
            />
            <Text style={styles.changeText}>change</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="Your name here..."
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={styles.bioInput}
            value={bio}
            onChangeText={setBio}
            multiline
            textAlignVertical="top"
            placeholder="Your bio here..."
            placeholderTextColor="#999"
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.saveText}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Text>
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
        
        <TouchableOpacity style={styles.navItem}>
          <Image 
            source={require('../assets/cramodoro-assets/card.png')} 
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
    aspectRatio: 1.5,
    maxWidth: 100,
  },
  placeholder: {
    width: '10%',
    minWidth: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: '4%',
    marginBottom: '8%',
    zIndex: 10,
  },
  profilePic: {
    width: '45%',
    height: '45%',
    aspectRatio: 1,
    maxWidth: 180,
    borderRadius: 9999,
    marginBottom: '3%',
  },
  changeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 8,
    zIndex: 10,
  },
  editIcon: {
    width: 16,
    height: 16,
  },
  changeText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '500',
  },
  infoSection: {
    marginBottom: '4%',
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
  nameInput: {
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#2196F3',
    width: '100%',
  },
  bioInput: {
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    minHeight: 80,
    fontSize: 15,
    color: '#2196F3',
    width: '100%',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: '3%',
    marginBottom: '6%',
    width: '100%',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
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
    width: 32,
    height: 32,
  },
  profileIconActive: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
