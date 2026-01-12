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
          // Validate profile data before syncing
          const profileData = { ...item.data };
          
          // Skip if name is empty or invalid
          if (profileData.name !== undefined && (!profileData.name || profileData.name.trim() === '')) {
            console.log('    ⚠️ Skipping profile sync: empty name');
            success++; // Count as success to remove from queue
            continue;
          }
          
          // Ensure name meets backend validation (1-50 characters)
          if (profileData.name && (profileData.name.length < 1 || profileData.name.length > 50)) {
            console.log('    ⚠️ Skipping profile sync: invalid name length');
            success++; // Count as success to remove from queue
            continue;
          }
          
          await userAPI.updateProfile(token, profileData);
          console.log('    ✅ Profile synced to backend');
        } else if (item.type === 'deck' && item.action === 'create') {
          // Remove local ID before sending to backend (MongoDB will create its own)
          const deckData = { ...item.data };
          const oldLocalId = item.data.id;
          delete deckData.id;
          
          const result = await deckAPI.create(token, deckData);
          console.log('    ✅ Deck created on backend with ID:', result?.deck?._id);
          
          // Update local deck with MongoDB ID
          if (result?.deck?._id && oldLocalId) {
            const decksStr = await AsyncStorage.getItem('decks');
            if (decksStr) {
              const decks = JSON.parse(decksStr);
              const deckIndex = decks.findIndex((d: any) => d.id === oldLocalId);
              if (deckIndex !== -1) {
                decks[deckIndex].id = result.deck._id;
                await AsyncStorage.setItem('decks', JSON.stringify(decks));
                console.log('    ✅ Updated local deck ID from', oldLocalId, 'to', result.deck._id);
              }
            }
            
            // Update all queued items that reference the old deck ID
            const queueData = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
            if (queueData) {
              const currentQueue: SyncQueue[] = JSON.parse(queueData);
              const updatedQueue = currentQueue.map(queueItem => {
                if (queueItem.deckId === oldLocalId) {
                  console.log(`    🔄 Updating queued ${queueItem.type} to use new deck ID`);
                  return { ...queueItem, deckId: result.deck._id };
                }
                return queueItem;
              });
              await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedQueue));
            }
          }
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
    let syncInterval: NodeJS.Timeout | null = null;
    
    const attemptSync = async () => {
      const networkState = await NetInfo.fetch();
      if (networkState.isConnected) {
        const pending = await syncManager.getPendingSync();
        if (pending.length > 0) {
          console.log('🔄 Auto-sync: attempting to sync pending items...');
          await syncManager.syncToBackend(token);
        }
      }
    };
    
    // Listen for network state changes
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        console.log('🌐 Network available - checking for pending syncs...');
        syncManager.syncToBackend(token);
      }
    });
    
    // Periodically check for pending syncs every 2 minutes when online
    syncInterval = setInterval(attemptSync, 120000);
    
    // Initial sync attempt
    attemptSync();
  }
};

export default syncManager;
