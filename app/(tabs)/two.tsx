import { StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@rneui/themed';
import Colors from '@/constants/Colors';
import { typography, spacing } from '@/constants/Typography';
import { useColorScheme } from '@/components/useColorScheme';
import { router } from 'expo-router';

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      // First get the current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      const { data, error } = await supabase
        .from('Profile')
        .select('id, username, avatar_url, description')
        .order('username');

      if (error) throw error;

      // Sort the data to put current user's profile first
      const sortedData = (data || []).sort((a, b) => {
        if (a.id === user?.id) return -1;
        if (b.id === user?.id) return 1;
        return a.username.localeCompare(b.username);
      });

      setUsers(sortedData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  }, [fetchUsers]);

  const handleUserPress = (userId: string) => {
    // If it's the current user's profile, redirect to profile tab
    if (userId === currentUserId) {
      router.push('/three');
      return;
    }
    // Otherwise, open the modal
    router.push(`/user-profile?id=${userId}`);
  };

  const renderUser = ({ item }: { item: User }) => (
    <Pressable onPress={() => handleUserPress(item.id)}>
      <View style={[
        styles.userCard,
        { 
          backgroundColor: theme.card,
          // Optional: Add visual indication for user's own profile
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

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <Text style={{ color: theme.text }}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
          <Text style={[typography.body, { color: theme.text }]}>No users found</Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  listContent: {
    flexGrow: 1,
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
