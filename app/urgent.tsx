import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, FlatList, Pressable } from 'react-native';
import { View, Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { typography, spacing } from '@/constants/Typography';
import { useColorScheme } from '@/components/useColorScheme';
import { useLocalSearchParams, router } from 'expo-router';
import { useNetworkState } from '@/hooks/useNetworkState';
import { storeData, getData, KEYS } from '@/utils/offlineStorage';
import OfflineBanner from '@/components/OfflineBanner';
import { useState, useEffect } from 'react';

interface UrgentItem {
  id: number;
  subject: string;
  deadline: string;
  agendaName: string;
  agendaId: string;
}

export default function UrgentScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const isOnline = useNetworkState();
  const { items } = useLocalSearchParams();
  const [urgentItems, setUrgentItems] = useState<UrgentItem[]>([]);

  useEffect(() => {
    const initializeItems = async () => {
      if (items) {
        const parsedItems = JSON.parse(decodeURIComponent(items as string));
        setUrgentItems(parsedItems);
        // Cache the urgent items whenever we receive new ones
        await storeData(KEYS.URGENT_ITEMS, parsedItems);
      } else {
        // If no items provided via params, try to load from cache
        const cachedItems = await getData(KEYS.URGENT_ITEMS);
        setUrgentItems(cachedItems || []);
      }
    };

    initializeItems();
  }, [items]);

  const renderUrgentItem = ({ item }: { item: UrgentItem }) => (
    <Pressable 
      onPress={() => router.push(`/agenda/${item.agendaId}`)}
      style={({ pressed }) => [
        styles.urgentCard,
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
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {!isOnline && <OfflineBanner />}
      <FlatList
        data={urgentItems}
        renderItem={renderUrgentItem}
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
  urgentCard: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.error,
    width: '100%',
  },
});