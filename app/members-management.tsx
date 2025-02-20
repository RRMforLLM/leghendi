import { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { View, Text } from '@/components/Themed';
import { Avatar, Button, Icon } from '@rneui/themed';
import { supabase } from '@/lib/supabase';
import { typography, spacing } from '@/constants/Typography';
import { useLocalSearchParams, router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useNetworkState } from '@/hooks/useNetworkState';
import OfflineBanner from '@/components/OfflineBanner';

const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/avataaars/svg"

interface Member {
  id: string;
  username: string;
  avatar_url: string | null;
  is_editor: boolean;
}

export default function MembersManagementScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { id: agendaId, creatorId } = useLocalSearchParams();
  const isOnline = useNetworkState();
  
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    fetchMembers();
    checkCreatorStatus();
  }, []);

  const checkCreatorStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsCreator(session?.user?.id === creatorId);
  };

  const fetchMembers = async () => {
    try {
      const [membersData, editorsData] = await Promise.all([
        supabase
          .from('Agenda Member')
          .select(`
            user:Profile!user_id(
              id,
              username,
              avatar_url
            )
          `)
          .eq('agenda_id', agendaId),
        supabase
          .from('Agenda Editor')
          .select('user_id')
          .eq('agenda_id', agendaId)
      ]);

      if (membersData.error) throw membersData.error;
      if (editorsData.error) throw editorsData.error;

      // Also fetch creator's profile
      const { data: creator } = await supabase
        .from('Profile')
        .select('id, username, avatar_url')
        .eq('id', creatorId)
        .single();

      const editorIds = editorsData.data.map(e => e.user_id);
      
      const formattedMembers = membersData.data.map(m => ({
        id: m.user.id,
        username: m.user.username,
        avatar_url: m.user.avatar_url,
        is_editor: editorIds.includes(m.user.id)
      }));

      // Add creator at the beginning
      if (creator) {
        formattedMembers.unshift({
          ...creator,
          is_editor: true
        });
      }

      setMembers(formattedMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
      Alert.alert('Error', 'Could not load members');
    } finally {
      setLoading(false);
    }
  };

  const handleMemberAction = async (memberId: string, action: 'remove' | 'promote' | 'demote') => {
    if (!isCreator || memberId === creatorId) return;

    try {
      switch (action) {
        case 'remove':
          await Promise.all([
            supabase
              .from('Agenda Member')
              .delete()
              .eq('user_id', memberId)
              .eq('agenda_id', agendaId),
            supabase
              .from('Agenda Editor')
              .delete()
              .eq('user_id', memberId)
              .eq('agenda_id', agendaId)
          ]);
          break;

        case 'promote':
          await supabase
            .from('Agenda Editor')
            .insert({ user_id: memberId, agenda_id: agendaId });
          break;

        case 'demote':
          await supabase
            .from('Agenda Editor')
            .delete()
            .eq('user_id', memberId)
            .eq('agenda_id', agendaId);
          break;
      }

      await fetchMembers();
    } catch (error) {
      console.error('Member action error:', error);
      Alert.alert('Error', 'Failed to update member status');
    }
  };

  const renderMember = (member: Member) => (
    <Pressable
      key={member.id}
      style={[styles.memberCard, { backgroundColor: theme.card }]}
      onPress={() => {
        if (member.id === creatorId) return;
        router.push(`/user-profile?id=${member.id}`);
      }}
    >
      <View style={[styles.memberInfo, { backgroundColor: theme.card }]}>
        <Avatar
          size={50}
          rounded
          source={{ uri: member.avatar_url || DEFAULT_AVATAR }}
        />
        <View style={[styles.memberTextInfo, { backgroundColor: theme.card }]}>
          <Text style={[typography.body, { color: theme.text }]}>
            {member.username}
          </Text>
          <Text style={[typography.caption, { color: theme.placeholder }]}>
            {member.id === creatorId ? 'Creator' : member.is_editor ? 'Editor' : 'Member'}
          </Text>
        </View>
      </View>

      {isCreator && member.id !== creatorId && (
        <View style={[styles.actions, { backgroundColor: theme.card }]}>
          {member.is_editor ? (
            <Button
              title="Demote"
              type="clear"
              onPress={() => handleMemberAction(member.id, 'demote')}
            />
          ) : (
            <Button
              title="Make Editor"
              type="clear"
              onPress={() => handleMemberAction(member.id, 'promote')}
            />
          )}
          <Icon
            name="trash"
            type="font-awesome-5"
            size={16}
            color={theme.error}
            onPress={() => handleMemberAction(member.id, 'remove')}
          />
        </View>
      )}
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading members...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isOnline && <OfflineBanner />}
      <ScrollView style={styles.scrollView}>
        {members.map(renderMember)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberTextInfo: {
    marginLeft: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
