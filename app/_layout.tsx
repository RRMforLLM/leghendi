import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import * as Updates from 'expo-updates';
import { initializeStorage } from '@/utils/offlineStorage';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { PushNotifications } from '@/components/Push';

import { useTheme } from '@/contexts/ThemeContext';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      try {
        await initializeStorage();
        if (loaded) {
          await SplashScreen.hideAsync();
        }
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };
    init();
  }, [loaded]);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        if (__DEV__) {
          router.replace('/three');
          await Updates.reloadAsync();
        } else {
          await Updates.reloadAsync();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <PushNotifications />
        <RootLayoutNav />
      </LanguageProvider>
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  const { colorScheme } = useTheme();
  const { t } = useLanguage();

  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ 
          title: t('modal.settings'),
          presentation: 'modal'
        }} />
        <Stack.Screen name="urgent" options={{ 
          title: t('modal.urgent'),
          presentation: 'modal'
        }} />
        <Stack.Screen name="user-profile" options={{ 
          title: t('modal.profile'),
          presentation: 'modal'
        }} />
        <Stack.Screen name="completed" options={{ 
          title: t('modal.completed'),
          presentation: 'modal'
        }} />
        <Stack.Screen name="members-management" options={{ 
          title: t('modal.members'),
          presentation: 'modal'
        }} />
        <Stack.Screen name="store" options={{
          title: t('modal.store'),
          presentation: 'modal'
        }} />
        <Stack.Screen name="calendar" options={{
          title: t('modal.calendar'),
          presentation: 'modal'
        }} />
      </Stack>
    </NavigationThemeProvider>
  );
}
