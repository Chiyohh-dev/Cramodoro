import React from 'react';
import { Image, ImageStyle, StyleSheet, View, ViewStyle } from 'react-native';

interface HeaderProps {
  style?: ViewStyle;
  logoStyle?: ImageStyle;
}

export const Header: React.FC<HeaderProps> = ({ style, logoStyle }) => {
  return (
    <View style={[styles.header, style]}>
      <Image 
        source={require('../assets/cramodoro-assets/homescreen-icon.png')} 
        style={[styles.logo, logoStyle]}
        resizeMode="contain"
        accessible={true}
        accessibilityLabel="Cramodoro logo"
        accessibilityRole="image"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  logo: {
    width: '25%',
    aspectRatio: 1.5,
    maxWidth: 100,
  },
});
