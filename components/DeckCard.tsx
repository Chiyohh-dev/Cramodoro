import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DeckCardProps {
  deck: {
    id: string;
    name: string;
    cards?: any[];
    pomodoroMinutes?: number;
    restMinutes?: number;
  };
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export const DeckCard: React.FC<DeckCardProps> = ({
  deck,
  onPress,
  onEdit,
  onDelete,
  showActions = false,
}) => {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    let timeStr = '';
    if (hours > 0) {
      timeStr += `${hours} hour${hours !== 1 ? 's' : ''}, `;
    }
    timeStr += `${mins} minute${mins !== 1 ? 's' : ''}`;
    return timeStr;
  };

  return (
    <TouchableOpacity 
      style={styles.deckCard}
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Deck: ${deck.name}`}
      accessibilityHint={`Has ${deck.cards?.length || 0} cards. Tap to start quiz.`}
    >
      <View style={styles.deckHeader}>
        <Text 
          style={styles.deckName}
          accessible={true}
          accessibilityRole="text"
        >
          {deck.name}
        </Text>
        {showActions && (
          <View style={styles.deckActions}>
            {onEdit && (
              <TouchableOpacity 
                onPress={onEdit}
                style={styles.actionButton}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${deck.name}`}
                accessibilityHint="Opens deck editor"
              >
                <Image 
                  source={require('../assets/cramodoro-assets/edit-icon.png')}
                  style={styles.actionIcon}
                  resizeMode="contain"
                  accessible={false}
                />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity 
                onPress={onDelete}
                style={styles.actionButton}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${deck.name}`}
                accessibilityHint="Deletes this deck permanently"
              >
                <Image 
                  source={require('../assets/cramodoro-assets/delete-icon.png')}
                  style={styles.actionIcon}
                  resizeMode="contain"
                  accessible={false}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      
      <View style={styles.deckMeta}>
        <View style={styles.metaItem}>
          <Image 
            source={require('../assets/cramodoro-assets/cards-icon.png')} 
            style={styles.metaIcon}
            resizeMode="contain"
            accessible={false}
          />
          <Text 
            style={styles.metaText}
            accessible={true}
            accessibilityLabel={`${deck.cards?.length || 0} cards`}
          >
            {deck.cards?.length || 0} cards
          </Text>
        </View>
        
        <View style={styles.metaItem}>
          <Image 
            source={require('../assets/cramodoro-assets/timer-icon.png')} 
            style={styles.metaIcon}
            resizeMode="contain"
            accessible={false}
          />
          <Text 
            style={styles.metaText}
            accessible={true}
            accessibilityLabel={`Pomodoro time: ${formatTime(deck.pomodoroMinutes || 25)}`}
          >
            {formatTime(deck.pomodoroMinutes || 25)} - 
            <Text 
              style={styles.restText}
              accessible={true}
              accessibilityLabel={`Rest time: ${formatTime(deck.restMinutes || 5)}`}
            >
              {' '}{formatTime(deck.restMinutes || 5)} rest
            </Text>
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  deckCard: {
    backgroundColor: '#2196F3',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  deckHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deckName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  deckActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  actionIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff',
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
  restText: {
    color: '#fff',
  },
});
