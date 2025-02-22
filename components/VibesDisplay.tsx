import { StyleSheet, View, Pressable } from 'react-native';
import { Text } from './Themed';
import { Icon } from '@rneui/themed';
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
      <Icon
        name="stars"
        type="material"
        color={theme.text}
        size={20}
      />
      <Text style={[typography.body, { color: theme.text }]}>
        {credits} Vibes
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
});
