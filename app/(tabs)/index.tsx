import { StyleSheet, FlatList, RefreshControl, Alert, Switch, Pressable, ScrollView, Clipboard } from "react-native";
import { View, Text } from "@/components/Themed";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Agenda, AgendaElement } from "@/types";
import { Button, Input, Dialog, Icon } from "@rneui/themed";
import { router, Link } from "expo-router";
import type { Session } from "@supabase/supabase-js";
import Colors from "@/constants/Colors";
import { typography, spacing } from "@/constants/Typography";
import { useColorScheme } from "@/components/useColorScheme";
import { useFocusEffect } from "@react-navigation/native";
import { useNetworkState } from "@/hooks/useNetworkState";
import { storeData, getData, KEYS } from "@/utils/offlineStorage";
import OfflineBanner from "@/components/OfflineBanner";
import VibesDisplay from "@/components/VibesDisplay";
import { useCredits } from "@/hooks/useCredits";
import { useLanguage } from "@/contexts/LanguageContext";

// Component: DialogButton
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

// Component: ElementDetailsDialog
const ElementDetailsDialog = ({ 
  element, 
  isVisible, 
  onClose, 
  theme, 
  t, 
  language 
}) => {
  if (!element) return null;

  return (
    <Dialog
      isVisible={isVisible}
      onBackdropPress={onClose}
      overlayStyle={styles.dayDialog}
    >
      <View style={[styles.dialogDayContainer, { backgroundColor: "transparent" }]}>
        <View style={[
          styles.elementCard,
          {
            backgroundColor: theme.background,
            borderLeftColor: element.isUrgent ? theme.error : theme.border,
            marginBottom: 0,
          },
        ]}>
          <View style={[styles.elementHeader, { padding: spacing.md }]}>
            <View style={styles.elementContent}>
              <View style={[styles.titleRow, { alignItems: "center" }]}>
                <View style={styles.titleMain}>
                  <Text
                    style={[
                      styles.elementDetailsTitle,
                      { color: theme.text },
                      element.isUrgent && { color: theme.error },
                    ]}
                  >
                    {element.subject}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <ScrollView style={[styles.elementDialogScroll, { padding: spacing.md }]}>
            {element.details && (
              <Text style={[styles.dialogDetails, { color: theme.text }]}>
                {element.details}
              </Text>
            )}
            <Text style={[styles.dialogDeadline, { color: theme.placeholder }]}>
              {t("agenda.due")}: {new Date(element.deadline).toLocaleDateString(language)}
            </Text>
          </ScrollView>

          <View style={[styles.dialogFooterActions, { justifyContent: "flex-end" }]}>
            <Button
              title={t("home.viewAgenda")}
              type="clear"
              titleStyle={{ color: theme.tint }}
              onPress={() => {
                onClose();
                router.push(`/agenda/${element.section.agenda.id}`);
              }}
            />
          </View>
        </View>
      </View>
    </Dialog>
  );
};

// Utility Functions
const sortElementsByUrgencyAndDeadline = (elements: AgendaElement[]) => {
  return [...elements].sort((a, b) => {
    if (a.isUrgent && !b.isUrgent) return -1;
    if (!a.isUrgent && b.isUrgent) return 1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });
};

// Component: DayElementsDialog
const DayElementsDialog = ({ 
  elements, 
  isVisible, 
  onClose, 
  onElementPress, 
  theme, 
  t, 
  colorScheme
}) => {
  const sortedElements = sortElementsByUrgencyAndDeadline(elements);
  const date = elements[0]?.deadline ? new Date(elements[0].deadline) : new Date();

  return (
    <Dialog
      isVisible={isVisible}
      onBackdropPress={onClose}
      overlayStyle={styles.dayDialog}
    >
      <View style={[styles.dialogDayContainer, { backgroundColor: theme.card }]}>
        <Text style={[styles.dayHeader, { color: theme.text }]}>
          {t(`calendar.days.${["sun", "mon", "tue", "wed", "thu", "fri", "sat"][date.getDay()]}`)}
          {"\n"}
          {date.getDate()}
        </Text>
        <ScrollView style={styles.dialogElementsContainer}>
          {sortedElements.map((element, index) => (
            <Pressable
              key={`${element.id}-${index}`}
              onPress={() => onElementPress(element)}
              style={({ pressed }) => [
                styles.elementCard,
                {
                  backgroundColor: colorScheme === "dark" ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.05)",
                  opacity: pressed ? 0.7 : 1,
                  borderLeftColor: element.isUrgent ? theme.error : theme.border,
                },
                element.isUrgent && {
                  backgroundColor: Colors[colorScheme ?? "light"].error + "20",
                },
              ]}
            >
              <View style={styles.elementHeader}>
                <View style={styles.elementContent}>
                  <View style={[styles.titleRow, { alignItems: "center" }]}>
                    <View style={styles.titleMain}>
                      <Text
                        style={[
                          styles.elementTitle,
                          { color: theme.text },
                          element.isUrgent && { color: Colors[colorScheme ?? "light"].error },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {element.subject}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Dialog>
  );
};

// Main Component
export default function HomeScreen() {
  const { t, language } = useLanguage();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [key, setKey] = useState("");
  const [agendaElements, setAgendaElements] = useState<AgendaElement[]>([]);
  const [completedElements, setCompletedElements] = useState<AgendaElement[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAgendaData, setNewAgendaData] = useState({
    name: "",
    key: "",
    key_visible: true,
  });
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinAgendaData, setJoinAgendaData] = useState({
    name: "",
    key: "",
  });
  const isOnline = useNetworkState();
  const { credits, setCredits, fetchCredits } = useCredits();
  const [currentWeek, setCurrentWeek] = useState<Date[]>([]);
  const [elementsByDay, setElementsByDay] = useState<{ [key: string]: AgendaElement[] }>({});
  const [selectedDayElements, setSelectedDayElements] = useState<AgendaElement[]>([]);
  const [showDayDialog, setShowDayDialog] = useState(false);
  const [selectedElement, setSelectedElement] = useState<AgendaElement | null>(null);
  const weekScrollRef = useRef<ScrollView>(null);
  const [isCreateNameValid, setIsCreateNameValid] = useState(true);
  const [isJoinNameValid, setIsJoinNameValid] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Handlers (unchanged from original)
  const handleCreateNameChange = useCallback((text: string) => {
    setNewAgendaData((prev) => ({ ...prev, name: text }));
    const trimmed = text.trim();
    setIsCreateNameValid(trimmed ? trimmed.length <= 15 : true);
  }, []);

  const handleJoinNameChange = useCallback((text: string) => {
    setJoinAgendaData((prev) => ({ ...prev, name: text }));
    const trimmed = text.trim();
    setIsJoinNameValid(trimmed ? trimmed.length <= 15 : true);
  }, []);

  const resetState = useCallback(() => {
    setAgendas([]);
    setAgendaElements([]);
    setCompletedElements([]);
    setKey("");
    setShowCreateDialog(false);
    setShowJoinDialog(false);
    setNewAgendaData({ name: "", key: "", key_visible: true });
    setJoinAgendaData({ name: "", key: "" });
  }, []);

  const clearSupabaseCache = useCallback(async () => {
    try {
      await Promise.all([
        supabase.auth.refreshSession(),
        supabase.from("Agenda").select().abortSignal,
        supabase.from("Agenda Section").select().abortSignal,
        supabase.from("Agenda Element").select().abortSignal,
      ]);
    } catch (error) {
      console.log("Cache clear error:", error);
    }
  }, []);

  // Load Cached Data First
  const loadCachedData = useCallback(async () => {
    try {
      const [cachedAgendas, cachedElements, cachedCompleted, cachedElementsByDay] = await Promise.all([
        getData(KEYS.AGENDAS),
        getData(KEYS.AGENDA_ELEMENTS),
        getData(KEYS.COMPLETED_ELEMENTS),
        getData(KEYS.INDIVIDUAL_AGENDAS),
      ]);

      if (cachedAgendas?.length > 0) setAgendas(cachedAgendas);
      if (cachedElements?.length > 0) setAgendaElements(cachedElements);
      if (cachedCompleted?.length > 0) setCompletedElements(cachedCompleted);

      if (cachedElementsByDay) {
        const organized: { [key: string]: AgendaElement[] } = {};
        Object.values(cachedElementsByDay).forEach((agendaData: any) => {
          if (agendaData?.data?.agenda?.sections) {
            agendaData.data.agenda.sections.forEach((section) => {
              section.elements?.forEach((element) => {
                if (!cachedCompleted?.find((ce) => ce.id === element.id)) {
                  const dateKey = new Date(element.deadline).toDateString();
                  if (!organized[dateKey]) organized[dateKey] = [];
                  organized[dateKey].push({
                    ...element,
                    isUrgent: cachedElements?.some((ue) => ue.id === element.id),
                    sectionId: section.id,
                    sectionName: section.name,
                  });
                }
              });
            });
          }
        });
        setElementsByDay(organized);
        setCurrentWeek(getWeekDates(new Date()));
      }
    } catch (error) {
      console.error("Error loading cached data:", error);
    }
  }, []);

  // Effects
  useEffect(() => {
    // Load cached data immediately
    loadCachedData();

    // Handle auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        await clearSupabaseCache();
        resetState();
        setSession(null);
        router.replace("/three");
        return;
      }

      if (session) {
        setSession(session);
        // Fetch fresh data in background
        try {
          await Promise.all([
            fetchAgendas(session),
            fetchAgendaElements(session),
            fetchUserCredits(session),
          ]);
        } catch (error) {
          console.error("Auth change fetch error:", error);
        }
      }
    });
  }, [loadCachedData, clearSupabaseCache, resetState]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) {
          console.error("Session error:", error);
          return;
        }

        setSession(session);

        if (!session) return;

        // Load cached data first, then fetch fresh data
        await loadCachedData();
        if (isOnline) {
          await Promise.all([
            fetchAgendas(session),
            fetchAgendaElements(session),
            fetchUserCredits(session),
          ]);
        }
      } catch (error) {
        console.error("Init error:", error);
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [isOnline, loadCachedData]);

  // Data Fetching
  const clearAgendas = useCallback(async () => {
    setAgendas([]);
    await storeData(KEYS.AGENDAS, []);
  }, []);

  const fetchAgendas = useCallback(async (currentSession?: Session | null) => {
    const userSession = currentSession || session;
    if (!userSession?.user?.id) return;

    try {
      if (isOnline) {
        const [{ data: ownedAgendas }, { data: memberAgendas }] = await Promise.all([
          supabase
            .from("Agenda")
            .select(`*, sections:"Agenda Section"(*)`)
            .eq("creator_id", userSession.user.id),
          supabase
            .from("Agenda Member")
            .select(`
              agenda:Agenda!inner(
                *,
                sections:"Agenda Section"(*)
              )
            `)
            .eq("user_id", userSession.user.id),
        ]);

        const combined = [
          ...(ownedAgendas || []),
          ...(memberAgendas?.map((m) => m.agenda) || []),
        ];

        const uniqueAgendas = Array.from(
          new Map(combined.map((item) => [item.id, item])).values()
        );

        setAgendas(uniqueAgendas);
        await storeData(KEYS.AGENDAS, uniqueAgendas);
      }
    } catch (error) {
      console.error("Fetch agendas error:", error);
    }
  }, [session, isOnline]);

  const fetchAgendaElements = useCallback(async (currentSession?: Session | null) => {
    const userSession = currentSession || session;
    if (!userSession?.user?.id) return;

    try {
      if (!isOnline) return;

      const [{ data: memberAgendas }, { data: ownedAgendas }] = await Promise.all([
        supabase
          .from("Agenda Member")
          .select("agenda_id")
          .eq("user_id", userSession.user.id),
        supabase
          .from("Agenda")
          .select("id")
          .eq("creator_id", userSession.user.id),
      ]);

      const allAgendaIds = [
        ...(memberAgendas?.map((m) => m.agenda_id) || []),
        ...(ownedAgendas?.map((a) => a.id) || []),
      ];

      const { data: sections } = await supabase
        .from("Agenda Section")
        .select(`
          id,
          name,
          agenda:Agenda (
            id,
            name
          )
        `)
        .in("agenda_id", allAgendaIds);

      if (!sections?.length) return;

      const { data: completed } = await supabase
        .from("Completed Element")
        .select("element_id")
        .eq("user_id", userSession.user.id);

      const completedIds = new Set(completed?.map((c) => c.element_id) || []);

      const { data: elements } = await supabase
        .from("Agenda Element")
        .select("*")
        .in("section_id", sections.map((s) => s.id));

      const { data: urgentData } = await supabase
        .from("Urgent Element")
        .select("element_id")
        .eq("user_id", userSession.user.id);

      const urgentIds = new Set(urgentData?.map((u) => u.element_id) || []);

      const organized: { [key: string]: AgendaElement[] } = {};
      elements?.forEach((element) => {
        if (completedIds.has(element.id)) return;

        const dateKey = new Date(element.deadline).toDateString();
        if (!organized[dateKey]) organized[dateKey] = [];

        const section = sections.find((s) => s.id === element.section_id);
        if (!section) return;

        organized[dateKey].push({
          ...element,
          section: {
            id: section.id,
            name: section.name,
            agenda: section.agenda,
          },
          sectionId: section.id,
          sectionName: section.name,
          agendaName: section.agenda.name,
          isUrgent: urgentIds.has(element.id),
        });
      });

      setElementsByDay(organized);
      setCurrentWeek(getWeekDates(new Date()));

      const { data: urgentElements } = await supabase
        .from("Urgent Element")
        .select(`
          element_id,
          element:"Agenda Element" (
            id,
            subject,
            details,
            deadline,
            status,
            section:"Agenda Section" (
              id,
              name,
              agenda:Agenda (
                id,
                name
              )
            )
          )
        `)
        .eq("user_id", userSession.user.id)
        .order("created_at", { ascending: false });

      const urgentItems = urgentElements
        ?.filter((ue) => ue.element)
        .map((ue) => ({
          ...ue.element,
          agendaName: ue.element.section.agenda.name,
        }));

      setAgendaElements(urgentItems || []);

      const { data: completedElements } = await supabase
        .from("Completed Element")
        .select(`
          element_id,
          element:"Agenda Element" (
            id,
            subject,
            details,
            deadline,
            status,
            section:"Agenda Section" (
              id,
              name,
              agenda:Agenda (
                id,
                name
              )
            )
          )
        `)
        .eq("user_id", userSession.user.id)
        .order("created_at", { ascending: false });

      const completedItems = completedElements
        ?.filter((ce) => ce.element)
        .map((ce) => ({
          ...ce.element,
          agendaName: ce.element.section.agenda.name,
        }));

      setCompletedElements(completedItems || []);

      await Promise.all([
        storeData(KEYS.AGENDA_ELEMENTS, urgentItems || []),
        storeData(KEYS.COMPLETED_ELEMENTS, completedItems || []),
      ]);
    } catch (error) {
      console.error("Error fetching elements:", error);
    }
  }, [session, isOnline]);

  const fetchUserCredits = useCallback(async (currentSession?: Session | null) => {
    const userSession = currentSession || session;
    if (!userSession?.user?.id) return;
    const amount = await fetchCredits();
    setCredits(amount);
  }, [session, fetchCredits, setCredits]);

  useFocusEffect(
    useCallback(() => {
      if (session?.user) {
        fetchCredits();
        if (isOnline) {
          fetchAgendas(session);
          fetchAgendaElements(session);
        }
      }
    }, [session?.user?.id, fetchCredits, isOnline])
  );

  // Handlers (unchanged from original)
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchAgendas(), fetchAgendaElements()]).finally(() =>
      setRefreshing(false)
    );
  }, [fetchAgendas, fetchAgendaElements]);

  const handleJoinAgenda = async () => {
    if (!session?.user?.id || !joinAgendaData.name || !joinAgendaData.key) return;

    const trimmedName = joinAgendaData.name.trim();
    setIsJoinNameValid(trimmedName.length <= 15);
    if (!isJoinNameValid) return;

    try {
      const trimmedKey = joinAgendaData.key.trim();

      const { data: foundAgendas, error: searchError } = await supabase
        .from("Agenda")
        .select("*")
        .eq("key", trimmedKey)
        .ilike("name", trimmedName);

      if (searchError) throw searchError;

      const agenda = foundAgendas[0];

      if (agenda.creator_id === session.user.id) {
        Alert.alert(t("settings.error"), t("home.error.alreadyOwner"));
        return;
      }

      if (!agenda.key_visible) {
        Alert.alert(t("settings.error"), t("home.error.privateKey"));
        return;
      }

      const { data: existingMember } = await supabase
        .from("Agenda Member")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("agenda_id", agenda.id)
        .maybeSingle();

      if (existingMember) {
        Alert.alert(t("settings.error"), t("home.error.alreadyMember"));
        return;
      }

      const { error: joinError } = await supabase
        .from("Agenda Member")
        .insert({
          user_id: session.user.id,
          agenda_id: agenda.id,
        });

      if (joinError) throw joinError;

      await fetchAgendas();
      setShowJoinDialog(false);
      setJoinAgendaData({ name: "", key: "" });
      Alert.alert(t("settings.success"), t("home.success.joined").replace("{name}", agenda.name));
    } catch (error) {
      console.error("Join error:", error);
      Alert.alert(t("settings.error"), t("home.error.join"));
    }
  };

  const handleCreateAgenda = async () => {
    if (!session?.user?.id || !newAgendaData.name) return;

    const trimmedName = newAgendaData.name.trim();
    setIsCreateNameValid(trimmedName.length <= 15);
    if (!isCreateNameValid) return;

    try {
      const { data, error } = await supabase
        .from("Agenda")
        .insert([
          {
            name: trimmedName,
            key: newAgendaData.key || Math.random().toString(36).substring(2, 8),
            key_visible: newAgendaData.key_visible,
            creator_id: session.user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setShowCreateDialog(false);
      setNewAgendaData({ name: "", key: "", key_visible: true });
      fetchAgendas();
      Alert.alert(t("settings.success"), t("home.success.created"));
    } catch (error) {
      console.error("Create agenda error:", error);
      Alert.alert(t("settings.error"), t("home.error.create"));
    }
  };

  // Render Functions (unchanged from original except for loading condition removal)
  const renderAgendaItem = ({ item }: { item: Agenda }) => (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <Text style={[typography.h3, { color: theme.text }]}>
        {item.name || "Untitled"}
      </Text>
      {item.key_visible && (
        <Pressable
          onPress={() => {
            Clipboard.setString(item.key);
            Alert.alert(t("settings.success"), t("home.keyCopied"));
          }}
          style={({ pressed }) => [
            styles.keyContainer,
            { opacity: pressed ? 0.5 : 1 },
          ]}
        >
          <Text style={[typography.caption, { color: theme.text }]}>
            {t("home.agendaCode")}: {item.key}
          </Text>
          <Icon
            name="copy"
            type="font-awesome-5"
            size={12}
            color={theme.placeholder}
            style={styles.copyIcon}
          />
        </Pressable>
      )}
      <Button
        title={t("userProfile.action.viewAgenda")}
        type="clear"
        titleStyle={{ color: theme.tint }}
        onPress={() => router.push(`/agenda/${item.id}`)}
      />
    </View>
  );

  useEffect(() => {
    setCurrentWeek(getWeekDates(new Date()));
  }, []);

  const renderCalendarDay = (date: Date) => {
    const dateKey = date.toDateString();
    const dayElements = elementsByDay[dateKey] || [];
    const sortedElements = sortElementsByUrgencyAndDeadline(dayElements);
    const isToday = new Date().toDateString() === dateKey;
    const isSelected = dateKey === selectedDate;
    const MAX_VISIBLE_ELEMENTS = 2;

    return (
      <Pressable
        key={dateKey}
        onPress={() => {
          if (dayElements.length > 0) {
            setSelectedDate(dateKey);
            setSelectedDayElements(dayElements);
            setShowDayDialog(true);
          }
        }}
        style={({ pressed }) => [
          styles.dayContainer,
          {
            backgroundColor: theme.card,
            opacity: isSelected ? 0.1 : pressed ? 0.7 : 1,
          },
          isToday && { borderColor: theme.tint, borderWidth: 1 },
        ]}
      >
        <Text style={[styles.dayHeader, { color: theme.text }]}>
          {t(`calendar.days.${["sun", "mon", "tue", "wed", "thu", "fri", "sat"][date.getDay()]}`)}
          {"\n"}
          {date.getDate()}
        </Text>
        <ScrollView style={styles.elementsContainer}>
          {sortedElements.slice(0, MAX_VISIBLE_ELEMENTS).map((element, index) => (
            <Pressable
              key={`${element.id}-${index}`}
              onPress={() => setSelectedElement(element)}
              style={({ pressed }) => [
                styles.elementCard,
                {
                  backgroundColor: colorScheme === "dark" ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.05)",
                  opacity: pressed ? 0.7 : 1,
                  borderLeftColor: element.isUrgent ? theme.error : theme.border,
                },
                element.isUrgent && {
                  backgroundColor: Colors[colorScheme ?? "light"].error + "20",
                },
              ]}
            >
              <View style={styles.elementHeader}>
                <View style={styles.elementContent}>
                  <View style={[styles.titleRow, { alignItems: "center" }]}>
                    <View style={styles.titleMain}>
                      <Text
                        style={[
                          styles.elementTitle,
                          { color: theme.text },
                          element.isUrgent && { color: Colors[colorScheme ?? "light"].error },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {element.subject}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
          {sortedElements.length > MAX_VISIBLE_ELEMENTS && (
            <View style={[styles.moreContainer, { backgroundColor: theme.tint }]}>
              <Text style={[styles.moreText, { color: colorScheme === "dark" ? "black" : "white" }]}>
                +{sortedElements.length - MAX_VISIBLE_ELEMENTS}
              </Text>
            </View>
          )}
        </ScrollView>
      </Pressable>
    );
  };

  const getWeekDates = (date: Date) => {
    const today = new Date(date);
    const dates = [];
    for (let i = -3; i <= 3; i++) {
      const newDate = new Date(today);
      newDate.setDate(today.getDate() + i);
      dates.push(new Date(newDate));
    }
    return dates;
  };

  useEffect(() => {
    if (weekScrollRef.current) {
      setTimeout(() => {
        weekScrollRef.current?.scrollTo({
          x: (120 + 4) * 3,
          animated: false,
        });
      }, 0);
    }
  }, [currentWeek]);

  const renderUrgentItem = ({ item }: { item: AgendaElement }) => (
    <Pressable
      onPress={() => router.push(`/agenda/${item.section.agenda.id}`)}
      style={({ pressed }) => [
        styles.urgentCard,
        {
          backgroundColor: theme.card,
          opacity: pressed ? 0.7 : 1,
          borderLeftColor: theme.error,
        },
      ]}
    >
      <View style={styles.urgentHeader}>
        <View style={styles.urgentContent}>
          <View style={styles.urgentTitleRow}>
            <View style={styles.urgentTitleMain}>
              <Text style={[styles.urgentTitle, { color: theme.text }]}>
                {item.subject}
              </Text>
              <Text style={[styles.urgentDeadline, { color: theme.placeholder }]}>
                {item.agendaName} • {t("agenda.due")}: {new Date(item.deadline).toLocaleDateString(language)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );

  // Input Error Styles (unchanged)
  const inputErrorStyles = {
    invalidInput: { color: theme.error },
    errorText: { color: theme.error, fontSize: 12, marginTop: 4 },
    errorBorder: { borderBottomColor: theme.error },
  };

  // Render
  if (!session) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.welcomeContainer}>
          <Text style={[typography.h1, { color: theme.text, marginBottom: spacing.lg }]}>
            {t("home.notLoggedIn")}
          </Text>
          <Text
            style={[
              typography.body,
              {
                color: theme.placeholder,
                textAlign: "center",
                marginBottom: spacing.xl,
                paddingHorizontal: spacing.lg,
                maxWidth: 500,
              },
            ]}
          >
            {t("home.loginRequired")}
          </Text>
          <Button
            title={t("home.goToLogin")}
            onPress={() => router.push("/three")}
            containerStyle={styles.loginButton}
            buttonStyle={{ backgroundColor: theme.button, paddingHorizontal: spacing.xl }}
            titleStyle={{ color: theme.buttonText }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {!isOnline && <OfflineBanner />}
      <View style={styles.headerRow}>
        <VibesDisplay amount={credits} />
      </View>
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
        {/* Urgent Section */}
        {agendaElements.length > 0 && (
          <View style={styles.section}>
            <View>
              {sortElementsByUrgencyAndDeadline(agendaElements)
                .slice(0, 4)
                .map((item) => (
                  <View key={item.id}>{renderUrgentItem({ item })}</View>
                ))}
              {agendaElements.length > 2 && (
                <Link
                  href={{
                    pathname: "/urgent",
                    params: {
                      items: encodeURIComponent(
                        JSON.stringify(
                          agendaElements.map((item) => ({
                            id: item.id,
                            subject: item.subject,
                            deadline: item.deadline,
                            agendaName: item.agendaName,
                            agendaId: item.section.agenda.id,
                          }))
                        )
                      ),
                    },
                  }}
                  asChild
                >
                  <Pressable>
                    {({ pressed }) => (
                      <Text
                        style={[
                          typography.body,
                          {
                            color: theme.text,
                            opacity: pressed ? 0.5 : 1,
                            textAlign: "center",
                            padding: spacing.sm,
                            fontSize: 20,
                          },
                        ]}
                      >
                        •••
                      </Text>
                    )}
                  </Pressable>
                </Link>
              )}
            </View>
          </View>
        )}

        {/* Agendas Section */}
        <View style={styles.section}>
          {agendas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{ color: theme.text }}>{t("home.noAgendas")}</Text>
            </View>
          ) : (
            <FlatList
              data={agendas}
              renderItem={renderAgendaItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>

        {/* Buttons Section */}
        <View style={[styles.section, styles.bottomSection]}>
          <View style={styles.buttonGroup}>
            <Button
              title={t("home.createAgenda")}
              onPress={() => setShowCreateDialog(true)}
              containerStyle={styles.button}
              buttonStyle={{ backgroundColor: theme.button }}
              titleStyle={{ color: theme.buttonText }}
            />
            <Button
              title={t("home.joinAgenda")}
              type="outline"
              onPress={() => setShowJoinDialog(true)}
              containerStyle={styles.button}
              buttonStyle={{ borderColor: theme.button }}
              titleStyle={{ color: theme.button }}
            />
          </View>
        </View>

        {/* Mini Calendar */}
        <View style={styles.miniCalendar}>
          <Text style={[typography.h3, { color: theme.text, marginBottom: spacing.sm }]}>
            {t("calendar.weekView")}
          </Text>
          <ScrollView
            ref={weekScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.miniWeekContainer}
          >
            {currentWeek.map((date) => renderCalendarDay(date))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Create Agenda Dialog */}
      <Dialog
        isVisible={showCreateDialog}
        onBackdropPress={() => setShowCreateDialog(false)}
        overlayStyle={[styles.dialog, { backgroundColor: theme.card }]}
      >
        <View style={[styles.dialogContent, { backgroundColor: theme.card }]}>
          <View style={[styles.dialogHeader, { backgroundColor: theme.card }]}>
            <View style={[{ flex: 1 }, { backgroundColor: theme.card }]}>
              <Text style={[styles.dialogHeaderTitle, { color: theme.text }]}>
                {t("home.createAgendaTitle")}
              </Text>
            </View>
          </View>

          <Input
            placeholder={t("home.agendaName")}
            value={newAgendaData.name}
            onChangeText={handleCreateNameChange}
            inputStyle={[
              { color: theme.text },
              { minHeight: 40 },
              styles.inputField,
              !isCreateNameValid && newAgendaData.name.trim() && inputErrorStyles.invalidInput,
            ]}
            errorMessage={
              newAgendaData.name.trim() && !isCreateNameValid ? t("home.error.nameTooLong") : ""
            }
            errorStyle={inputErrorStyles.errorText}
            inputContainerStyle={[
              { paddingVertical: spacing.xs },
              !isCreateNameValid && newAgendaData.name.trim() && inputErrorStyles.errorBorder,
            ]}
            containerStyle={styles.dialogInput}
          />
          <Input
            placeholder={t("home.agendaCode")}
            value={newAgendaData.key}
            onChangeText={(text) => setNewAgendaData((prev) => ({ ...prev, key: text }))}
            inputStyle={[{ color: theme.text }, { minHeight: 40 }, styles.inputField]}
            inputContainerStyle={{ paddingVertical: spacing.xs }}
            containerStyle={styles.dialogInput}
          />
          <View style={[styles.switchContainer, { backgroundColor: theme.card }]}>
            <Text style={{ color: theme.text }}>{t("home.atype")}</Text>
            <Switch
              value={newAgendaData.key_visible}
              onValueChange={(value) =>
                setNewAgendaData((prev) => ({ ...prev, key_visible: value }))
              }
              trackColor={{ false: theme.placeholder, true: theme.button }}
              thumbColor={theme.buttonText}
            />
          </View>
        </View>

        <View style={styles.dialogFooter}>
          <View style={styles.dialogMainActions}>
            <DialogButton onPress={() => setShowCreateDialog(false)}>
              {t("agenda.cancel")}
            </DialogButton>
            <DialogButton
              onPress={handleCreateAgenda}
              disabled={!newAgendaData.name.trim()}
            >
              {t("home.create")}
            </DialogButton>
          </View>
        </View>
      </Dialog>

      {/* Join Agenda Dialog */}
      <Dialog
        isVisible={showJoinDialog}
        onBackdropPress={() => setShowJoinDialog(false)}
        overlayStyle={[styles.dialog, { backgroundColor: theme.card }]}
      >
        <View style={[styles.dialogContent, { backgroundColor: theme.card }]}>
          <View style={[styles.dialogHeader, { backgroundColor: theme.card }]}>
            <View style={[{ flex: 1 }, { backgroundColor: theme.card }]}>
              <Text style={[styles.dialogHeaderTitle, { color: theme.text }]}>
                {t("home.joinAgendaTitle")}
              </Text>
            </View>
          </View>

          <Input
            placeholder={t("home.agendaName")}
            value={joinAgendaData.name}
            onChangeText={handleJoinNameChange}
            inputStyle={[
              { color: theme.text },
              { minHeight: 40 },
              styles.inputField,
              !isJoinNameValid && joinAgendaData.name.trim() && inputErrorStyles.invalidInput,
            ]}
            errorMessage={
              joinAgendaData.name.trim() && !isJoinNameValid ? t("home.error.nameTooLong") : ""
            }
            errorStyle={inputErrorStyles.errorText}
            inputContainerStyle={[
              { paddingVertical: spacing.xs },
              !isJoinNameValid && joinAgendaData.name.trim() && inputErrorStyles.errorBorder,
            ]}
            containerStyle={styles.dialogInput}
          />
          <Input
            placeholder={t("home.agendaCode")}
            value={joinAgendaData.key}
            onChangeText={(text) => setJoinAgendaData((prev) => ({ ...prev, key: text }))}
            inputStyle={[{ color: theme.text }, { minHeight: 40 }, styles.inputField]}
            inputContainerStyle={{ paddingVertical: spacing.xs }}
            containerStyle={styles.dialogInput}
          />
        </View>

        <View style={styles.dialogFooter}>
          <View style={styles.dialogMainActions}>
            <DialogButton onPress={() => setShowJoinDialog(false)}>
              {t("agenda.cancel")}
            </DialogButton>
            <DialogButton
              onPress={handleJoinAgenda}
              disabled={!joinAgendaData.name.trim() || !joinAgendaData.key.trim()}
            >
              {t("home.join")}
            </DialogButton>
          </View>
        </View>
      </Dialog>

      {/* Day Elements and Element Details Dialogs */}
      <DayElementsDialog
        elements={selectedDayElements}
        isVisible={showDayDialog}
        onClose={() => {
          setShowDayDialog(false);
          setSelectedDate(null);
        }}
        onElementPress={(element) => {
          setSelectedElement(element);
          setShowDayDialog(false);
          setSelectedDate(null);
        }}
        theme={theme}
        t={t}
        colorScheme={colorScheme}
        language={language}
      />

      <ElementDetailsDialog
        element={selectedElement}
        isVisible={!!selectedElement}
        onClose={() => setSelectedElement(null)}
        theme={theme}
        t={t}
        language={language}
      />
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    section: {
      marginBottom: spacing.lg,
    },
    listContainer: {
      minHeight: 180,
    },
    listContent: {
      paddingHorizontal: spacing.sm,
    },
    card: {
      padding: spacing.md,
      borderRadius: 12,
      marginRight: spacing.md,
      marginVertical: spacing.sm,
      minWidth: 250,
      maxWidth: 300,
      flex: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    urgentCardBase: {
      padding: spacing.md,
      borderRadius: 12,
      marginBottom: spacing.md,
      borderLeftWidth: 4,
    },
    actionButtons: {
      width: "100%",
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    actionButton: {
      marginHorizontal: spacing.xs,
    },
    joinContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    input: {
      flex: 1,
      marginRight: spacing.sm,
      marginVertical: 0,
    },
    button: {
      minWidth: 100,
      flex: 1,
    },
    emptyContainer: {
      alignItems: "center",
      padding: spacing.md,
    },
    bottomActions: {
      marginTop: "auto",
      paddingTop: spacing.lg,
      gap: spacing.md,
    },
    joinSection: {
      gap: spacing.sm,
    },
    keyInputContainer: {
      flex: 1,
      marginVertical: 0,
      paddingHorizontal: 0,
    },
    keyInputInner: {
      borderBottomWidth: 1,
      height: 40,
    },
    joinButton: {
      minWidth: 80,
      height: 40,
    },
    createButton: {
      marginTop: spacing.sm,
    },
    switchContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.sm,
    },
    buttonGroup: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    dialog: {
      width: "90%",
      borderRadius: 12,
      padding: 0,
      overflow: "hidden",
    },
    dialogContent: {
      padding: spacing.lg,
    },
    dialogTitle: {
      ...typography.h2,
      marginBottom: spacing.md,
    },
    dialogDetails: {
      ...typography.body,
      marginBottom: spacing.md,
      lineHeight: 20,
    },
    dialogDeadline: {
      ...typography.caption,
      opacity: 0.7,
    },
    dayDialog: {
      width: "90%",
      padding: spacing.md,
      maxHeight: "80%",
      backgroundColor: "transparent",
      shadowColor: "transparent",
    },
    dialogDayContainer: {
      width: "100%",
      borderRadius: 12,
      padding: spacing.md,
      shadowColor: "transparent",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    dialogElementsContainer: {
      minHeight: 400,
      maxHeight: 400,
      overflow: "hidden",
    },
    elementTextContainer: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.05)",
      borderRadius: 12,
      padding: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    urgentListContent: {
      marginTop: spacing.sm,
    },
    modal: {
      margin: 0,
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      width: "90%",
      padding: spacing.lg,
      borderRadius: 12,
      maxHeight: "90%",
    },
    bottomSheet: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      margin: 0,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      paddingTop: spacing.sm,
      maxHeight: "80%",
    },
    bottomSheetContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
    },
    bottomSheetHandle: {
      width: 40,
      height: 4,
      backgroundColor: "#999",
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: spacing.md,
    },
    modalContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
    },
    separator: {
      marginVertical: 30,
      height: 1,
      width: "80%",
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      width: "100%",
      padding: spacing.lg,
      paddingBottom: 0,
      position: "absolute",
      zIndex: 1,
      backgroundColor: "transparent",
    },
    scrollContent: {
      flexGrow: 1,
      paddingTop: spacing.xl + spacing.lg,
      padding: spacing.lg,
    },
    bottomSection: {
      marginBottom: spacing.xl,
    },
    miniCalendar: {
      paddingTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: "transparent",
      marginTop: "auto",
    },
    miniWeekContainer: {
      flexDirection: "row",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      height: 204,
    },
    dayContainer: {
      width: 120,
      height: 170,
      borderRadius: 12,
      padding: spacing.sm,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      marginHorizontal: 2,
    },
    dayHeader: {
      ...typography.h4,
      textAlign: "center",
      marginBottom: spacing.sm,
    },
    elementsContainer: {
      flex: 1,
      overflow: "hidden",
    },
    elementItem: {
      padding: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 8,
      marginBottom: spacing.xs,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    elementText: {
      ...typography.caption,
      fontSize: 12,
    },
    moreContainer: {
      alignSelf: "center",
      marginTop: spacing.xs,
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1,
      elevation: 2,
    },
    moreText: {
      ...typography.caption,
      fontSize: 10,
      fontWeight: "600",
    },
    welcomeContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingBottom: "20%",
    },
    loginButton: {
      minWidth: 200,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    viewAgendaButton: {
      marginTop: spacing.md,
      alignSelf: "flex-end",
    },
    keyContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      paddingVertical: spacing.xs,
    },
    copyIcon: {
      marginLeft: spacing.xs,
    },
    elementDialogScroll: {
      maxHeight: 300,
    },
    elementCard: {
      marginBottom: spacing.xs,
      borderRadius: 8,
      overflow: "hidden",
      borderLeftWidth: 3,
      width: "100%",
    },
    elementHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.xs,
    },
    elementContent: {
      flex: 1,
    },
    titleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    titleMain: {
      flex: 1,
    },
    elementTitle: {
      ...typography.h3,
      fontSize: 13,
      marginBottom: 4,
      marginTop: 4,
      margin: 3,
    },
    urgentCard: {
      marginBottom: spacing.xs,
      borderRadius: 8,
      overflow: "hidden",
      borderLeftWidth: 3,
      width: "100%",
    },
    urgentHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      padding: spacing.sm,
    },
    urgentContent: {
      flex: 1,
    },
    urgentTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    urgentTitleMain: {
      flex: 1,
      marginRight: spacing.sm,
    },
    urgentTitle: {
      ...typography.h3,
      fontSize: 15,
      marginBottom: 2,
    },
    urgentDeadline: {
      ...typography.caption,
      fontSize: 12,
      opacity: 0.7,
    },
    dialogFooter: {
      borderTopWidth: 1,
      borderTopColor: "transparent",
      paddingVertical: spacing.xs,
    },
    dialogMainActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      paddingHorizontal: spacing.lg,
    },
    dialogHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: spacing.md,
    },
    dialogHeaderTitle: {
      ...typography.h3,
    },
    dialogFooterActions: {
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.md,
      paddingTop: 0,
      borderTopWidth: 1,
      borderTopColor: "transparent",
    },
    elementFlags: {
      flexDirection: "row",
      alignItems: "center",
    },
    elementDetailsTitle: {
      ...typography.h3,
      fontSize: 20,
      marginBottom: 0,
    },
});