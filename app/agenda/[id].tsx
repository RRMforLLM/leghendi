import { useEffect, useState, useCallback } from 'react';
import { StyleSheet, FlatList, Alert, View as RNView, ScrollView } from 'react-native';
import { View, Text } from '@/components/Themed';
import { Button, Input, Dialog, Icon, Avatar } from '@rneui/themed';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, router } from 'expo-router';
import { AgendaWithSections, AgendaElement } from '@/types';
import Colors from '@/constants/Colors';
import { typography, spacing } from '@/constants/Typography';  // Add typography import
import { useColorScheme } from '@/components/useColorScheme';
import { getRelativeTime } from '@/utils/dateUtils';

const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/avataaars/svg"

interface AgendaComment {
  id: number;
  text: string;
  created_at: string;
  author: {
    username: string;
    avatar_url: string | null;
  };
}

interface Member {
  id: string;
  username: string;
  avatar_url: string | null;
}

// Custom dialog button without defaultProps warning
const DialogButton = ({ onPress, disabled = false, children }: {
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) => (
  <Button
    onPress={onPress}
    disabled={disabled}
    title={children as string}
    type="clear"
    containerStyle={{ marginHorizontal: 5 }}
  />
);

export default function AgendaScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  // Add session state
  const [session, setSession] = useState(null);
  
  const { id } = useLocalSearchParams();
  const [agenda, setAgenda] = useState<AgendaWithSections | null>(null);
  const [loading, setLoading] = useState(true);
  const [newSectionName, setNewSectionName] = useState('');
  const [newElementData, setNewElementData] = useState({
    subject: '',
    details: '',
    deadline: new Date().toISOString().split('T')[0],
    sectionId: ''
  });
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [showElementDialog, setShowElementDialog] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [comments, setComments] = useState<AgendaComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<{ [key: string]: boolean }>({});
  const [completedElements, setCompletedElements] = useState<{ [key: string]: boolean }>({});
  const [urgentElements, setUrgentElements] = useState<{ [key: string]: boolean }>({});
  const [members, setMembers] = useState<Member[]>([]);

  const fetchAgenda = useCallback(async () => {
    try {
      const [
        { data: agenda, error }, 
        { data: comments, error: commentsError },
        { data: members, error: membersError }
      ] = await Promise.all([
        supabase
          .from("Agenda")
          .select("*")
          .eq("id", id)
          .single(),
        supabase
          .from('Agenda Comment')
          .select(`
            id,
            text,
            created_at,
            author:Profile!author_id(username, avatar_url)
          `)
          .eq('agenda_id', id)
          .order('created_at', { ascending: false }),
        supabase
          .from('Agenda Member')
          .select(`
            user:Profile!user_id(
              id,
              username,
              avatar_url
            )
          `)
          .eq('agenda_id', id)
      ]);

      if (error) throw error;
      if (commentsError) throw commentsError;
      if (membersError) throw membersError;

      // Transform members data
      const membersList = members?.map(m => ({
        id: m.user.id,
        username: m.user.username,
        avatar_url: m.user.avatar_url
      })) || [];

      // Also fetch creator's profile
      const { data: creator } = await supabase
        .from('Profile')
        .select('id, username, avatar_url')
        .eq('id', agenda.creator_id)
        .single();

      if (creator) {
        membersList.unshift(creator); // Add creator at the beginning
      }

      // Check if current user is creator
      const { data: { session } } = await supabase.auth.getSession();
      setIsCreator(session?.user?.id === agenda.creator_id);

      const { data: sectionsData, error: sectionsError } = await supabase
        .from("Agenda Section")
        .select(`
          id,
          name,
          created_at,
          elements:"Agenda Element" ( 
            id,
            subject,
            details,
            deadline,
            status,
            created_at
          )
        `)
        .eq("agenda_id", id)
        .order("created_at", { ascending: true });

      if (sectionsError) throw sectionsError;

      const agendaWithSections: AgendaWithSections = {
        ...agenda,
        sections: sectionsData.map(section => ({
          ...section,
          elements: section.elements || []
        }))
      };

      setMembers(membersList);
      setAgenda(agendaWithSections);
      setComments(comments || []);
    } catch (error) {
      console.error('Error fetching agenda:', error);
      Alert.alert('Error', 'Could not load agenda');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchAgenda();
    return () => { mounted = false };
  }, [fetchAgenda]);

  // Add session fetch in useEffect
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  const fetchElementStates = useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      const [{ data: completed }, { data: urgent }] = await Promise.all([
        supabase
          .from('Completed Element')
          .select('element_id')
          .eq('user_id', session.user.id),
        supabase
          .from('Urgent Element')
          .select('element_id')
          .eq('user_id', session.user.id)
      ]);

      const completedMap = (completed || []).reduce((acc, item) => ({
        ...acc,
        [item.element_id]: true
      }), {});

      const urgentMap = (urgent || []).reduce((acc, item) => ({
        ...acc,
        [item.element_id]: true
      }), {});

      setCompletedElements(completedMap);
      setUrgentElements(urgentMap);
    } catch (error) {
      console.error('Error fetching element states:', error);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchElementStates();
  }, [fetchElementStates]);

  // Add realtime subscription for urgent/completed elements
  useEffect(() => {
    if (!session?.user?.id) return;

    const subscription = supabase
      .channel('element_states_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'Urgent Element',
        filter: `user_id=eq.${session.user.id}`
      }, () => {
        fetchElementStates();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'Completed Element',
        filter: `user_id=eq.${session.user.id}`
      }, () => {
        fetchElementStates();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [session?.user?.id, fetchElementStates]);

  const addSection = async () => {
    try {
      const { error } = await supabase
        .from("Agenda Section")
        .insert([{
          name: newSectionName,
          agenda_id: id
        }])
        .select()
        .single();

      if (error) throw error;
      setShowSectionDialog(false);
      setNewSectionName('');
      await fetchAgenda();
    } catch (error) {
      console.error('Error adding section:', error);
      Alert.alert('Error', 'Could not add section');
    }
  };

  const addElement = async () => {
    try {
      const { error } = await supabase
        .from("Agenda Element")
        .insert([{
          subject: newElementData.subject,
          details: newElementData.details,
          deadline: newElementData.deadline,
          status: "pending",
          section_id: newElementData.sectionId
        }])
        .select()
        .single();

      if (error) throw error;
      setShowElementDialog(false);
      setNewElementData({
        subject: '',
        details: '',
        deadline: new Date().toISOString().split('T')[0],
        sectionId: ''
      });
      await fetchAgenda();
    } catch (error) {
      console.error('Error adding element:', error);
      Alert.alert('Error', 'Could not add element');
    }
  };

  const handleAddElement = (sectionId: string) => {
    setNewElementData(prev => ({
      ...prev,
      sectionId,
      subject: '',
      details: '',
      deadline: new Date().toISOString().split('T')[0]
    }));
    setShowElementDialog(true);
  };

  const handleDeleteElement = (element: AgendaElement) => {
    Alert.alert(
      "Delete Element",
      `Are you sure you want to delete "${element.subject}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("Agenda Element")
                .delete()
                .eq('id', element.id)

              if (error) throw error
              await fetchAgenda()
            } catch (error) {
              console.error('Delete element error:', error)
              Alert.alert('Error', 'Failed to delete element')
            }
          }
        }
      ]
    )
  }

  const toggleElementState = async (elementId: string, type: 'completed' | 'urgent') => {
    if (!session?.user?.id) return;

    const table = type === 'completed' ? 'Completed Element' : 'Urgent Element';
    const stateMap = type === 'completed' ? completedElements : urgentElements;
    const setState = type === 'completed' ? setCompletedElements : setUrgentElements;

    // Optimistically update the UI
    setState(prev => ({
      ...prev,
      [elementId]: !prev[elementId]
    }));

    try {
      if (stateMap[elementId]) {
        // Remove the state
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('user_id', session.user.id)
          .eq('element_id', elementId);

        if (error) throw error;
      } else {
        // Add the state
        const { error } = await supabase
          .from(table)
          .insert({
            user_id: session.user.id,
            element_id: elementId
          });

        if (error) throw error;
      }

      // Fetch fresh state after successful update
      fetchElementStates();
    } catch (error) {
      // Revert UI on error
      setState(prev => ({
        ...prev,
        [elementId]: stateMap[elementId] || false
      }));
      console.error(`Error toggling ${type} state:`, error);
      Alert.alert('Error', `Failed to update element state`);
    }
  };

  const renderElement = ({ item }: { item: AgendaElement }) => (
    <View style={[styles.elementCard, { backgroundColor: theme.card }]}>
      <View style={[styles.elementHeader, { backgroundColor: theme.card }]}>
        <View style={[styles.elementTitleContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.elementTitle, { color: theme.text }]}>{item.subject}</Text>
          <View style={[styles.elementActions, { backgroundColor: theme.card }]}>
            <Icon
              name="exclamation"
              type="font-awesome-5"
              size={14}
              color={urgentElements[item.id] ? theme.error : theme.placeholder}
              onPress={() => toggleElementState(item.id, 'urgent')}
              containerStyle={styles.actionIcon}
            />
            <Icon
              name="check-circle"
              type="font-awesome-5"
              size={14}
              color={completedElements[item.id] ? theme.tint : theme.placeholder}
              onPress={() => toggleElementState(item.id, 'completed')}
              containerStyle={styles.actionIcon}
            />
          </View>
        </View>
        {isCreator && (
          <Icon
            name="trash"
            type="font-awesome-5"
            size={14}
            color={theme.error}
            onPress={() => handleDeleteElement(item)}
            containerStyle={styles.deleteIcon}
          />
        )}
      </View>
      {item.details && (
        <Text style={[styles.elementDetails, { color: theme.text }]}>{item.details}</Text>
      )}
      <View style={[styles.elementMeta, { backgroundColor: theme.card }]}>
        <Text style={[styles.deadline, { color: theme.text }]}>
          Due: {new Date(item.deadline).toLocaleDateString()}
        </Text>
        <Text style={[styles.status, { color: theme.text }]}>{item.status}</Text>
      </View>
    </View>
  );

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const renderSection = ({ item: section }) => (
    <View style={styles.sectionContainer}>
      <View style={[
        styles.sectionHeader, 
        { 
          borderBottomColor: theme.border,
          marginBottom: collapsedSections[section.id] ? 0 : spacing.sm 
        }
      ]}>
        <RNView style={styles.sectionTitleContainer}>
          <Icon
            name={collapsedSections[section.id] ? 'chevron-right' : 'chevron-down'}
            type="font-awesome-5"
            size={14}
            color={theme.text}
            onPress={() => toggleSection(section.id)}
            containerStyle={styles.collapseIcon}
          />
          <Text style={styles.sectionTitle}>{section.name}</Text>
        </RNView>
        {isCreator && (
          <RNView style={styles.sectionActions}>
            <Button
              title="+"
              type="clear"
              onPress={() => handleAddElement(section.id)}
            />
            <Icon
              name="trash"
              type="font-awesome-5"
              size={16}
              color={theme.error}
              onPress={() => handleDeleteSection(section)}
              containerStyle={styles.deleteIcon}
            />
          </RNView>
        )}
      </View>
      {!collapsedSections[section.id] && (
        <FlatList
          data={section.elements}
          renderItem={renderElement}
          keyExtractor={item => item.id}
          style={styles.elementsList}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>No elements in this section</Text>
          )}
        />
      )}
    </View>
  );

  const deleteAgenda = async (agendaId: string, creatorId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user || session.user.id !== creatorId) {
      Alert.alert("Error", "Only the creator can delete an agenda");
      return;
    }
  
    Alert.alert(
      "Delete Agenda",
      "This will permanently delete this agenda and all its contents. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // With CASCADE, we only need to delete the agenda
              const { error } = await supabase
                .from("Agenda")
                .delete()
                .eq('id', agendaId);
  
              if (error) throw error;
              router.replace("/");
            } catch (error) {
              console.error("Delete error:", error);
              Alert.alert("Error", "Failed to delete agenda");
            }
          }
        }
      ]
    );
  };

  const handleDeleteSection = (section) => {
    Alert.alert(
      "Delete Section",
      `Are you sure you want to delete "${section.name}"? This will also delete all elements in this section.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("Agenda Section")
                .delete()
                .eq('id', section.id)

              if (error) throw error
              await fetchAgenda()
            } catch (error) {
              console.error('Delete section error:', error)
              Alert.alert('Error', 'Failed to delete section')
            }
          }
        }
      ]
    )
  }

  const postComment = async () => {
    // Now we can use session here
    if (!session?.user?.id || !commentText.trim()) return;
    
    try {
      setIsPostingComment(true);
      const { error } = await supabase
        .from('Agenda Comment')
        .insert({
          text: commentText.trim(),
          author_id: session.user.id,
          agenda_id: id
        });

      if (error) throw error;
      
      setCommentText('');
      await fetchAgenda();
    } catch (error) {
      console.error('Post comment error:', error);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  const renderComment = ({ item }: { item: AgendaComment }) => (
    <RNView style={[styles.commentContainer, { backgroundColor: theme.card }]}>
      <RNView style={styles.commentHeader}>
        <RNView style={styles.commentAuthor}>
          <Avatar
            size={24}
            rounded
            source={{ uri: item.author.avatar_url || DEFAULT_AVATAR }}
            containerStyle={styles.commentAvatar}
          />
          <Text style={[typography.caption, { color: theme.text }]}>
            {item.author.username}
          </Text>
        </RNView>
        <Text style={[typography.caption, { color: theme.placeholder }]}>
          {getRelativeTime(item.created_at)}
        </Text>
      </RNView>
      <Text style={[typography.body, { color: theme.text }]}>
        {item.text}
      </Text>
    </RNView>
  )

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading agenda...</Text>
      </View>
    );
  }

  if (!agenda) {
    return (
      <View style={styles.container}>
        <Text>Agenda not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{agenda.name}</Text>
          {isCreator && (
            <RNView style={styles.headerActions}>
              <Button
                title="Add Section"
                type="clear"
                onPress={() => setShowSectionDialog(true)}
              />
              <Icon
                name="trash"
                type="font-awesome-5"
                size={16}
                color={theme.error}
                onPress={() => deleteAgenda(agenda.id, agenda.creator_id)}
                containerStyle={styles.deleteIcon}
              />
            </RNView>
          )}
        </View>

        <View style={styles.sectionsContainer}>
          <FlatList
            data={agenda.sections}
            renderItem={renderSection}
            keyExtractor={item => item.id}
            scrollEnabled={false} // Important: disable scrolling on nested FlatList
            ListEmptyComponent={() => (
              <Text style={styles.emptyText}>No sections yet</Text>
            )}
          />
        </View>

        {/* Add Members List */}
        <View style={[styles.membersSection, { marginTop: spacing.xl }]}>
          <Text style={[typography.h3, { color: theme.text, marginBottom: spacing.sm }]}>
            Members
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.membersList}
          >
            {members.map((member) => (
              <View key={member.id} style={styles.memberCard}>
                <Avatar
                  size={60}
                  rounded
                  source={{ uri: member.avatar_url || DEFAULT_AVATAR }}
                  containerStyle={styles.memberAvatar}
                />
                <Text 
                  style={[typography.caption, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {member.username}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.commentsSection}>
          <Text style={[typography.h3, { color: theme.text }]}>Comments</Text>
          
          <RNView style={styles.commentInputContainer}>
            <Input
              placeholder="Add a comment..."
              value={commentText}
              onChangeText={setCommentText}
              multiline
              containerStyle={styles.commentInput}
              inputStyle={{ color: theme.text }}
              rightIcon={
                <Icon
                  name="send"
                  type="font-awesome"
                  color={commentText.trim() ? theme.text : theme.placeholder}
                  size={20}
                  onPress={() => {
                    if (session?.user?.id && commentText.trim()) {
                      postComment()
                    }
                  }}
                  style={{ opacity: commentText.trim() ? 1 : 0.5 }}
                />
              }
            />
          </RNView>

          <View style={styles.commentsList}>
            {comments.length === 0 ? (
              <Text style={[typography.body, { color: theme.placeholder }]}>
                No comments yet. Be the first to comment!
              </Text>
            ) : (
              comments.map(item => (
                <View key={item.id.toString()}>
                  {renderComment({ item })}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Add Section Dialog */}
      <Dialog
        isVisible={showSectionDialog}
        onBackdropPress={() => setShowSectionDialog(false)}
        overlayStyle={[styles.dialog, { backgroundColor: theme.card }]}
      >
        <View style={[styles.dialogContent, { backgroundColor: theme.card }]}>
          <Text style={[typography.h3, { color: theme.text }]}>Add New Section</Text>
          <Input
            placeholder="Section Name"
            value={newSectionName}
            onChangeText={setNewSectionName}
            inputStyle={{ color: theme.text }}
          />
          <View style={[{ flexDirection: 'row', justifyContent: 'flex-end' }, { backgroundColor: theme.card }]}>
            <DialogButton onPress={() => setShowSectionDialog(false)}>
              Cancel
            </DialogButton>
            <DialogButton 
              onPress={addSection}
              disabled={!newSectionName.trim()}
            >
              Add
            </DialogButton>
          </View>
        </View>
      </Dialog>

      {/* Add Element Dialog */}
      <Dialog
        isVisible={showElementDialog}
        onBackdropPress={() => setShowElementDialog(false)}
        overlayStyle={[styles.dialog, { backgroundColor: theme.card }]}
      >
        <View style={[styles.dialogContent, { backgroundColor: theme.card }]}>
          <Text style={[typography.h3, { color: theme.text }]}>Add New Element</Text>
          <Input
            placeholder="Subject"
            value={newElementData.subject}
            onChangeText={(text) => setNewElementData(prev => ({ ...prev, subject: text }))}
            inputStyle={{ color: theme.text }}
          />
          <Input
            placeholder="Details (optional)"
            value={newElementData.details}
            onChangeText={(text) => setNewElementData(prev => ({ ...prev, details: text }))}
            multiline
            inputStyle={{ color: theme.text }}
          />
          <Input
            placeholder="Deadline (YYYY-MM-DD)"
            value={newElementData.deadline}
            onChangeText={(text) => setNewElementData(prev => ({ ...prev, deadline: text }))}
            keyboardType="numbers-and-punctuation"
            inputStyle={{ color: theme.text }}
          />
          <View style={[{ flexDirection: 'row', justifyContent: 'flex-end' }, { backgroundColor: theme.card }]}>
            <DialogButton onPress={() => setShowElementDialog(false)}>
              Cancel
            </DialogButton>
            <DialogButton 
              onPress={addElement}
              disabled={!newElementData.subject.trim() || !newElementData.deadline.trim()}
            >
              Add
            </DialogButton>
          </View>
        </View>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  sectionsList: {
    flex: 1,
  },
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // This should already be here
    borderBottomWidth: 1,
    paddingBottom: spacing.xs,
    minHeight: 40, // Add this to ensure consistent height
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center', // This should already be here
    flex: 1,
    height: '100%', // Add this
  },
  elementsList: {
    marginLeft: spacing.sm,
  },
  elementCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  elementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  elementTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  elementActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionIcon: {
    padding: spacing.xs,
  },
  elementTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  elementDetails: {
    ...typography.body,
    marginBottom: spacing.sm,
    opacity: 0.7,
  },
  elementMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  deadline: {
    ...typography.caption,
    opacity: 0.6,
  },
  status: {
    ...typography.caption,
    fontWeight: '500',
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    opacity: 0.5,
    padding: spacing.md,
  },
  dialog: {
    width: '90%',
    borderRadius: 12,
    padding: spacing.md,
  },
  dialogContent: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: '100%', // Add this
  },
  deleteIcon: {
    padding: spacing.xs,
  },
  commentsSection: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: spacing.lg,
    marginTop: spacing.xl,
  },
  commentContainer: {
    padding: spacing.md,
    borderRadius: 12,
    marginVertical: spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  commentAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  commentAvatar: {
    marginRight: spacing.xs,
  },
  commentInputContainer: {
    marginVertical: spacing.md,
  },
  commentInput: {
    marginBottom: -spacing.lg,
  },
  commentUsername: {
    ...typography.caption,
    fontWeight: '500',
  },
  commentTimestamp: {
    ...typography.caption,
  },
  commentText: {
    ...typography.body,
    lineHeight: 20,
  },
  commentsList: {
    width: '100%',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  sectionsContainer: {
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    height: '100%', // Add this
  },
  collapseIcon: {
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
  membersSection: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  membersList: {
    paddingHorizontal: spacing.sm,
  },
  memberCard: {
    alignItems: 'center',
    marginHorizontal: spacing.xs,
    width: 70,
  },
  memberAvatar: {
    marginBottom: spacing.xs,
  },
});
