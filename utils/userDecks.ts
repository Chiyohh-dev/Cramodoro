import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Utility functions for managing user-specific deck storage
 * This ensures decks are isolated per user account
 */

export const userDecks = {
  /**
   * Save decks for the current user
   * Stores in both generic 'decks' and user-specific 'decks_{email}' keys
   */
  saveDecks: async (decks: any[], userEmail?: string): Promise<void> => {
    const decksJson = JSON.stringify(decks);
    
    // Always save to generic key for current session
    await AsyncStorage.setItem('decks', decksJson);
    
    // Also save to user-specific key if email provided
    if (userEmail) {
      const userDecksKey = `decks_${userEmail}`;
      await AsyncStorage.setItem(userDecksKey, decksJson);
      console.log(`💾 Saved ${decks.length} decks for user: ${userEmail}`);
    }
  },

  /**
   * Load decks for a specific user
   */
  loadDecks: async (userEmail: string): Promise<any[]> => {
    try {
      const userDecksKey = `decks_${userEmail}`;
      const decksStr = await AsyncStorage.getItem(userDecksKey);
      
      if (decksStr) {
        const decks = JSON.parse(decksStr);
        // Also set as current decks
        await AsyncStorage.setItem('decks', decksStr);
        return decks;
      }
      
      return [];
    } catch (error) {
      console.error('Error loading user decks:', error);
      return [];
    }
  },

  /**
   * Get current user's email from stored userData
   */
  getCurrentUserEmail: async (): Promise<string | null> => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        return user.email;
      }
      return null;
    } catch (error) {
      console.error('Error getting user email:', error);
      return null;
    }
  },

  /**
   * Save decks for current logged-in user
   */
  saveCurrentUserDecks: async (decks: any[]): Promise<void> => {
    const userEmail = await userDecks.getCurrentUserEmail();
    await userDecks.saveDecks(decks, userEmail || undefined);
  },

  /**
   * Clear all user-specific deck data (for logout)
   */
  clearAllUserDecks: async (): Promise<void> => {
    await AsyncStorage.removeItem('decks');
    console.log('🧹 Cleared current session decks');
  }
};

export default userDecks;
