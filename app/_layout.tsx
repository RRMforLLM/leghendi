import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';  // Add useRouter here
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import * as Updates from 'expo-updates';

import { useColorScheme } from '@/components/useColorScheme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  const router = useRouter();

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        // Perform a full reload of the app
        if (__DEV__) {
          router.replace('/three');
          await Updates.reloadAsync();
        } else {
          // In production, use this method
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

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ 
          title: 'Settings',
          presentation: 'modal'
        }} />
        <Stack.Screen name="urgent" options={{ 
          title: 'Urgent Items',
          presentation: 'modal'
        }} />
        <Stack.Screen name="user-profile" options={{ 
          title: 'Profile',
          presentation: 'modal'
        }} />
        <Stack.Screen name="completed" options={{ 
          title: 'Completed Items',
          presentation: 'modal'
        }} />
        <Stack.Screen name="members-management" options={{ 
          title: 'Manage Members',
          presentation: 'modal'
        }} />
      </Stack>
    </ThemeProvider>
  );
}
