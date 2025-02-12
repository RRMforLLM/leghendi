import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { View, Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { typography, spacing } from '@/constants/Typography';
import { useColorScheme } from '@/components/useColorScheme';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface CompletedItem {
  id: number;
  subject: string;
  deadline: string;
  agendaName: string;
  agendaId: string;
  sectionId: string;
}

export default function CompletedScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { items } = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  
  const completedItems: CompletedItem[] = items 
    ? JSON.parse(decodeURIComponent(items as string))
    : [];

  const handleUncomplete = async (elementId: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const { error } = await supabase
        .from('Completed Element')
        .delete()
        .eq('user_id', session.user.id)
        .eq('element_id', elementId);

      if (error) throw error;

      // Navigate back to the agenda the item belongs from
      const item = completedItems.find(i => i.id === elementId);
      if (item) {
        router.replace(`/agenda/${item.agendaId}`);
      } else {
        router.back();
      }
    } catch (error) {
      console.error('Error uncompleting element:', error);
      Alert.alert('Error', 'Failed to uncomplete element');
    }
  };

  const renderCompletedItem = ({ item }: { item: CompletedItem }) => (
    <Pressable 
      onPress={() => handleUncomplete(item.id)}
      style={({ pressed }) => [
        styles.completedCard,
        { 
          backgroundColor: colors.card,
          opacity: pressed ? 0.7 : 1
        }
      ]}
    >
      <Text style={[typography.h3, { color: colors.text }]}>{item.subject}</Text>
      <Text style={[typography.caption, { color: colors.placeholder }]}>
        {item.agendaName} • Due: {new Date(item.deadline).toLocaleDateString()}
      </Text>
      <Text style={[typography.caption, { color: colors.tint, marginTop: spacing.xs }]}>
        Tap to uncomplete
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={completedItems}
        renderItem={renderCompletedItem}
        keyExtractor={(item) => item.id.toString()}
        style={{ width: '100%' }}
      />
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
  },
  completedCard: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.tint,
    width: '100%',
  },
});
