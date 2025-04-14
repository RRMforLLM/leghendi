import { StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@rneui/themed';
import Colors from '@/constants/Colors';
import { typography, spacing } from '@/constants/Typography';
import { useColorScheme } from '@/components/useColorScheme';
import { router } from 'expo-router';
import { useNetworkState } from '@/hooks/useNetworkState';
import { storeData, getData, KEYS } from '@/utils/offlineStorage';
import OfflineBanner from '@/components/OfflineBanner';
import VibesDisplay from '@/components/VibesDisplay';
import { useCredits } from '@/hooks/useCredits';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '@/contexts/LanguageContext';
import { SUPPORTED_LANGUAGES, Language } from '@/constants/Translations';

const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/avataaars/svg"

interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  description: string | null;
}

export default function TabTwoScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [users, setUsers] = useState<User[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isOnline = useNetworkState();
  const { credits, setCredits, fetchCredits } = useCredits();
  const { language, t } = useLanguage();

  const fetchUsers = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      if (!isOnline) {
        const cachedUsers = await getData(KEYS.USER_PROFILES);
        if (cachedUsers) {
          setUsers(cachedUsers);
          return;
        }
      }

      const { data, error } = await supabase
        .from('Profile')
        .select('id, username, avatar_url, description')
        .order('username');

      if (error) throw error;

      const sortedData = (data || []).sort((a, b) => {
        if (a.id === user?.id) return -1;
        if (b.id === user?.id) return 1;
        return a.username.localeCompare(b.username);
      });

      setUsers(sortedData);
      await storeData(KEYS.USER_PROFILES, sortedData);
    } catch (error) {
      console.error('Error fetching users:', error);
      const cachedUsers = await getData(KEYS.USER_PROFILES);
      if (cachedUsers) {
        setUsers(cachedUsers);
      }
    }
  }, [isOnline]);

  const fetchUserCredits = useCallback(async () => {
    const amount = await fetchCredits();
    setCredits(amount);
  }, [fetchCredits, setCredits]);

  useFocusEffect(
    useCallback(() => {
      fetchCredits();
    }, [fetchCredits])
  );

  useEffect(() => {
    const loadCachedData = async () => {
      const cachedUsers = await getData(KEYS.USER_PROFILES);
      if (cachedUsers) {
        setUsers(cachedUsers);
      }
    };

    loadCachedData();

    const initialize = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Auth error:', error);
          return;
        }

        setCurrentUserId(user?.id || null);
        await fetchUsers();
        if (user?.id) {
          await fetchUserCredits();
        }
      } catch (error) {
        console.error('Init error:', error);
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setCurrentUserId(session?.user?.id || null);
      await fetchUsers();
      if (session?.user?.id) {
        await fetchUserCredits();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUsers, fetchUserCredits]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  }, [fetchUsers]);

  const handleUserPress = (userId: string) => {
    if (userId === currentUserId) {
      router.push('/three');
      return;
    }
    router.push(`/user-profile?id=${userId}`);
  };

  const renderUser = ({ item }: { item: User }) => (
    <Pressable onPress={() => handleUserPress(item.id)}>
      <View style={[
        styles.userCard,
        { 
          backgroundColor: theme.card,
          borderWidth: item.id === currentUserId ? 1 : 0,
          borderColor: theme.text
        }
      ]}>
        <View style={[styles.userInfo, { backgroundColor: theme.card }]}>
          <Avatar
            size={50}
            rounded
            source={{ uri: item.avatar_url || DEFAULT_AVATAR }}
            containerStyle={styles.avatar}
          />
          <View style={[styles.userTextContainer, { backgroundColor: theme.card }]}>
            <Text 
              style={[typography.h3, { color: theme.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.username}
            </Text>
            {item.description && (
              <Text 
                style={[typography.body, { color: theme.text, opacity: 0.7 }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.description}
              </Text>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {!isOnline && <OfflineBanner />}
      <View style={styles.headerRow}>
        {currentUserId && <VibesDisplay amount={credits} />}
      </View>
      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.text}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={() => (
          <Text style={[typography.body, { color: theme.text }]}>
            {t('userList.noUsers')}
          </Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    padding: spacing.lg,
    paddingBottom: 0,
    position: 'absolute',
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  listContent: {
    flexGrow: 1,
    paddingTop: spacing.xl + spacing.lg,
    padding: spacing.lg,
  },
  userCard: {
    padding: spacing.md,
    borderRadius: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: spacing.md,
  },
  userTextContainer: {
    flex: 1,
  },
  separator: {
    height: spacing.sm,
  },
});
