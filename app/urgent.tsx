import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, FlatList, Pressable } from 'react-native';
import { View, Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { typography, spacing } from '@/constants/Typography';
import { useColorScheme } from '@/components/useColorScheme';
import { useLocalSearchParams, router } from 'expo-router';

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
  const { items } = useLocalSearchParams();
  
  // Safely parse the items from the URL-encoded JSON string
  const urgentItems: UrgentItem[] = items 
    ? JSON.parse(decodeURIComponent(items as string))
    : [];

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