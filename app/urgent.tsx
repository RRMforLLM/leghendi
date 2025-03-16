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
import { useLanguage } from '@/contexts/LanguageContext';

interface UrgentItem {
  id: number;
  subject: string;
  deadline: string;
  agendaName: string;
  agendaId: string;
}

export default function UrgentScreen() {
  const { language, t } = useLanguage();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isOnline = useNetworkState();
  const { items } = useLocalSearchParams();
  const [urgentItems, setUrgentItems] = useState<UrgentItem[]>([]);

  useEffect(() => {
    const initializeItems = async () => {
      if (items) {
        const parsedItems = JSON.parse(decodeURIComponent(items as string));
        const sortedItems = [...parsedItems].sort((a, b) => 
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        );
        setUrgentItems(sortedItems);
        await storeData(KEYS.URGENT_ITEMS, sortedItems);
      } else {
        const cachedItems = await getData(KEYS.URGENT_ITEMS);
        if (cachedItems) {
          const sortedItems = [...cachedItems].sort((a, b) => 
            new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
          );
          setUrgentItems(sortedItems);
        }
      }
    };

    initializeItems();
  }, [items]);

  const renderUrgentItem = ({ item }: { item: UrgentItem }) => (
    <Pressable 
      onPress={() => router.push(`/agenda/${item.agendaId}`)}
      style={({ pressed }) => [
        styles.elementCard, 
        { 
          backgroundColor: theme.card,
          opacity: pressed ? 0.7 : 1
        }
      ]}
    >
      <View style={styles.elementHeader}>
        <View style={styles.elementContent}>
          <View style={styles.titleRow}>
            <View style={styles.titleMain}>
              <Text style={[styles.elementTitle, { color: theme.text }]}>
                {item.subject}
              </Text>
              <Text style={[styles.deadline, { color: theme.placeholder }]}>
                {item.agendaName} • {t('agenda.due')}: {new Date(item.deadline).toLocaleDateString(language)}
              </Text>
            </View>
          </View>
        </View>
      </View>
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
  elementCard: {
    marginBottom: spacing.xs,
    borderRadius: 8,
    overflow: 'hidden',
    borderLeftWidth: 3,
    borderLeftColor: Colors.light.error,
    width: '100%',
  },
  elementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.sm,
  },
  elementContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleMain: {
    flex: 1,
    marginRight: spacing.sm,
  },
  elementTitle: {
    ...typography.h3,
    fontSize: 15,
    marginBottom: 2,
  },
  deadline: {
    ...typography.caption,
    fontSize: 12,
    opacity: 0.7,
  },
});