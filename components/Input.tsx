import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  inputStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  labelStyle,
  inputStyle,
  accessibilityLabel,
  accessibilityHint,
  ...textInputProps
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text 
          style={[styles.label, labelStyle]}
          accessible={true}
          accessibilityRole="text"
        >
          {label}
        </Text>
      )}
      <TextInput
        style={[styles.input, inputStyle, error && styles.inputError]}
        placeholderTextColor="#999"
        accessible={true}
        accessibilityLabel={accessibilityLabel || label}
        accessibilityHint={accessibilityHint}
        accessibilityRole="none"
        {...textInputProps}
      />
      {error && (
        <Text 
          style={styles.errorText}
          accessible={true}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  inputError: {
    borderColor: '#DC3545',
  },
  errorText: {
    color: '#DC3545',
    fontSize: 12,
    marginTop: 4,
  },
});
