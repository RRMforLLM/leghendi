import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { View, Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { typography, spacing } from '@/constants/Typography';
import { useColorScheme } from '@/components/useColorScheme';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useNetworkState } from '@/hooks/useNetworkState';
import { storeData, getData, KEYS } from '@/utils/offlineStorage';
import OfflineBanner from '@/components/OfflineBanner';
import { useState, useEffect } from 'react';

interface CompletedItem {
  id: number;
  subject: string;
  deadline: string;
  agendaName: string;
  agendaId: string;
  elementId: number; // Add this to store the actual element_id
}

export default function CompletedScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const isOnline = useNetworkState();
  const { items } = useLocalSearchParams();
  const [completedItems, setCompletedItems] = useState<CompletedItem[]>([]);

  useEffect(() => {
    const initializeItems = async () => {
      if (items) {
        const parsedItems = JSON.parse(decodeURIComponent(items as string));
        setCompletedItems(parsedItems);
        // Cache the completed items whenever we receive new ones
        await storeData(KEYS.COMPLETED_ITEMS, parsedItems);
      } else {
        // If no items provided via params, try to load from cache
        const cachedItems = await getData(KEYS.COMPLETED_ITEMS);
        setCompletedItems(cachedItems || []);
      }
    };

    initializeItems();
  }, [items]);

  const handleUncomplete = async (elementId: number) => {
    if (!isOnline) {
      Alert.alert('Error', 'Cannot uncomplete items while offline');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const { error } = await supabase
        .from('Completed Element')
        .delete()
        .eq('user_id', session.user.id)
        .eq('element_id', elementId);

      if (error) throw error;

      // Update the local state by removing the uncompleted item
      const updatedItems = completedItems.filter(i => i.elementId !== elementId);
      
      if (updatedItems.length === 0) {
        // If no items left, go back
        router.back();
      } else {
        // Update the URL with remaining items
        router.setParams({
          items: encodeURIComponent(JSON.stringify(updatedItems))
        });
      }
    } catch (error) {
      console.error('Error uncompleting element:', error);
      Alert.alert('Error', 'Failed to uncomplete element');
    }
  };

  const renderCompletedItem = ({ item }: { item: CompletedItem }) => (
    <Pressable 
      onPress={() => handleUncomplete(item.elementId)}
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
      {!isOnline && <OfflineBanner />}
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
