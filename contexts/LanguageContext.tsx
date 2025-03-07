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
        // For testing: uncomment to clear saved language
        // await AsyncStorage.removeItem('userLanguage');
        
        const savedLang = await AsyncStorage.getItem('userLanguage');
        console.log('Saved language in storage:', savedLang);
        
        if (savedLang && savedLang in SUPPORTED_LANGUAGES) {
          console.log('Using saved language preference:', savedLang);
          setLanguageState(savedLang as Language);
          return;
        }

        // Get device language based on platform
        let deviceLanguage;
        if (Platform.OS === 'ios') {
          deviceLanguage = NativeModules.SettingsManager.settings.AppleLanguages[0];
          console.log('iOS language detection:', deviceLanguage);
        } else {
          // For Android, try multiple methods to get the locale
          deviceLanguage = 
            NativeModules.I18nManager?.getConstants?.().localeIdentifier || // primary method
            NativeModules.Settings?.settings?.locale || // backup method
            NativeModules.I18nManager?.locale || // fallback
            Intl.DateTimeFormat().resolvedOptions().locale; // last resort
          
          console.log('Android locale detection methods:', {
            localeIdentifier: NativeModules.I18nManager?.getConstants?.().localeIdentifier,
            settings: NativeModules.Settings?.settings?.locale,
            i18nLocale: NativeModules.I18nManager?.locale,
            intlLocale: Intl.DateTimeFormat().resolvedOptions().locale
          });
        }
        console.log('Raw device language:', deviceLanguage);

        const langCode = deviceLanguage.toLowerCase().split(/[-_]/)[0];
        console.log('Extracted language code:', langCode);

        const newLang = ['en', 'es', 'fr'].includes(langCode) ? langCode : 'en';
        console.log('Setting new language to:', newLang);
        
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
