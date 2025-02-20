import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from './offlineStorage';

export const initializeStorage = async () => {
  try {
    // First check if storage is already initialized
    const initialized = await AsyncStorage.getItem('storage_initialized');
    if (initialized) return;

    // Initialize all storage keys with empty data
    await Promise.all([
      AsyncStorage.setItem(KEYS.AGENDAS, JSON.stringify([])),
      AsyncStorage.setItem(KEYS.AGENDA_ELEMENTS, JSON.stringify([])),
      AsyncStorage.setItem(KEYS.COMPLETED_ELEMENTS, JSON.stringify([])),
      AsyncStorage.setItem(KEYS.USER_PROFILES, JSON.stringify([])),
      AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(null)),
      AsyncStorage.setItem(KEYS.INDIVIDUAL_AGENDAS, JSON.stringify({})),
      AsyncStorage.setItem(KEYS.URGENT_ITEMS, JSON.stringify([])),
      AsyncStorage.setItem(KEYS.COMPLETED_ITEMS, JSON.stringify([])),
      AsyncStorage.setItem('storage_initialized', 'true')
    ]);
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
};
