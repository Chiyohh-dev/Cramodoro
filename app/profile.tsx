import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { userAPI } from "../api/api";
import { BottomNav } from "../components/BottomNav";
import { Button } from "../components/Button";
import { Header } from "../components/Header";
import localAuth from "../utils/localAuth";

export default function Profile() {
  const router = useRouter();
  const [userData, setUserData] = useState({
    name: "",
    bio: "",
    profilePic: require('../assets/cramodoro-assets/defaultpfp.png'),
  });
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
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
          
          const profilePicSource = response.user.profilePicture 
            ? { uri: response.user.profilePicture } 
            : require('../assets/cramodoro-assets/defaultpfp.png');
          
          setUserData({
            name: response.user.name || response.user.username || "",
            bio: response.user.bio || "",
            profilePic: profilePicSource,
          });
          
          // Cache profile picture in userData for persistence
          if (response.user.profilePicture) {
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
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };
      
      loadProfile();
      
      return () => {
        isMounted = false;
      };
    }, [])
  );

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
      <Header />

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        accessible={true}
        accessibilityRole="scrollbar"
        accessibilityLabel="Profile information"
      >
        {/* Profile Picture */}
        <View style={styles.profileSection}>
          <Image 
            source={userData.profilePic}
            style={styles.profilePic}
            resizeMode="cover"
            accessible={true}
            accessibilityLabel="Profile picture"
            accessibilityRole="image"
          />
          <TouchableOpacity 
            style={styles.editLink}
            onPress={() => router.push('/edit-profile')}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            accessibilityHint="Opens profile editor"
          >
            <Image 
              source={require('../assets/cramodoro-assets/edit-icon.png')} 
              style={styles.editIcon}
              resizeMode="contain"
              accessible={false}
            />
            <Text style={styles.editText}>edit</Text>
          </TouchableOpacity>
        </View>

        {/* Name Section */}
        <View 
          style={styles.infoSection}
          accessible={true}
          accessibilityLabel={`Name: ${userData.name || "Not set"}`}
          accessibilityRole="text"
        >
          <Text style={styles.label}>Name</Text>
          <Text style={[styles.nameValue, !userData.name && styles.placeholderText]}>
            {userData.name || "Your name here..."}
          </Text>
        </View>

        {/* Bio Section */}
        <View 
          style={styles.infoSection}
          accessible={true}
          accessibilityLabel={`Bio: ${userData.bio || "Not set"}`}
          accessibilityRole="text"
        >
          <Text style={styles.label}>Bio</Text>
          <View style={styles.bioBox}>
            <Text style={[styles.bioText, !userData.bio && styles.placeholderText]}>
              {userData.bio || "Your bio here..."}
            </Text>
          </View>
        </View>

        {/* Log Out Button */}
        <Button
          title="Log out"
          onPress={handleLogout}
          variant="danger"
          style={styles.logoutButton}
          accessibilityLabel="Log out"
          accessibilityHint="Logs you out and returns to login screen"
        />
      </ScrollView>

      <BottomNav activeRoute="profile" profilePic={userData.profilePic} />
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
    marginTop: '6%',
    marginBottom: '8%',
  },
});
