import { StyleSheet, View, Pressable, Image } from 'react-native';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { typography, spacing } from '@/constants/Typography';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function VibesDisplay({ amount }: { amount: number }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [credits, setCredits] = useState(amount);

  useEffect(() => {
    setCredits(amount);
  }, [amount]);

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.container,
        { opacity: pressed ? 0.7 : 1 }
      ]}
      onPress={() => router.push('/store')}
    >
      <Image
        source={{ uri: 'https://hmrvdkweceanxnuyuorq.supabase.co/storage/v1/object/public/utilities/Vibes-Icon.png' }}
        style={styles.icon}
      />
      <Text style={[typography.body, { color: theme.text }]}>{credits}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    height: 40,
  },
  icon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    marginTop: 2,
  }
});
