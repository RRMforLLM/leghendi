import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  AGENDAS: 'offline_agendas',
  AGENDA_ELEMENTS: 'offline_agenda_elements',
  COMPLETED_ELEMENTS: 'offline_completed_elements',
  USER_PROFILE: 'offline_user_profile',
  LAST_SYNC: 'last_sync_timestamp',
  INDIVIDUAL_AGENDAS: 'offline_individual_agendas',
  URGENT_ITEMS: 'offline_urgent_items',
  COMPLETED_ITEMS: 'offline_completed_items',
  USER_PROFILES: 'offline_user_profiles',
  AGENDA_MEMBERS: 'offline_agenda_members',
};

export const storeData = async (key: string, value: any) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    await AsyncStorage.setItem(KEYS.LAST_SYNC, new Date().toISOString());
  } catch (error) {
    console.error('Error storing offline data:', error);
  }
};

export const getData = async (key: string) => {
  try {
    const data = await AsyncStorage.getItem(key);
    if (!data) {
      switch (key) {
        case KEYS.AGENDAS:
          return [];
        case KEYS.AGENDA_ELEMENTS:
          return [];
        case KEYS.COMPLETED_ELEMENTS:
          return [];
        case KEYS.USER_PROFILES:
          return [];
        case KEYS.URGENT_ITEMS:
          return [];
        case KEYS.COMPLETED_ITEMS:
          return [];
        case KEYS.INDIVIDUAL_AGENDAS:
          return {};
        default:
          return null;
      }
    }

    const parsed = JSON.parse(data);
    if ([KEYS.AGENDAS, KEYS.AGENDA_ELEMENTS, KEYS.COMPLETED_ELEMENTS].includes(key)) {
      return Array.isArray(parsed) ? parsed : [];
    }
    return parsed;
  } catch (error) {
    console.error('Error retrieving offline data:', error);
    if (key.includes('ITEMS') || key.includes('AGENDAS') || key.includes('ELEMENTS')) {
      return [];
    }
    return null;
  }
};

export const clearOfflineData = async () => {
  try {
    await Promise.all(Object.values(KEYS).map(key => AsyncStorage.removeItem(key)));
  } catch (error) {
    console.error('Error clearing offline data:', error);
  }
};

export const storeAgendaData = async (agendaId: string, data: any) => {
  try {
    const existingData = await getData(KEYS.INDIVIDUAL_AGENDAS) || {};
    existingData[agendaId] = {
      data,
      timestamp: new Date().toISOString()
    };
    await storeData(KEYS.INDIVIDUAL_AGENDAS, existingData);
  } catch (error) {
    console.error('Error storing agenda data:', error);
  }
};

export const getAgendaData = async (agendaId: string) => {
  try {
    const allData = await getData(KEYS.INDIVIDUAL_AGENDAS) || {};
    return allData[agendaId]?.data;
  } catch (error) {
    console.error('Error getting agenda data:', error);
    return null;
  }
};

export const cleanupOldCache = async () => {
  try {
    const allData = await getData(KEYS.INDIVIDUAL_AGENDAS) || {};
    const now = new Date();
    const cleaned = Object.entries(allData).reduce((acc, [key, value]: [string, any]) => {
      const timestamp = new Date(value.timestamp);
      if (now.getTime() - timestamp.getTime() < 24 * 60 * 60 * 1000) {
        acc[key] = value;
      }
      return acc;
    }, {});
    await storeData(KEYS.INDIVIDUAL_AGENDAS, cleaned);
  } catch (error) {
    console.error('Error cleaning cache:', error);
  }
};

export const initializeStorage = async () => {
  try {
    const initialized = await AsyncStorage.getItem('storage_initialized');
    if (initialized) return;

    await Promise.all(
      Object.entries(KEYS).map(([_, key]) => 
        storeData(key, getData(key))
      )
    );
    
    await AsyncStorage.setItem('storage_initialized', 'true');
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
};

export { KEYS };
