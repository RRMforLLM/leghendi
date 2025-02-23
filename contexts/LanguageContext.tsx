import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, translations, SUPPORTED_LANGUAGES } from '@/constants/Translations';
import { NativeModules, Platform } from 'react-native';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: keyof typeof translations['en']) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const getDeviceLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('userLanguage');
        if (savedLang && savedLang in SUPPORTED_LANGUAGES) {
          setLanguageState(savedLang as Language);
          return;
        }

        // Get system language
        const deviceLanguage =
          Platform.OS === 'ios'
            ? NativeModules.SettingsManager.settings.AppleLocale ||
              NativeModules.SettingsManager.settings.AppleLanguages[0]
            : NativeModules.I18nManager.localeIdentifier;

        // Get first 2 chars of language code
        const languageCode = deviceLanguage.substring(0, 2);

        // Set language if supported, otherwise fallback to 'en'
        const newLang = languageCode in SUPPORTED_LANGUAGES ? languageCode : 'en';
        setLanguageState(newLang as Language);
        await AsyncStorage.setItem('userLanguage', newLang);
      } catch (error) {
        console.error('Error setting device language:', error);
        setLanguageState('en');
      }
    };

    getDeviceLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    await AsyncStorage.setItem('userLanguage', lang);
    setLanguageState(lang);
  };

  const t = (key: keyof typeof translations['en']) => {
    return translations[language][key] || translations['en'][key];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
