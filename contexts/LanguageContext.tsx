import { createContext, useContext, useEffect, useState } from 'react';
import { getData, storeData } from '@/utils/offlineStorage';
import { Language, translations, SUPPORTED_LANGUAGES } from '@/constants/Translations';
import { supabase } from '@/lib/supabase';
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
    const loadLanguage = async () => {
      try {
        // First check if user is logged in
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Try to get language from database first
          const { data: profile } = await supabase
            .from('Profile')
            .select('language')
            .eq('id', user.id)
            .single();

          if (profile?.language && profile.language in SUPPORTED_LANGUAGES) {
            setLanguageState(profile.language as Language);
            await storeData('userLanguage', profile.language);
            return;
          }
        }

        // Fallback to stored preference or device language
        const savedLang = await getData('userLanguage');
        if (savedLang && savedLang in SUPPORTED_LANGUAGES) {
          setLanguageState(savedLang as Language);
          if (user) {
            // Sync to database if user is logged in
            await supabase
              .from('Profile')
              .update({ language: savedLang })
              .eq('id', user.id);
          }
          return;
        }

        // Use device language as last resort
        const deviceLang = getDeviceLanguage();
        setLanguageState(deviceLang);
        await storeData('userLanguage', deviceLang);
        if (user) {
          await supabase
            .from('Profile')
            .update({ language: deviceLang })
            .eq('id', user.id);
        }
      } catch (error) {
        console.error('Error loading language:', error);
        setLanguageState('en');
      }
    };

    loadLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Update database if user is logged in
        await supabase
          .from('Profile')
          .update({ language: lang })
          .eq('id', user.id);
      }
      
      // Update local storage
      await storeData('userLanguage', lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Error setting language:', error);
    }
  };

  const getDeviceLanguage = (): Language => {
    try {
      const locale = navigator.language || 
                     navigator.languages?.[0] || 
                     'en-US';
      const langCode = locale.split(/[-_]/)[0];
      return langCode in SUPPORTED_LANGUAGES ? (langCode as Language) : 'en';
    } catch {
      return 'en';
    }
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
