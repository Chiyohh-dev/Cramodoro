import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { deckAPI, userAPI } from '../api/api';

interface SyncQueue {
  timestamp: number;
  type: 'deck' | 'card' | 'profile';
  action: 'create' | 'update' | 'delete';
  data: any;
  deckId?: string;
}

const SYNC_QUEUE_KEY = 'syncQueue';
const LAST_SYNC_KEY = 'lastSyncTime';

export const syncManager = {
  // Add operation to sync queue
  queueSync: async (type: 'deck' | 'card' | 'profile', action: 'create' | 'update' | 'delete', data: any, deckId?: string) => {
    try {
      const queueData = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      const queue: SyncQueue[] = queueData ? JSON.parse(queueData) : [];
      
      const syncItem: SyncQueue = {
        timestamp: Date.now(),
        type,
        action,
        data,
        deckId
      };
      
      queue.push(syncItem);
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
      console.log(`📝 Queued ${action} ${type} for sync`);
    } catch (error) {
      console.error('Error queuing sync:', error);
    }
  },

  // Get pending sync items
  getPendingSync: async (): Promise<SyncQueue[]> => {
    try {
      const queueData = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('Error getting sync queue:', error);
      return [];
    }
  },

  // Clear sync queue after successful sync
  clearSyncQueue: async () => {
    try {
      await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
      await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
      console.log('✅ Sync queue cleared');
    } catch (error) {
      console.error('Error clearing sync queue:', error);
    }
  },

  // Process sync queue when online
  syncToBackend: async (token: string): Promise<{ success: number; failed: number }> => {
    const networkState = await NetInfo.fetch();
    
    if (!networkState.isConnected) {
      console.log('📴 Offline - cannot sync');
      return { success: 0, failed: 0 };
    }

    const queue = await syncManager.getPendingSync();
    
    if (queue.length === 0) {
      console.log('✅ No items to sync');
      return { success: 0, failed: 0 };
    }

    console.log(`🔄 Syncing ${queue.length} items to backend...`);
    
    let success = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        console.log(`  Syncing ${item.type} ${item.action}:`, item.data.name || item.data.question || item.data.username || 'data');
        
        // Sync to actual backend API
        if (item.type === 'profile' && item.action === 'update') {
          await userAPI.updateProfile(token, item.data);
          console.log('    ✅ Profile synced to backend');
        } else if (item.type === 'deck' && item.action === 'create') {
          await deckAPI.create(token, item.data);
          console.log('    ✅ Deck created on backend');
        } else if (item.type === 'deck' && item.action === 'update') {
          await deckAPI.update(token, item.deckId, item.data);
          console.log('    ✅ Deck updated on backend');
        } else if (item.type === 'deck' && item.action === 'delete') {
          await deckAPI.delete(token, item.deckId);
          console.log('    ✅ Deck deleted on backend');
        } else if (item.type === 'card') {
          // Cards are part of decks, so we need to get the full deck and update it
          if (item.deckId) {
            try {
              // Get the current deck from local storage with all its cards
              const decksStr = await AsyncStorage.getItem('decks');
              if (decksStr) {
                const decks = JSON.parse(decksStr);
                const deck = decks.find((d: any) => d.id === item.deckId);
                
                if (deck) {
                  // Send the complete deck with all cards to backend
                  await deckAPI.update(token, item.deckId, {
                    name: deck.name,
                    pomodoroMinutes: deck.pomodoroMinutes,
                    restMinutes: deck.restMinutes,
                    cards: deck.cards
                  });
                  console.log('    ✅ Card changes synced to backend');
                } else {
                  console.log('    ⚠️ Deck not found in local storage, skipping card sync');
                }
              }
            } catch (cardError) {
              console.error('    ❌ Error syncing cards:', cardError);
              throw cardError;
            }
          }
        }
        
        success++;
      } catch (error) {
        console.error(`  ❌ Failed to sync ${item.type}:`, error);
        failed++;
      }
    }

    if (failed === 0) {
      await syncManager.clearSyncQueue();
    }

    console.log(`✅ Sync complete: ${success} success, ${failed} failed`);
    return { success, failed };
  },

  // Get last sync time
  getLastSyncTime: async (): Promise<number | null> => {
    try {
      const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
      return lastSync ? parseInt(lastSync) : null;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  },

  // Check if should sync (auto-sync on network change)
  setupAutoSync: (token: string) => {
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        console.log('🌐 Network available - checking for pending syncs...');
        syncManager.syncToBackend(token);
      }
    });
  }
};

export default syncManager;
