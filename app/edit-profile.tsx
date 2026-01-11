import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { userAPI } from "../api/api";

export default function EditProfile() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [fontSize, setFontSize] = useState("14");
  const [profilePic, setProfilePic] = useState(require('../cramodoro-assets/defaultpfp.png'));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/');
        return;
      }

      const response = await userAPI.getProfile(token);
      setName(response.user.name || "");
      setBio(response.user.bio || "");
      setFontSize(response.user.fontSize?.toString() || "14");
      
      if (response.user.profilePicture) {
        setProfilePic({ uri: response.user.profilePicture });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    }
  };

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to change your profile picture.'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Reduce quality for smaller base64 size
        base64: true, // Get base64 encoding
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        // Convert to base64 data URI for storage
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

      // Prepare update data
      const updateData: { 
        name: string; 
        bio: string; 
        fontSize: number;
        profilePicture?: string;
      } = { 
        name, 
        bio, 
        fontSize: parseInt(fontSize)
      };

      // If profile picture is a URI (not the default require), send it
      if (profilePic && typeof profilePic === 'object' && 'uri' in profilePic) {
        updateData.profilePicture = profilePic.uri;
      }

      await userAPI.updateProfile(token, updateData);

      Alert.alert('Success', 'Profile updated successfully');
      
      // Navigate back - profile will auto-refresh with useFocusEffect
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
      {/* Header with back button */}
      <View style={styles.header}>
        <Image 
          source={require('../cramodoro-assets/homescreen-icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Picture */}
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
              source={require('../cramodoro-assets/edit-icon.png')} 
              style={styles.editIcon}
              resizeMode="contain"
            />
            <Text style={styles.changeText}>change</Text>
          </TouchableOpacity>
        </View>

        {/* Name Section */}
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

        {/* Bio Section */}
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

        {/* Cards Section */}
        <View style={styles.infoSection}>
          <Text style={styles.label}>Cards</Text>
          <View style={styles.fontSizeSection}>
            <Text style={styles.subLabel}>Font Size</Text>
            <View style={styles.fontSizeSelector}>
              <TextInput
                style={styles.fontSizeInput}
                value={fontSize}
                onChangeText={setFontSize}
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.dropdown}>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Save Changes Button */}
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
        
        <TouchableOpacity style={styles.navItem}>
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
    marginBottom: '-35%',
  },
  profilePic: {
    width: '45%',
    height: '45%',
    aspectRatio: 1,
    maxWidth: 180,
    borderRadius: 9999,
    marginBottom: '2%',
  },
  changeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
  fontSizeSection: {
    marginTop: 10,
  },
  subLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  fontSizeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fontSizeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    width: 60,
    backgroundColor: '#f5f5f5',
  },
  dropdown: {
    marginLeft: 8,
    padding: 8,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
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
