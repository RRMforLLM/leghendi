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
import { useLanguage } from '@/contexts/LanguageContext';

interface CompletedItem {
  id: number;
  subject: string;
  deadline: string;
  agendaName: string;
  agendaId: string;
  elementId: number;
}

export default function CompletedScreen() {
  const { language, t } = useLanguage();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isOnline = useNetworkState();
  const { items } = useLocalSearchParams();
  const [completedItems, setCompletedItems] = useState<CompletedItem[]>([]);

  useEffect(() => {
    const initializeItems = async () => {
      if (items) {
        const parsedItems = JSON.parse(decodeURIComponent(items as string));
        setCompletedItems(parsedItems);
        await storeData(KEYS.COMPLETED_ITEMS, parsedItems);
      } else {
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

      const updatedItems = completedItems.filter(i => i.elementId !== elementId);
      
      if (updatedItems.length === 0) {
        router.back();
      } else {
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
          backgroundColor: theme.card,
          opacity: pressed ? 0.7 : 1
        }
      ]}
    >
      <Text style={[typography.h3, { color: theme.text }]}>{item.subject}</Text>
      <Text style={[typography.caption, { color: theme.placeholder }]}>
        {item.agendaName} • {t('agenda.due')}: {new Date(item.deadline).toLocaleDateString(language)}
      </Text>
      <Text style={[typography.caption, { color: theme.tint, marginTop: spacing.xs }]}>
        {t('completed.tapToUncomplete')}
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
