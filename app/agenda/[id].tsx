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
const LONG_PRESS_DURATION = 500; // 500ms = 0.5 seconds

interface AgendaComment {
  id: number;
  text: string;
  created_at: string;
  author: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface Member {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface ExpandedElements {
  [key: string]: boolean;
}

interface AgendaEditingState {
  sections: { [key: string]: boolean };
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
  const [expandedElements, setExpandedElements] = useState<ExpandedElements>({});
  const [editingState, setEditingState] = useState<AgendaEditingState>({ sections: {} });
  const [editingSectionName, setEditingSectionName] = useState<{ [key: string]: string }>({});
  const [isNewSectionNameValid, setIsNewSectionNameValid] = useState(true);
  const [isNewElementSubjectValid, setIsNewElementSubjectValid] = useState(true);
  const [isEditingSectionNameValid, setIsEditingSectionNameValid] = useState(true);
  const [isEditingElementSubjectValid, setIsEditingElementSubjectValid] = useState(true);
  const [pressedCommentId, setPressedCommentId] = useState<number | null>(null);

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
            author:Profile!author_id(
              id,
              username,
              avatar_url
            )
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
      }
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
    // Load cached data immediately
    const loadCachedData = async () => {
      const cachedData = await getAgendaData(id as string);
      if (cachedData) {
        setAgenda(cachedData.agenda);
        setComments(cachedData.comments);
        setMembers(cachedData.members);
        setEditors(cachedData.editors);
        const completedMap = cachedData.completedElements || {};
        setCompletedElements(completedMap);
        setShowCompletedButton(Object.keys(completedMap).length > 0);
      }
    };

    loadCachedData();

    // Then fetch fresh data
    let mounted = true;
    Promise.all([
      fetchAgenda(),
      checkEditorStatus()
    ]).catch(error => {
      console.error('Error in initial fetch:', error);
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

  const handleSectionNameChange = (text: string) => {
    setNewSectionName(text);
    setIsNewSectionNameValid(text.trim().length <= 15);
  };

  const handleElementSubjectChange = (text: string) => {
    setNewElementData(prev => ({ ...prev, subject: text }));
    setIsNewElementSubjectValid(text.trim().length <= 15);
  };

  const handleEditSectionNameChange = (sectionId: string, text: string) => {
    setEditingSectionName(prev => ({ ...prev, [sectionId]: text }));
    setIsEditingSectionNameValid(text.trim().length <= 15);
  };

  const handleEditElementSubjectChange = (text: string) => {
    setEditingElement(prev => prev ? { ...prev, subject: text } : null);
    setIsEditingElementSubjectValid(text.trim().length <= 15);
  };

  const addSection = async () => {
    const cleanName = newSectionName.trim();
    if (cleanName.length > 15) {
      setIsNewSectionNameValid(false);
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
      setIsNewElementSubjectValid(false);
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
  
    if (editingElement.subject.trim().length > 15) {
      setIsEditingElementSubjectValid(false);
      return;
    }

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

  const elementStyles = StyleSheet.create({
    elementCard: {
      marginBottom: spacing.xs,
      borderRadius: 8,
      backgroundColor: theme.card,
      overflow: 'hidden',
      borderLeftWidth: 3,
      borderLeftColor: theme.border,
    },
    elementHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.sm,
    },
    elementControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginRight: spacing.sm,
      alignSelf: 'center',
    },
    urgentButton: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    completeButton: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 16,
    },
    elementContent: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
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
    titleActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    deadline: {
      ...typography.caption,
      fontSize: 12,
      opacity: 0.7,
    },
    expandedContent: {
      paddingTop: spacing.xs,
      paddingBottom: spacing.sm,
    },
    elementDetails: {
      ...typography.body,
      fontSize: 14,
      marginBottom: spacing.xs,
      opacity: 0.9,
    },
  });

  const renderElement = ({ item }: { item: AgendaElement }) => {
    const isUrgent = urgentElements[item.id];
    const isCompleted = completedElements[item.id];
    const isExpanded = expandedElements[item.id];
    const hasDetails = item.details && item.details.trim().length > 0;
    
    return (
      <Pressable
        onPress={() => {
          if (hasDetails) {
            setExpandedElements(prev => ({
              ...prev,
              [item.id]: !prev[item.id]
            }));
          }
        }}
        onLongPress={(isCreator || isEditor) ? () => {
          setEditingElement(item);
          setShowEditElementDialog(true);
        } : undefined}
        delayLongPress={LONG_PRESS_DURATION}
        style={({ pressed }) => ({ 
          opacity: pressed ? 0.7 : 1
        })}
      >
        <View 
          style={[
            elementStyles.elementCard, 
            { 
              borderLeftColor: isUrgent ? theme.error : 
                             isCompleted ? theme.tint : 
                             theme.border 
            }
          ]}
        >
          <View style={elementStyles.elementHeader}>
            <View style={elementStyles.elementControls}>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  toggleElementState(item.id, 'completed');
                }}
                style={({ pressed }) => [
                  elementStyles.completeButton,
                  { opacity: pressed ? 0.7 : 1 }
                ]}
              >
                <Icon
                  name={isCompleted ? "check-circle" : "circle"}
                  type="font-awesome-5"
                  size={20}
                  color={isCompleted ? theme.tint : theme.placeholder}
                  solid={isCompleted}
                />
              </Pressable>
            </View>
  
            <View style={elementStyles.elementContent}>
              <View style={elementStyles.titleRow}>
                <View style={elementStyles.titleMain}>
                  <Text 
                    style={[
                      elementStyles.elementTitle,
                      { color: theme.text },
                      isCompleted && styles.completedText
                    ]}
                    numberOfLines={1}
                  >
                    {item.subject}
                  </Text>
                  {!isExpanded && (
                    <Text style={[elementStyles.deadline, { color: theme.placeholder }]}>
                      {t('agenda.due')}: {new Date(item.deadline).toLocaleDateString(language)}
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleElementState(item.id, 'urgent');
                  }}
                  style={({ pressed }) => [
                    elementStyles.urgentButton,
                    { opacity: pressed ? 0.7 : 1 }
                  ]}
                >
                  <Icon
                    name="flag"
                    type="font-awesome-5"
                    size={16}
                    color={isUrgent ? theme.error : theme.placeholder}
                    solid={isUrgent}
                  />
                </Pressable>
              </View>
              
              {isExpanded && (
                <View style={elementStyles.expandedContent}>
                  {item.details && (
                    <Text style={[
                      elementStyles.elementDetails,
                      { color: theme.text },
                      isCompleted && styles.completedText
                    ]}>
                      {item.details}
                    </Text>
                  )}
                  <Text style={[elementStyles.deadline, { color: theme.placeholder }]}>
                    {t('agenda.due')}: {new Date(item.deadline).toLocaleDateString(language)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  const getSectionElements = useCallback((section) => {
    return section.elements?.filter(e => !completedElements[e.id]) || [];
  }, [completedElements]);

  const toggleSection = (sectionId: string, elementCount: number) => {
    if (elementCount === 0) return;
    
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const sortElementsByUrgencyAndDeadline = (elements: AgendaElement[]) => {
    return [...elements].sort((a, b) => {
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      
      const dateA = new Date(a.deadline).getTime();
      const dateB = new Date(b.deadline).getTime();
      return dateA - dateB;
    });
  };

  const handleEditSection = async (sectionId: string, newName: string) => {
    if (!session?.user?.id) return;
    
    const cleanName = newName.trim();
    if (cleanName.length > 15) {
      setIsEditingSectionNameValid(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("Agenda Section")
        .update({ name: cleanName })
        .eq('id', sectionId);

      if (error) throw error;

      setEditingState(prev => ({
        ...prev,
        sections: {
          ...prev.sections,
          [sectionId]: false
        }
      }));
      await fetchAgenda();
    } catch (error) {
      console.error('Edit section error:', error);
      Alert.alert(t('settings.error'), t('agenda.error.editSection'));
    }
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
        {editingState.sections[section.id] ? (
          <Input
            value={editingSectionName[section.id] || section.name}
            onChangeText={(text) => handleEditSectionNameChange(section.id, text)}
            containerStyle={styles.sectionEditInput}
            inputStyle={[
              { color: theme.text },
              !isEditingSectionNameValid && inputErrorStyles.invalidInput
            ]}
            errorMessage={!isEditingSectionNameValid ? t('agenda.error.sectionNameTooLong') : ''}
            errorStyle={inputErrorStyles.errorText}
            inputContainerStyle={[
              { borderBottomColor: theme.border },
              !isEditingSectionNameValid && inputErrorStyles.errorBorder
            ]}
            autoFocus
            onSubmitEditing={() => handleEditSection(section.id, editingSectionName[section.id] || section.name)}
            rightIcon={
              <RNView style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Icon
                  name="check"
                  type="font-awesome-5"
                  color={theme.text}
                  size={16}
                  onPress={() => handleEditSection(section.id, editingSectionName[section.id] || section.name)}
                />
                <Icon
                  name="trash"
                  type="font-awesome-5"
                  color={theme.error}
                  size={16}
                  onPress={() => handleDeleteSection(section)}
                />
              </RNView>
            }
          />
        ) : (
          <Pressable 
            onPress={() => toggleSection(section.id, getSectionElements(section).length)}
            onLongPress={(isCreator || isEditor) ? () => {
              setEditingState(prev => ({
                ...prev,
                sections: {
                  ...prev.sections,
                  [section.id]: true
                }
              }));
              setEditingSectionName(prev => ({
                ...prev,
                [section.id]: section.name
              }));
            } : undefined}
            delayLongPress={LONG_PRESS_DURATION}
            style={({ pressed }) => [
              styles.sectionTitleContainer
            ]}
          >
            <View style={styles.sectionLeftContent}>
              <Icon
                name={collapsedSections[section.id] ? 'chevron-up' : 'chevron-down'}
                type="font-awesome-5"
                size={14}
                color={getSectionElements(section).length === 0 ? theme.placeholder : theme.text}
                containerStyle={styles.collapseIcon}
              />
              <Text 
                style={[
                  styles.sectionTitle, 
                  { 
                    flex: 1,
                    color: theme.text
                  }
                ]}
                numberOfLines={1} 
                ellipsizeMode="tail"
              >
                {section.name}
              </Text>
            </View>
            <View style={styles.elementCountContainer}>
              <Text style={[
                styles.elementCount,
                { 
                  color: getSectionElements(section).length === 0 
                    ? theme.placeholder
                    : theme.button
                }
              ]}>
                {getSectionElements(section).length}
              </Text>
              {(isCreator || isEditor) && !editingState.sections[section.id] && (
                <Icon
                  name="plus"
                  type="font-awesome-5"
                  size={16}
                  color={theme.text}
                  onPress={() => handleAddElement(section.id)}
                />
              )}
            </View>
          </Pressable>
        )}
      </View>
      {!collapsedSections[section.id] && (
        <FlatList
          data={sortElementsByUrgencyAndDeadline(section.elements.map(element => ({
            ...element,
            isUrgent: urgentElements[element.id]
          })))}
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

  const handleDeleteComment = async (commentId: number) => {
    try {
      const { error } = await supabase
        .from('Agenda Comment')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      await fetchAgenda();
    } catch (error) {
      console.error('Delete comment error:', error);
      Alert.alert(t('settings.error'), t('agenda.error.deleteComment'));
    }
  };

  const renderComment = ({ item }: { item: AgendaComment }) => {
    const isOwnComment = session?.user?.id === item.author.id;
    const canDelete = isCreator || isEditor || isOwnComment;
  
    return (
      <Pressable 
        onLongPress={canDelete ? () => {
          setPressedCommentId(item.id);
        } : undefined}
        onPress={() => setPressedCommentId(null)}
        delayLongPress={LONG_PRESS_DURATION}
      >
        <RNView style={[styles.commentContainer, { backgroundColor: theme.card }]}>
          <RNView style={styles.commentHeader}>
            <RNView style={styles.commentAuthor}>
              <Pressable 
                onPress={() => {
                  if (session?.user?.id === item.author.id) {
                    router.push('/three');
                  } else {
                    router.push({
                      pathname: "/user-profile",
                      params: { id: item.author.id }
                    });
                  }
                }}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <RNView style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Avatar
                    size={24}
                    rounded
                    source={{ uri: item.author.avatar_url || DEFAULT_AVATAR }}
                    containerStyle={styles.commentAvatar}
                  />
                  <Text style={[typography.caption, { color: theme.text }]}>
                    {item.author.username}
                    {isOwnComment && ` (${t('agenda.you')})`}
                  </Text>
                </RNView>
              </Pressable>
            </RNView>
            <RNView style={styles.commentActions}>
              <Text style={[typography.caption, { color: theme.placeholder }]}>
                {getRelativeTime(item.created_at, t, language)}
              </Text>
              {pressedCommentId === item.id && canDelete && (
                <Icon
                  name="eraser"
                  type="font-awesome-5"
                  size={14}
                  color={theme.error}
                  onPress={() => handleDeleteComment(item.id)}
                  containerStyle={[styles.actionIcon, { marginLeft: spacing.sm }]}
                />
              )}
            </RNView>
          </RNView>
          <TruncatedText text={item.text} />
        </RNView>
      </Pressable>
    );
  };

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
            created_at,
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

        const formattedItems = completedData?.map(item => ({
          id: item.element.id,
          elementId: item.element_id,
          subject: item.element.subject,
          deadline: item.element.deadline,
          agendaName: item.element.section.agenda.name,
          agendaId: item.element.section.agenda.id,
          sectionId: item.element.section.id,
          completed_at: item.created_at
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
      size={20}
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

  useEffect(() => {
    if (agenda?.sections) {
      const initialCollapsedState = {};
      agenda.sections.forEach(section => {
        const elementCount = getSectionElements(section).length;
        if (elementCount === 0) {
          initialCollapsedState[section.id] = true;
        }
      });
      setCollapsedSections(prev => ({
        ...prev,
        ...initialCollapsedState
      }));
    }
  }, [agenda?.sections, getSectionElements]);

  const inputErrorStyles = {
    invalidInput: {
      color: theme.error,
    },
    errorText: {
      color: theme.error,
      fontSize: 12,
      marginTop: 4,
    },
    errorBorder: {
      borderBottomColor: theme.error,
    }
  };

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
        {agenda ? (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>{agenda.name}</Text>
              <RNView style={styles.headerActions}>
                {(isCreator || isEditor) && (
                  <Button
                    title={t('agenda.addSection')}
                    type="clear"
                    titleStyle={{ color: theme.button }}
                    onPress={() => setShowSectionDialog(true)}
                  />
                )}
                {showCompletedButton && (
                  <Icon
                    name="check-circle"
                    type="font-awesome-5"
                    size={20}
                    color={theme.text}
                    onPress={navigateToCompleted}
                    containerStyle={{ marginHorizontal: spacing.sm }}
                  />
                )}
                {renderCalendarButton()}
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

            <View style={[styles.membersSection, { marginTop: spacing.xl }]}>
              <RNView style={styles.sectionHeader}>
                <Text style={[typography.h3, { color: theme.text }]}>
                  {t('agenda.members').replace('{count}', members.length.toString())}
                </Text>
                {isCreator && (
                  <Icon
                    name="users-cog"
                    type="font-awesome-5"
                    size={20}
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
                <RNView style={styles.commentHeaderActions}>
                  {isCreator && (
                    <Icon
                      name={agenda.comments ? "eye" : "eye-slash"}
                      type="font-awesome-5"
                      size={20}
                      color={agenda.comments ? theme.tint : theme.placeholder}
                      onPress={toggleComments}
                      containerStyle={{ marginRight: spacing.sm }}
                    />
                  )}
                </RNView>
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

            <View style={[styles.dangerActions, { borderTopColor: theme.border }]}>
              {isCreator ? (
                <Pressable
                  onPress={() => deleteAgenda(agenda.id, agenda.creator_id)}
                  style={({ pressed }) => [
                    styles.dangerAction,
                    { opacity: pressed ? 0.7 : 1 }
                  ]}
                >
                  <Icon
                    name="trash"
                    type="font-awesome-5"
                    size={20}
                    color={theme.error}
                  />
                  <Text style={[styles.dangerActionText, { color: theme.error }]}>
                    {t('agenda.deleteAgenda')}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleLeaveAgenda}
                  style={({ pressed }) => [
                    styles.dangerAction,
                    { opacity: pressed ? 0.7 : 1 }
                  ]}
                >
                  <Icon
                    name="sign-out-alt"
                    type="font-awesome-5"
                    size={20}
                    color={theme.error}
                  />
                  <Text style={[styles.dangerActionText, { color: theme.error }]}>
                    {t('agenda.leaveAgenda')}
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        ) : (
          <View style={styles.container}>
            <Text>{t('agenda.notFound')}</Text>
          </View>
        )}
      </ScrollView>

      <Dialog
        isVisible={showSectionDialog}
        onBackdropPress={() => setShowSectionDialog(false)} 
        overlayStyle={[styles.dialog, { backgroundColor: theme.card }]}
      >
        <View style={[styles.dialogContent, { backgroundColor: theme.card }]}>
          <View style={[styles.dialogHeader, { backgroundColor: theme.card }]}>
            <View style={[{ flex: 1 }, { backgroundColor: theme.card }]}>
              <Text style={[styles.dialogHeaderTitle, { color: theme.text }]}>
                {t('agenda.newSection')}
              </Text>
            </View>
          </View>
          
          <Input
            placeholder={t('agenda.newSection')}
            value={newSectionName}
            onChangeText={handleSectionNameChange}
            inputStyle={[
              { color: theme.text },
              { minHeight: 40 },
              styles.inputField,
              !isNewSectionNameValid && inputErrorStyles.invalidInput
            ]}
            errorMessage={!isNewSectionNameValid ? t('agenda.error.sectionNameTooLong') : ''}
            errorStyle={inputErrorStyles.errorText}
            inputContainerStyle={[
              { paddingVertical: spacing.xs },
              !isNewSectionNameValid && inputErrorStyles.errorBorder
            ]}
            containerStyle={styles.dialogInput}
          />

          <View style={styles.dialogFooter}>
            <View style={styles.dialogMainActions}>
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
        </View>
      </Dialog>

      <Dialog
        isVisible={showElementDialog}
        onBackdropPress={() => setShowElementDialog(false)} 
        overlayStyle={[styles.dialog, { backgroundColor: theme.card }]}
      >
        <View style={[styles.dialogContent, { backgroundColor: theme.card }]}>
          <View style={[styles.dialogHeader, { backgroundColor: theme.card }]}>
            <View style={[{ flex: 1 }, { backgroundColor: theme.card }]}>
              <Text style={[typography.h3, { color: theme.text }]}>
                {t('agenda.addElement')}
              </Text>
            </View>
          </View>
          
          <Input
            placeholder={t('agenda.elementSubject')}
            value={newElementData.subject}
            onChangeText={handleElementSubjectChange}
            inputStyle={[
              { color: theme.text },
              !isNewElementSubjectValid && inputErrorStyles.invalidInput
            ]}
            errorMessage={!isNewElementSubjectValid ? t('agenda.error.elementSubjectTooLong') : ''}
            errorStyle={inputErrorStyles.errorText}
            inputContainerStyle={[
              { borderBottomColor: theme.border },
              !isNewElementSubjectValid && inputErrorStyles.errorBorder
            ]}
            containerStyle={styles.dialogInput}
          />
          
          <Input
            placeholder={t('agenda.elementDetails')}
            value={newElementData.details}
            onChangeText={(text) => setNewElementData(prev => ({ ...prev, details: text }))}
            multiline
            inputStyle={[
              { color: theme.text },
              { minHeight: newElementData.details?.split('\n').length > 2 ? 80 : 40 },
              { maxHeight: 120 },
              styles.inputField
            ]}
            inputContainerStyle={{ paddingVertical: spacing.xs }}
            containerStyle={styles.dialogInput}
          />
          
          <DatePickerInput
            value={newElementData.deadline}
            onChange={(date) => setNewElementData(prev => ({ ...prev, deadline: date }))}
            placeholder={t('agenda.elementDeadline')}
            inputStyle={{ color: theme.text }}
            containerStyle={[styles.dialogInput, { marginBottom: spacing.lg }]}
          />

          <View style={styles.dialogFooter}>
            <View style={styles.dialogMainActions}>
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
          <View style={[styles.dialogHeader, { backgroundColor: theme.card }]}>
            <View style={[{ flex: 1 }, { backgroundColor: theme.card }]}>
              <Text style={[styles.dialogHeaderTitle, { color: theme.text }]}>
                {t('agenda.editElement')}
              </Text>
            </View>
            <View style={[styles.dialogHeaderAction, { backgroundColor: theme.card }]}>
              <Icon
                name="trash"
                type="font-awesome-5"
                size={18}
                color={theme.error}
                onPress={() => {
                  if (editingElement) {
                    handleDeleteElement(editingElement);
                    setShowEditElementDialog(false);
                    setEditingElement(null);
                  }
                }}
              />
            </View>
          </View>
          
          <Input
            placeholder={t('agenda.elementSubject')}
            value={editingElement?.subject}
            onChangeText={handleEditElementSubjectChange}
            inputStyle={[
              { color: theme.text },
              !isEditingElementSubjectValid && inputErrorStyles.invalidInput
            ]}
            errorMessage={!isEditingElementSubjectValid ? t('agenda.error.elementSubjectTooLong') : ''}
            errorStyle={inputErrorStyles.errorText}
            inputContainerStyle={[
              { borderBottomColor: theme.border },
              !isEditingElementSubjectValid && inputErrorStyles.errorBorder
            ]}
            containerStyle={styles.dialogInput}
          />
          
          <Input
            placeholder={t('agenda.elementDetails')}
            value={editingElement?.details}
            onChangeText={(text) => setEditingElement(prev => prev ? { ...prev, details: text } : null)}
            multiline
            inputStyle={[
              { color: theme.text },
              { minHeight: editingElement?.details?.split('\n').length > 2 ? 80 : 40 },
              { maxHeight: 120 },
              styles.inputField
            ]}
            inputContainerStyle={{ paddingVertical: spacing.xs }}
            containerStyle={styles.dialogInput}
          />
          
          <DatePickerInput
            value={editingElement?.deadline}
            onChange={(date) => setEditingElement(prev => prev ? { ...prev, deadline: date } : null)}
            placeholder={t('agenda.elementDeadline')}
            inputStyle={{ color: theme.text }}
            containerStyle={[styles.dialogInput, { marginBottom: spacing.lg }]}
          />

          <View style={styles.dialogFooter}>
            <View style={styles.dialogMainActions}>
              <DialogButton 
                onPress={() => {
                  setShowEditElementDialog(false);
                  setEditingElement(null);
                }}
              >
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
  contentContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  
  // Header Styles
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.md,
  },
  titleMain: {
    flex: 1,
    marginRight: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.xs,
  },

  // Section Styles
  sectionsContainer: {
    width: '100%',
  },
  sectionsList: {
    flex: 1,
  },
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'space-between',
  },
  sectionLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginLeft: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sectionEditInput: {
    flex: 1,
    marginBottom: -spacing.lg,
    padding: spacing.xs,
    marginLeft: -spacing.sm,
  },

  // Element Styles
  elementsList: {
    marginLeft: spacing.sm,
  },
  elementTitle: {
    ...typography.h3,
    fontSize: 15,
    marginBottom: 2,
  },
  elementDetails: {
    ...typography.body,
    fontSize: 14,
    marginBottom: spacing.xs,
    opacity: 0.9,
  },
  elementCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  elementCount: {
    ...typography.caption,
    fontSize: 16,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  elementActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  expandedContent: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },

  // Comment Styles
  commentsSection: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'transparent',
    paddingTop: spacing.lg,
    marginTop: spacing.xl,
  },
  commentsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  commentsList: {
    width: '100%',
  },
  commentContainer: {
    padding: spacing.sm,
    borderRadius: 8,
    marginVertical: spacing.xs,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  commentHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  commentAvatar: {
    marginRight: spacing.xs,
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
  commentInputContainer: {
    marginVertical: spacing.md,
  },
  commentInput: {
    marginBottom: -spacing.lg,
  },

  // Member Styles
  membersSection: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'transparent',
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
  memberCardEditing: {
    opacity: 0.8,
    borderWidth: 2,
    borderColor: Colors.light.tint,
    borderRadius: 8,
    padding: spacing.xs,
  },
  memberAvatar: {
    marginBottom: spacing.xs,
  },

  // Dialog Styles
  dialog: {
    width: '90%',
    borderRadius: 12,
    padding: 0,
    overflow: 'hidden',
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  dialogHeaderTitle: {
    ...typography.h3,
  },
  dialogHeaderAction: {
    paddingTop: 5,
  },
  dialogContent: {
    padding: spacing.lg,
  },
  dialogInput: {
    paddingHorizontal: 0,
  },
  inputField: {
    padding: spacing.sm,
  },
  dialogFooter: {
    borderTopWidth: 1,
    borderTopColor: 'transparent',
    marginHorizontal: -spacing.lg,
    marginBottom: -spacing.lg,
    paddingVertical: spacing.xs,
  },
  dialogMainActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  dialogButtonGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },

  // Button Styles
  actionButton: {
    borderRadius: 12,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    width: '100%',
  },
  deleteButton: {
    marginTop: spacing.md,
  },

  // Icon Styles
  actionIcon: {
    padding: spacing.xs,
  },
  collapseIcon: {
    marginRight: spacing.sm,
  },
  editIcon: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },

  // Danger Actions
  dangerActions: {
    marginTop: spacing.xl * 2,
    marginBottom: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    opacity: 0.8,
  },
  dangerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  dangerActionText: {
    ...typography.body,
    fontWeight: '500',
  },

  // Miscellaneous
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    opacity: 0.5,
    padding: spacing.md,
  },
  disabledMessage: {
    ...typography.body,
    textAlign: 'center',
    paddingVertical: spacing.md,
    fontStyle: 'italic',
  },
});