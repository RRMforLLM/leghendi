import { useEffect, useState, useCallback } from 'react';
import { StyleSheet, FlatList, View as RNView, ScrollView, Pressable, Alert, Platform, Modal, RefreshControl } from 'react-native';
import { View, Text } from '@/components/Themed';
import { Button, Input, Dialog, Icon, Avatar } from '@rneui/themed';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { AgendaWithSections, AgendaElement } from '@/types';
import Colors from '@/constants/Colors';
import { typography, spacing } from '@/constants/Typography';
import { useColorScheme } from '@/components/useColorScheme';
import { getRelativeTime } from '@/utils/dateUtils';
import { useFocusEffect } from '@react-navigation/native';
import { useNetworkState } from '@/hooks/useNetworkState';
import { storeAgendaData, getAgendaData, KEYS, storeData, getData } from '@/utils/offlineStorage';
import OfflineBanner from '@/components/OfflineBanner';
import { useLanguage } from '@/contexts/LanguageContext';
import DatePickerInput from '@/components/DatePickerInput';
import TruncatedText from '@/components/TruncatedText';

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
  const navigation = useNavigation();
  const { t, language } = useLanguage();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isOnline = useNetworkState();
  
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
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editors, setEditors] = useState<string[]>([]);
  const [isEditingMembers, setIsEditingMembers] = useState(false);
  const [showCompletedButton, setShowCompletedButton] = useState(false);
  const [isEditor, setIsEditor] = useState(false);

  const [showEditElementDialog, setShowEditElementDialog] = useState(false);
  const [editingElement, setEditingElement] = useState<AgendaElement | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: t('agenda.header'),
      headerBackTitle: t('tabs.home'),

      headerLeft: Platform.select({
        ios: undefined,
        android: () => (
          <Pressable 
            onPress={() => navigation.goBack()}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              padding: spacing.sm,
              marginLeft: spacing.xs
            })}
          >
            <Icon
              name="arrow-back"
              type="material"
              size={24}
              color={theme.text}
            />
          </Pressable>
        )
      })
    });
  }, [navigation, theme.text, t]);

  const fetchAgenda = useCallback(async () => {
    try {
      if (!isOnline) {
        const cachedData = await getAgendaData(id as string);
        if (cachedData) {
          setAgenda(cachedData.agenda);
          setComments(cachedData.comments);
          setMembers(cachedData.members);
          setEditors(cachedData.editors);
          const completedMap = cachedData.completedElements || {};
          setCompletedElements(completedMap);
          setShowCompletedButton(Object.keys(completedMap).length > 0);
          return;
        }
      }

      const [
        { data: agenda, error }, 
        { data: comments, error: commentsError },
        { data: members, error: membersError },
        { data: editors, error: editorsError }
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
          .eq('agenda_id', id),
        supabase
          .from('Agenda Editor')
          .select('user_id')
          .eq('agenda_id', id)
      ]);

      if (error) throw error;
      if (commentsError) throw commentsError;
      if (membersError) throw membersError;
      if (editorsError) throw editorsError;

      const membersList = members?.map(m => ({
        id: m.user.id,
        username: m.user.username,
        avatar_url: m.user.avatar_url
      })) || [];

      const { data: creator } = await supabase
        .from('Profile')
        .select('id, username, avatar_url')
        .eq('id', agenda.creator_id)
        .single();

      if (creator) {
        membersList.unshift(creator);
      }

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

      const completedMap = {};
      const { data: completedData } = await supabase
        .from('Completed Element')
        .select('element_id')
        .eq('user_id', session?.user?.id)
        .eq('agenda_id', id);

      (completedData || []).forEach(item => {
        completedMap[item.element_id] = true;
      });

      setCompletedElements(completedMap);
      setShowCompletedButton(Object.keys(completedMap).length > 0);

      const filteredSections = sectionsData.map(section => ({
        ...section,
        elements: (section.elements || []).filter(element => 
          !completedMap[element.id]
        )
      }));

      const agendaWithSections: AgendaWithSections = {
        ...agenda,
        sections: filteredSections
      };

      const hasCompletedElements = Object.keys(completedElements).length > 0;
      setShowCompletedButton(hasCompletedElements);

      setMembers(membersList);
      setAgenda(agendaWithSections);
      setComments(comments || []);

      const editorIds = editors?.map(e => e.user_id) || [];
      setEditors(editorIds);

      await fetchElementStates();

      await storeAgendaData(id as string, {
        agenda: agendaWithSections,
        comments: comments || [],
        members: membersList,
        editors: editorIds,
        completedElements: completedMap
      });
    } catch (error) {
      console.error('Error fetching agenda:', error);
      const cachedData = await getAgendaData(id as string);
      if (cachedData) {
        setAgenda(cachedData.agenda);
        setComments(cachedData.comments);
        setMembers(cachedData.members);
        setEditors(cachedData.editors);
        const completedMap = cachedData.completedElements || {};
        setCompletedElements(completedMap);
        setShowCompletedButton(Object.keys(completedMap).length > 0);
      } else {
        Alert.alert('Error', 'Could not load agenda');
      }
    } finally {
      setLoading(false);
    }
  }, [id, isOnline, session?.user?.id]);

  const checkEditorStatus = useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('Agenda Editor')
        .select('user_id')
        .eq('agenda_id', id)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) throw error;
      setIsEditor(!!data);
    } catch (error) {
      console.error('Error checking editor status:', error);
    }
  }, [session?.user?.id, id]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      fetchAgenda(),
      checkEditorStatus()
    ]).finally(() => {
      if (mounted) {
        setLoading(false);
      }
    });
    return () => { mounted = false };
  }, [fetchAgenda, checkEditorStatus]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (session?.user?.id) {
        fetchElementStates();
      }
    }, [session?.user?.id])
  );

  useFocusEffect(
    useCallback(() => {
      if (session?.user?.id) {
        const checkCompletedElements = async () => {
          const completedMap = completedElements;
          setShowCompletedButton(Object.keys(completedMap).length > 0);
        };
        checkCompletedElements();
      }
    }, [session?.user?.id, completedElements])
  );

  useEffect(() => {
    if (completedElements && Object.keys(completedElements).length > 0) {
      setShowCompletedButton(true);
    }
  }, [completedElements]);

  const fetchElementStates = async () => {
    if (!session?.user?.id) return;
    
    try {
      const [{ data: completed }, { data: urgent }] = await Promise.all([
        supabase
          .from('Completed Element')
          .select('element_id')
          .eq('user_id', session.user.id)
          .eq('agenda_id', id),
        supabase
          .from('Urgent Element')
          .select('element_id')
          .eq('user_id', session.user.id)
          .eq('agenda_id', id)
      ]);

      const completedMap = {};
      const urgentMap = {};

      (completed || []).forEach(item => {
        completedMap[item.element_id] = true;
      });

      (urgent || []).forEach(item => {
        urgentMap[item.element_id] = true;
      });

      setCompletedElements(completedMap);
      setUrgentElements(urgentMap);
      setShowCompletedButton(Object.keys(completedMap).length > 0);

      await storeAgendaData(id as string, {
        ...(await getAgendaData(id as string) || {}),
        completedElements: completedMap,
        urgentElements: urgentMap
      });
    } catch (error) {
      console.error('Error fetching element states:', error);
      const cachedData = await getAgendaData(id as string);
      if (cachedData?.completedElements) {
        setCompletedElements(cachedData.completedElements);
        setShowCompletedButton(Object.keys(cachedData.completedElements).length > 0);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (session?.user?.id) {
        const loadCache = async () => {
          const cachedData = await getAgendaData(id as string);
          if (cachedData?.completedElements) {
            setCompletedElements(cachedData.completedElements);
            setShowCompletedButton(Object.keys(cachedData.completedElements).length > 0);
          }
        };
        loadCache();

        if (isOnline) {
          fetchElementStates();
        }
      }
    }, [session?.user?.id, isOnline])
  );

  const addSection = async () => {
    const cleanName = newSectionName.trim();
    if (cleanName.length > 15) {
      Alert.alert(t('agenda.error'), t('agenda.error.sectionNameTooLong'));
      return;
    }

    if (!/^[a-zA-Z0-9\s]+$/.test(cleanName)) {
      Alert.alert(t('agenda.error'), t('agenda.error.sectionNameInvalid'));
      return;
    }

    try {
      const { error } = await supabase
        .from("Agenda Section")
        .insert([{
          name: cleanName,
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
    const cleanSubject = newElementData.subject.trim();
    if (cleanSubject.length > 15) {
      Alert.alert(t('agenda.error'), t('agenda.error.elementSubjectTooLong'));
      return;
    }

    if (!/^[a-zA-Z0-9\s]+$/.test(cleanSubject)) {
      Alert.alert(t('agenda.error'), t('agenda.error.elementSubjectInvalid'));
      return;
    }

    try {
      const { data, error } = await supabase
        .from("Agenda Element")
        .insert([{
          subject: cleanSubject,
          details: newElementData.details,
          deadline: newElementData.deadline,
          status: "pending",
          section_id: newElementData.sectionId.toString()
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
      t('agenda.deleteElement'),
      t('agenda.deleteElementConfirm').replace('{name}', element.subject),
      [
        { text: t('agenda.cancel'), style: "cancel" },
        {
          text: t('settings.delete'),
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
  
    try {
      if (type === 'completed') {
        if (completedElements[elementId]) {
          const { error } = await supabase
            .from('Completed Element')
            .delete()
            .eq('user_id', session.user.id)
            .eq('element_id', elementId);
  
          if (error) throw error;
        } else {
          await Promise.all([
            supabase
              .from('Completed Element')
              .insert({
                user_id: session.user.id,
                element_id: elementId,
                agenda_id: id
              }),
            supabase
              .from('Urgent Element')
              .delete()
              .eq('user_id', session.user.id)
              .eq('element_id', elementId)
          ]);
        }
      } else if (type === 'urgent') {
        if (urgentElements[elementId]) {
          const { error } = await supabase
            .from('Urgent Element')
            .delete()
            .eq('user_id', session.user.id)
            .eq('element_id', elementId)
            .eq('agenda_id', id);
  
          if (error) throw error;
        } else {
          if (!completedElements[elementId]) {
            const { error } = await supabase
              .from('Urgent Element')
              .insert({
                user_id: session.user.id,
                element_id: elementId,
                agenda_id: id
              });
  
            if (error) throw error;
          }
        }
      }

      await Promise.all([
        fetchElementStates(),
        fetchAgenda()
      ]);
  
    } catch (error) {
      console.error(`Error toggling ${type} state:`, error);
      Alert.alert('Error', `Failed to update element state`);
    }
  };

  const handleEditElement = async () => {
    if (!editingElement) return;
  
    try {
      const { error } = await supabase
        .from("Agenda Element")
        .update({
          subject: editingElement.subject,
          details: editingElement.details,
          deadline: editingElement.deadline,
        })
        .eq('id', editingElement.id);
  
      if (error) throw error;
      
      setShowEditElementDialog(false);
      setEditingElement(null);
      await fetchAgenda();
    } catch (error) {
      console.error('Edit element error:', error);
      Alert.alert(t('agenda.error'), t('agenda.errorEditElement'));
    }
  };

  const renderElement = ({ item }: { item: AgendaElement }) => (
    <View style={[styles.elementCard, { backgroundColor: theme.card }]}>
      <View style={[styles.elementHeader, { backgroundColor: theme.card }]}>
        <View style={[styles.elementTitleContainer, { backgroundColor: theme.card }]}>
          <Text 
            style={[styles.elementTitle, { color: theme.text }]}
            numberOfLines={1} 
            ellipsizeMode="tail"
          >
            {item.subject}
          </Text>
          <View style={[styles.elementActions, { backgroundColor: theme.card }]}>
            {(isCreator || isEditor) && (
              <Icon
                name="edit"
                type="font-awesome-5"
                size={14}
                color={theme.text}
                onPress={() => {
                  setEditingElement(item);
                  setShowEditElementDialog(true);
                }}
                containerStyle={styles.actionIcon}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              />
            )}
            <Icon
              name="exclamation"
              type="font-awesome-5"
              size={14}
              color={urgentElements[item.id] ? theme.error : theme.placeholder}
              onPress={() => toggleElementState(item.id, 'urgent')}
              containerStyle={styles.actionIcon}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            />
            <Icon
              name="check-circle"
              type="font-awesome-5"
              size={14}
              color={completedElements[item.id] ? theme.tint : theme.placeholder}
              onPress={() => toggleElementState(item.id, 'completed')}
              containerStyle={styles.actionIcon}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            />
          </View>
        </View>
        {(isCreator || isEditor) && (
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
        <TruncatedText 
          text={item.details} 
          textStyle={[styles.elementDetails, { color: theme.text }]}
        />
      )}
      <View style={[styles.elementMeta, { backgroundColor: theme.card }]}>
        <Text style={[styles.deadline, { color: theme.text }]}>
          {t('agenda.due')}: {new Date(item.deadline).toLocaleDateString(language)}
        </Text>
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
        <Pressable 
          onPress={() => toggleSection(section.id)}
          style={styles.sectionTitleContainer}
        >
          <Icon
            name={collapsedSections[section.id] ? 'chevron-up' : 'chevron-down'}
            type="font-awesome-5"
            size={14}
            color={theme.text}
            containerStyle={styles.collapseIcon}
          />
          <Text 
            style={styles.sectionTitle}
            numberOfLines={1} 
            ellipsizeMode="tail"
          >
            {section.name}
            {collapsedSections[section.id] && (
              <Text style={[styles.elementCount, { color: theme.placeholder }]}>
                {` (${section.elements?.filter(e => !completedElements[e.id]).length || 0})`}
              </Text>
            )}
          </Text>
        </Pressable>
        {(isCreator || isEditor) && (
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
          keyExtractor={item => `element-${item.id}`}
          style={styles.elementsList}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>{t('agenda.noElements')}</Text>
          )}
        />
      )}
    </View>
  );

  const deleteAgenda = async (agendaId: string, creatorId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user || session.user.id !== creatorId) {
      Alert.alert(t('agenda.error'), "Only the creator can delete an agenda");
      return;
    }
  
    Alert.alert(
      t('agenda.deleteAgenda'),
      t('agenda.deleteAgendaConfirm'),
      [
        { text: t('agenda.cancel'), style: "cancel" },
        {
          text: t('settings.delete'),
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("Agenda")
                .delete()
                .eq('id', agendaId);
              if (error) throw error;

              const cachedData = await getData(KEYS.AGENDAS);
              if (cachedData) {
                const updatedAgendas = cachedData.filter(a => a.id !== agendaId);
                await storeData(KEYS.AGENDAS, updatedAgendas);
              }

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
      t('agenda.deleteSection'),
      t('agenda.deleteSectionConfirm').replace('{name}', section.name),
      [
        { text: t('agenda.cancel'), style: "cancel" },
        {
          text: t('settings.delete'),
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
          {getRelativeTime(item.created_at, t, language)}
        </Text>
      </RNView>
      <TruncatedText text={item.text} />
    </RNView>
  );

  const navigateToCompleted = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const cachedData = await getAgendaData(id as string);
      if (cachedData?.completedElements) {
        const sections = cachedData.agenda?.sections || [];
        const completedIds = Object.keys(cachedData.completedElements);

        const formattedItems = sections.flatMap(section => 
          section.elements
            ?.filter(element => completedIds.includes(element.id.toString()))
            ?.map(element => ({
              id: element.id,
              elementId: element.id,
              subject: element.subject,
              deadline: element.deadline,
              agendaName: cachedData.agenda.name,
              agendaId: id,
              sectionId: section.id
            }))
        ).filter(Boolean);

        if (formattedItems?.length > 0) {
          router.push({
            pathname: "/completed",
            params: { 
              items: encodeURIComponent(JSON.stringify(formattedItems))
            }
          });
          return;
        }
      }

      if (isOnline) {
        const { data: completedData, error } = await supabase
          .from('Completed Element')
          .select(`
            element_id,
            element:"Agenda Element"!inner (
              id,
              subject,
              deadline,
              section:"Agenda Section"!inner (
                id,
                name,
                agenda:Agenda!inner (
                  id,
                  name
                )
              )
            )
          `)
          .eq('user_id', session.user.id)
          .eq('agenda_id', id);
        if (error) throw error;
2
        const formattedItems = completedData?.map(item => ({
          id: item.element.id,
          elementId: item.element_id,
          subject: item.element.subject,
          deadline: item.element.deadline,
          agendaName: item.element.section.agenda.name,
          agendaId: item.element.section.agenda.id,
          sectionId: item.element.section.id
        })) || [];

        await storeAgendaData(id as string, {
          ...(cachedData || {}),
          completedItems: formattedItems
        });

        if (formattedItems.length === 0) {
          Alert.alert('No completed items', 'You have no completed items in this agenda');
          return;
        }

        router.push({
          pathname: "/completed",
          params: { 
            items: encodeURIComponent(JSON.stringify(formattedItems))
          }
        });
      } else {
        Alert.alert('No completed items', 'You have no completed items in this agenda');
      }

    } catch (error) {
      console.error('Error fetching completed elements:', error);
      Alert.alert('Error', 'Failed to load completed elements');
    }
  }, [id, isOnline]);

  const handleLeaveAgenda = async () => {
    if (!session?.user?.id) return;

    Alert.alert(
      t('agenda.leaveAgenda'),
      t('agenda.leaveAgendaConfirm'),
      [
        { text: t('agenda.cancel'), style: "cancel" },
        {
          text: t('agenda.leaveAgenda'),
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("Agenda Member")
                .delete()
                .eq('user_id', session.user.id)
                .eq('agenda_id', id);

              if (error) throw error;

              try {
                const cachedData = await getData(KEYS.AGENDAS) || [];
                const updatedAgendas = cachedData.filter(a => a.id !== id);
                await storeData(KEYS.AGENDAS, updatedAgendas);
                await storeAgendaData(id as string, null);
              } catch (storageError) {
                console.log('Cache update error:', storageError);
              }

              router.replace("/");
            } catch (error) {
              console.error("Leave agenda error:", error);
              Alert.alert(t('agenda.error'), t('agenda.errorLeave'));
            }
          }
        }
      ]
    );
  };

  const renderCalendarButton = () => (
    <Icon
      name="calendar-week"
      type="font-awesome-5"
      size={24}
      color={theme.text}
      onPress={() => {
        const elements = agenda?.sections.flatMap(section => 
          section.elements.map(element => ({
            ...element,
            isUrgent: urgentElements[element.id],
            sectionId: section.id,
            sectionName: section.name
          }))
        ).filter(element => !completedElements[element.id]) || [];

        router.push({
          pathname: "/calendar",
          params: { 
            elements: encodeURIComponent(JSON.stringify(elements))
          }
        });
      }}
      containerStyle={{ marginHorizontal: spacing.sm }}
    />
  );

  const toggleComments = async () => {
    if (!isCreator || !agenda) return;
    
    try {
      const { error } = await supabase
        .from('Agenda')
        .update({ comments: !agenda.comments })
        .eq('id', id);

      if (error) throw error;

      setAgenda(prev => prev ? { ...prev, comments: !prev.comments } : null);
    } catch (error) {
      console.error('Toggle comments error:', error);
      Alert.alert(t('settings.error'), t('agenda.error.toggleComments'));
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      fetchAgenda(),
      fetchElementStates(),
      checkEditorStatus()
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [fetchAgenda, fetchElementStates, checkEditorStatus]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>{t('agenda.loading')}</Text>
      </View>
    );
  }

  if (!agenda) {
    return (
      <View style={styles.container}>
        <Text>{t('agenda.notFound')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isOnline && <OfflineBanner />}
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.text}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>{agenda.name}</Text>
          <RNView style={styles.headerActions}>
            {isCreator ? (
              <RNView style={styles.headerActions}>
                <Button
                  title={t('agenda.addSection')}
                  type="clear"
                  onPress={() => setShowSectionDialog(true)}
                />
                {renderCalendarButton()}
                <Icon
                  name="trash"
                  type="font-awesome-5"
                  size={24}
                  color={theme.error}
                  onPress={() => deleteAgenda(agenda.id, agenda.creator_id)}
                  containerStyle={styles.deleteIcon}
                />
              </RNView>
            ) : (
              <RNView style={styles.headerActions}>
                {isEditor && (
                  <Button
                    title={t('agenda.addSection')}
                    type="clear"
                    onPress={() => setShowSectionDialog(true)}
                  />
                )}
                {renderCalendarButton()}
                <Icon
                  name="sign-out-alt"
                  type="font-awesome-5"
                  size={24}
                  color={theme.error}
                  onPress={handleLeaveAgenda}
                  containerStyle={styles.deleteIcon}
                />
              </RNView>
            )}
          </RNView>
        </View>
        <View style={styles.sectionsContainer}>
          <FlatList
            data={agenda.sections}
            renderItem={renderSection}
            keyExtractor={item => `section-${item.id}`}
            scrollEnabled={false}
            ListEmptyComponent={() => (
              <Text style={styles.emptyText}>{t('agenda.noSections')}</Text>
            )}
          />
        </View>

        {completedElements && Object.keys(completedElements).length > 0 && (
          <Pressable 
            onPress={navigateToCompleted}
            style={({ pressed }) => [
              styles.actionButton,
              { 
                backgroundColor: theme.card, 
                opacity: pressed ? 0.7 : 1
              }
            ]}
          >
            <Icon
              name="check-circle"
              type="font-awesome-5"
              size={16}
              color={theme.tint}
              containerStyle={{ marginRight: spacing.xs }}
            />
            <Text style={[typography.body, { color: theme.text }]}>
              {t('agenda.viewCompleted').replace('{count}', Object.keys(completedElements).length.toString())}
            </Text>
          </Pressable>
        )}

        <View style={[styles.membersSection, { marginTop: spacing.xl }]}>
          <RNView style={styles.sectionHeader}>
            <Text style={[typography.h3, { color: theme.text }]}>
              {t('agenda.members').replace('{count}', members.length.toString())}
            </Text>
            {isCreator && (
              <Icon
                name="users-cog"
                type="font-awesome-5"
                size={16}
                color={theme.text}
                onPress={() => router.push({
                  pathname: "members-management",
                  params: { 
                    id: agenda.id, 
                    creatorId: agenda.creator_id 
                  }
                })}
              />
            )}
          </RNView>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.membersList}
          >
            {members.map((member) => (
              <Pressable 
                key={member.id}
                onPress={() => {
                  if (isEditingMembers && isCreator && member.id !== agenda?.creator_id) {
                    setSelectedMember(member);
                    setShowMemberDialog(true);
                  } else if (session?.user?.id === member.id) {
                    router.push('/three');
                  } else {
                    router.push(`/user-profile?id=${member.id}`);
                  }
                }}
              >
                <View style={[
                  styles.memberCard,
                  isEditingMembers && isCreator && member.id !== agenda?.creator_id && 
                    styles.memberCardEditing
                ]}>
                  <Avatar
                    size={60}
                    rounded
                    source={{ uri: member.avatar_url || DEFAULT_AVATAR }}
                    containerStyle={styles.memberAvatar}
                  />
                  <Text style={[typography.caption, { color: theme.text }]} numberOfLines={1}>
                    {member.username}
                    {editors.includes(member.id) && ' (Editor)'}
                    {member.id === agenda?.creator_id && ' (Creator)'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>

          <Dialog 
            isVisible={showMemberDialog && !!selectedMember && selectedMember.id !== agenda?.creator_id}
            onBackdropPress={() => {
              setShowMemberDialog(false);
              setSelectedMember(null);
            }} 
            overlayStyle={[styles.dialog, { backgroundColor: theme.card }]}
          >
          </Dialog>
        </View>

        <View style={styles.commentsSection}>
          <View style={styles.commentsSectionHeader}>
            <Text style={[typography.h3, { color: theme.text }]}>
              {t('agenda.comments')}
            </Text>
            {isCreator && (
              <Icon
                name="comments"
                type="font-awesome-5"
                size={20}
                color={agenda.comments ? theme.tint : theme.placeholder}
                onPress={toggleComments}
              />
            )}
          </View>
          
          {agenda.comments ? (
            <>
              <RNView style={styles.commentInputContainer}>
                <Input
                  placeholder={t('agenda.addComment')}
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
                    {t('agenda.noComments')}
                  </Text>
                ) : (
                  comments.map(item => (
                    <View key={item.id.toString()}>
                      {renderComment({ item })}
                    </View>
                  ))
                )}
              </View>
            </>
          ) : (
            <Text style={[styles.disabledMessage, { color: theme.placeholder }]}>
              {t('agenda.commentsDisabled')}
            </Text>
          )}
        </View>
      </ScrollView>

      <Dialog
        isVisible={showSectionDialog}
        onBackdropPress={() => setShowSectionDialog(false)} 
        overlayStyle={[styles.dialog, { backgroundColor: theme.card }]}
      >
        <View style={[styles.dialogContent, { backgroundColor: theme.card }]}>
          <Text style={[typography.h3, { color: theme.text }]}>{t('agenda.newSection')}</Text>
          <Input
            placeholder={t('agenda.newSection')}
            value={newSectionName}
            onChangeText={setNewSectionName}
            inputStyle={{ color: theme.text }}
          />
          <View style={[{ flexDirection: 'row', justifyContent: 'flex-end' }, { backgroundColor: theme.card }]}>
            <DialogButton onPress={() => setShowSectionDialog(false)}>
              {t('agenda.cancel')}
            </DialogButton>
            <DialogButton 
              onPress={addSection} 
              disabled={!newSectionName.trim()}
            >
              {t('agenda.add')}
            </DialogButton>
          </View>
        </View>
      </Dialog>

      <Dialog
        isVisible={showElementDialog}
        onBackdropPress={() => setShowElementDialog(false)} 
        overlayStyle={[styles.dialog, { backgroundColor: theme.card }]}
      >
        <View style={[styles.dialogContent, { backgroundColor: theme.card }]}>
          <Text style={[typography.h3, { color: theme.text }]}>{t('agenda.addElement')}</Text>
          <Input
            placeholder={t('agenda.elementSubject')}
            value={newElementData.subject}
            onChangeText={(text) => setNewElementData(prev => ({ ...prev, subject: text }))}
            inputStyle={{ color: theme.text }}
          />
          <Input
            placeholder={t('agenda.elementDetails')}
            value={newElementData.details}
            onChangeText={(text) => setNewElementData(prev => ({ ...prev, details: text }))}
            multiline
            inputStyle={{ color: theme.text }}
          />
          <DatePickerInput
            value={newElementData.deadline}
            onChange={(date) => setNewElementData(prev => ({ ...prev, deadline: date }))}
            placeholder={t('agenda.elementDeadline')}
            inputStyle={{ color: theme.text }}
          />
          <View style={[{ flexDirection: 'row', justifyContent: 'flex-end' }, { backgroundColor: theme.card }]}>
            <DialogButton onPress={() => setShowElementDialog(false)}>
              {t('agenda.cancel')}
            </DialogButton>
            <DialogButton 
              onPress={addElement} 
              disabled={!newElementData.subject.trim() || !newElementData.deadline}
            >
              {t('agenda.add')}
            </DialogButton>
          </View>
        </View>
      </Dialog>

      <Dialog
        isVisible={showEditElementDialog}
        onBackdropPress={() => {
          setShowEditElementDialog(false);
          setEditingElement(null);
        }} 
        overlayStyle={[styles.dialog, { backgroundColor: theme.card }]}
      >
        <View style={[styles.dialogContent, { backgroundColor: theme.card }]}>
          <Text style={[typography.h3, { color: theme.text }]}>{t('agenda.editElement')}</Text>
          <Input
            placeholder={t('agenda.elementSubject')}
            value={editingElement?.subject}
            onChangeText={(text) => setEditingElement(prev => prev ? { ...prev, subject: text } : null)}
            inputStyle={{ color: theme.text }}
          />
          <Input
            placeholder={t('agenda.elementDetails')}
            value={editingElement?.details}
            onChangeText={(text) => setEditingElement(prev => prev ? { ...prev, details: text } : null)}
            multiline
            inputStyle={{ color: theme.text }}
          />
          <DatePickerInput
            value={editingElement?.deadline}
            onChange={(date) => setEditingElement(prev => prev ? { ...prev, deadline: date } : null)}
            placeholder={t('agenda.elementDeadline')}
            inputStyle={{ color: theme.text }}
          />
          <View style={[{ flexDirection: 'row', justifyContent: 'flex-end' }, { backgroundColor: theme.card }]}>
            <DialogButton onPress={() => {
              setShowEditElementDialog(false);
              setEditingElement(null);
            }}>
              {t('agenda.cancel')}
            </DialogButton>
            <DialogButton 
              onPress={handleEditElement} 
              disabled={!editingElement?.subject?.trim() || !editingElement?.deadline}
            >
              {t('agenda.save')}
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
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    paddingBottom: spacing.xs,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    height: '100%',
    cursor: 'pointer',
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
    marginBottom: 1,
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
    height: '100%',
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
    height: '100%',
    cursor: 'pointer',
  },
  collapseIcon: {
    marginRight: spacing.sm,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  memberCardEditing: {
    opacity: 0.8,
    borderWidth: 2,
    borderColor: Colors.light.tint,
    borderRadius: 8,
    padding: spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  commentsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  disabledMessage: {
    ...typography.body,
    textAlign: 'center',
    paddingVertical: spacing.md,
    fontStyle: 'italic',
  },
  elementCount: {
    ...typography.caption,
    fontWeight: 'normal',
  },
});