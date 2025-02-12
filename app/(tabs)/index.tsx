import { StyleSheet, FlatList, RefreshControl, Alert, Switch, Pressable } from "react-native"
import { View, Text } from "@/components/Themed"
import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Agenda, AgendaElement } from "@/types"
import { Button, Input, Dialog } from "@rneui/themed"
import { router, Link } from "expo-router"
import type { Session } from "@supabase/supabase-js"
import Colors from "@/constants/Colors"
import { typography, spacing } from "@/constants/Typography"
import { useColorScheme } from "@/components/useColorScheme"
import { useFocusEffect } from '@react-navigation/native';

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

export default function HomeScreen() {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme]
  const [agendas, setAgendas] = useState<Agenda[]>([])
  const [session, setSession] = useState<Session | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [key, setKey] = useState("")
  const [agendaElements, setAgendaElements] = useState<AgendaElement[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newAgendaData, setNewAgendaData] = useState({
    name: '',
    key: '',
    key_visible: true
  })
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [joinAgendaData, setJoinAgendaData] = useState({
    name: '',
    key: ''
  })

  const resetState = useCallback(() => {
    setAgendas([])
    setAgendaElements([])
    setKey("")
    setShowCreateDialog(false)
    setShowJoinDialog(false)
    setNewAgendaData({ name: '', key: '', key_visible: true })
    setJoinAgendaData({ name: '', key: '' })
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      
      if (event === 'SIGNED_OUT') {
        resetState()
        router.replace('/three')
        return
      }

      if (event === 'SIGNED_IN') {
        resetState()
        setSession(session)
        if (session?.user) {
          Promise.all([
            fetchAgendas(session),
            fetchAgendaElements(session)
          ]).finally(() => setLoading(false))
        }
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [resetState, fetchAgendas, fetchAgendaElements])

  useEffect(() => {
    let mounted = true

    async function initialize() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        
        if (!session?.user) {
          router.replace('/three')
          return
        }

        setSession(session)
        await Promise.all([
          fetchAgendas(session),
          fetchAgendaElements(session)
        ])
      } catch (error) {
        console.error('Init error:', error)
        if (mounted) {
          Alert.alert('Error', 'Failed to initialize')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    resetState()
    initialize()
    return () => { mounted = false }
  }, [resetState])

  const fetchAgendas = useCallback(async (currentSession?: Session | null) => {
    const userSession = currentSession || session;
    if (!userSession?.user?.id) return;
    
    try {
      setLoading(true);
      
      const { data: agendas, error } = await supabase
        .from("Agenda")
        .select(`
          *,
          sections:"Agenda Section"(*)
        `) // Fixed: Use correct table name with quotes
        .or(`creator_id.eq.${userSession.user.id},key_visible.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgendas(agendas || []);
    } catch (error) {
      console.error('Fetch agendas error:', error);
      Alert.alert('Error', 'Failed to load agendas');
    } finally {
      setLoading(false);
    }
  }, [session]);

  const fetchAgendaElements = useCallback(async (currentSession?: Session | null) => {
    const userSession = currentSession || session;
    if (!userSession?.user?.id) return;

    try {
      // Fetch urgent elements for this user
      const { data: urgentElements, error: urgentError } = await supabase
        .from('Urgent Element')
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
        .eq('user_id', userSession.user.id)
        .order('created_at', { ascending: false });

      if (urgentError) throw urgentError;

      // Filter out any null elements and map to the element structure
      const elements = urgentElements
        ?.filter(ue => ue.element) // Filter out null elements
        .map(ue => ({
          ...ue.element,
          agendaName: ue.element.section.agenda.name // Add agenda name for display
        }));

      setAgendaElements(elements || []);
    } catch (error) {
      console.error('Error fetching urgent elements:', error);
      Alert.alert('Error', 'Failed to load urgent items');
    }
  }, [session]);

  // Focus listener to refresh data when returning to this screen
  useFocusEffect(
    useCallback(() => {
      if (session?.user) {
        fetchAgendaElements();
      }
    }, [session, fetchAgendaElements])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    Promise.all([
      fetchAgendas(),
      fetchAgendaElements()
    ]).finally(() => setRefreshing(false))
  }, [fetchAgendas, fetchAgendaElements])

  const handleJoinAgenda = async () => {
    if (!session?.user?.id || !joinAgendaData.name || !joinAgendaData.key) return
    
    try {
      const trimmedName = joinAgendaData.name.trim()
      const trimmedKey = joinAgendaData.key.trim()
  
      console.log('Debug - Exact values being searched:', {
        name: trimmedName,
        key: trimmedKey,
        length: {
          name: trimmedName.length,
          key: trimmedKey.length
        }
      })
  
      // Search for ANY agenda matching these credentials
      const { data: foundAgendas, error: searchError } = await supabase
        .from("Agenda")
        .select("*")
        .eq("key", trimmedKey)
        .ilike("name", trimmedName)
  
      console.log('Debug - Raw Supabase response:', {
        data: foundAgendas,
        error: searchError,
        query: supabase
          .from("Agenda")
          .select("*")
          .eq("key", trimmedKey)
          .ilike("name", trimmedName)
      })
  
      if (searchError) {
        console.error('Search error:', searchError)
        throw searchError
      }

      const agenda = foundAgendas[0]

      // Check if it's own agenda
      if (agenda.creator_id === session.user.id) {
        Alert.alert("Error", "You're already the owner of this agenda")
        return
      }

      // If the key is not visible and user is not the creator, reject
      if (!agenda.key_visible) {
        Alert.alert("Error", "This agenda's key is private")
        return
      }

      // Check if already a member using the correct table name
      const { data: existingMember } = await supabase
        .from("Agenda Member")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("agenda_id", agenda.id)
        .maybeSingle()

      if (existingMember) {
        Alert.alert("Error", "You're already a member of this agenda")
        return
      }

      // Join the agenda using the correct table name
      const { error: joinError } = await supabase
        .from("Agenda Member")
        .insert({
          user_id: session.user.id,
          agenda_id: agenda.id
        })

      if (joinError) throw joinError

      // Wait for fetchAgendas to complete before closing dialog
      await fetchAgendas()
      setShowJoinDialog(false)
      setJoinAgendaData({ name: '', key: '' })
      Alert.alert("Success", `Joined agenda "${agenda.name}"!`)

    } catch (error) {
      console.error('Join error:', error)
      Alert.alert(
        "Error", 
        "Failed to join agenda. Please verify the credentials."
      )
    }
  }

  // Add this function for testing - create a test agenda
  const createTestAgenda = async () => {
    try {
      const { data, error } = await supabase
        .from("Agenda")
        .insert([{
          name: "Test Agenda",
          key: "test123",
          key_visible: true,
          creator_id: session?.user?.id
        }])
        .select()
        .single()

      if (error) throw error
      console.log('Created test agenda:', data)
      await fetchAgendas()
    } catch (error) {
      console.error('Test agenda creation error:', error)
    }
  }

  const handleCreateAgenda = async () => {
    if (!session?.user?.id || !newAgendaData.name) return
    
    try {
      const { data, error } = await supabase
        .from("Agenda")
        .insert([{
          name: newAgendaData.name,
          key: newAgendaData.key || Math.random().toString(36).substring(2, 8),
          key_visible: newAgendaData.key_visible,
          creator_id: session.user.id
        }])
        .select()
        .single()

      if (error) throw error

      setShowCreateDialog(false)
      setNewAgendaData({ name: '', key: '', key_visible: true })
      fetchAgendas()
      Alert.alert("Success", "Agenda created successfully!")
    } catch (error) {
      console.error('Create agenda error:', error)
      Alert.alert("Error", "Failed to create agenda")
    }
  }

  const renderAgendaItem = ({ item }: { item: Agenda }) => (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Text style={[typography.h3, { color: colors.text }]}>{item.name || "Untitled"}</Text>
      {item.key_visible && (
        <Text style={[typography.caption, { color: colors.text }]}>Key: {item.key}</Text>
      )}
      <Button
        title="View"
        type="clear"
        titleStyle={{ color: colors.tint }}
        onPress={() => router.push(`/agenda/${item.id}`)}
      />
    </View>
  )

  const renderUrgentItem = ({ item }: { item: AgendaElement }) => (
    <View style={[styles.urgentCard, { backgroundColor: colors.card }]}>
      <Text style={[typography.h3, { color: colors.text }]}>{item.subject}</Text>
      <Text style={[typography.caption, { color: colors.placeholder }]}>
        {item.agendaName} • Due: {new Date(item.deadline).toLocaleDateString()}
      </Text>
      <Button
        title="View Agenda"
        type="clear"
        titleStyle={{ color: colors.tint }}
        onPress={() => router.push(`/agenda/${item.section.agenda.id}`)}
      />
    </View>
  );

  if (!session || !session.user) {
    return null // Will redirect via useEffect
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Urgent section */}
      {!loading && agendaElements.length > 0 && (
        <View style={styles.section}>
          <View>
            {agendaElements.slice(0, 2).map((item) => (
              <View key={item.id}>
                {renderUrgentItem({ item })}
              </View>
            ))}
            {agendaElements.length > 2 && (
              <Link 
                href={{
                  pathname: "/urgent",
                  params: {
                    items: encodeURIComponent(JSON.stringify(agendaElements.map(item => ({
                      id: item.id,
                      subject: item.subject,
                      deadline: item.deadline,
                      agendaName: item.agendaName,
                      agendaId: item.section.agenda.id
                    }))))
                  }
                }} 
                asChild
              >
                <Pressable>
                  {({ pressed }) => (
                    <Text
                      style={[
                        typography.body,
                        { 
                          color: colors.text,
                          opacity: pressed ? 0.5 : 1,
                          textAlign: 'center',
                          padding: spacing.sm,
                          fontSize: 20 
                        }
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

      {/* Your Agendas section */}
      <View style={styles.section}>
        {loading ? (
          <Text style={{ color: colors.text }}>Loading agendas...</Text>
        ) : agendas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ color: colors.text }}>No agendas found</Text>
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
      <View style={styles.section}>
        <View style={styles.buttonGroup}>
          <Button
            title="Create Agenda"
            onPress={() => setShowCreateDialog(true)}
            containerStyle={styles.button}
            buttonStyle={{ backgroundColor: colors.button }}
            titleStyle={{ color: colors.buttonText }}
          />
          <Button
            title="Join Agenda"
            type="outline"
            onPress={() => setShowJoinDialog(true)}
            containerStyle={styles.button}
            buttonStyle={{ borderColor: colors.button }}
            titleStyle={{ color: colors.button }}
          />
        </View>
      </View>

      <Dialog
        isVisible={showCreateDialog}
        onBackdropPress={() => setShowCreateDialog(false)}
        overlayStyle={[styles.dialog, { backgroundColor: colors.card }]}
      >
        <View style={[styles.dialogContent, , { backgroundColor: colors.card }]}>
          <Text style={[typography.h3, { color: colors.text }]}>Create New Agenda</Text>
          <Input
            placeholder="Agenda Name"
            value={newAgendaData.name}
            onChangeText={(text) => setNewAgendaData(prev => ({ ...prev, name: text }))}
            inputStyle={{ color: colors.text }}
          />
          <Input
            placeholder="Custom Key (optional)"
            value={newAgendaData.key}
            onChangeText={(text) => setNewAgendaData(prev => ({ ...prev, key: text }))}
            inputStyle={{ color: colors.text }}
          />
          <View style={[styles.switchContainer, { backgroundColor: colors.card }]}>
            <Text style={{ color: colors.text }}>Make key visible</Text>
            <Switch
              value={newAgendaData.key_visible}
              onValueChange={(value) => setNewAgendaData(prev => ({ ...prev, key_visible: value }))}
              trackColor={{ false: colors.placeholder, true: colors.button }}
              thumbColor={colors.buttonText}
            />
          </View>
          <View style={[{ flexDirection: 'row', justifyContent: 'flex-end' }, { backgroundColor: colors.card }]}>
            <DialogButton onPress={() => setShowCreateDialog(false)}>
              Cancel
            </DialogButton>
            <DialogButton 
              onPress={handleCreateAgenda}
              disabled={!newAgendaData.name.trim()}
            >
              Create
            </DialogButton>
          </View>
        </View>
      </Dialog>

      <Dialog
        isVisible={showJoinDialog}
        onBackdropPress={() => setShowJoinDialog(false)}
        overlayStyle={[styles.dialog, { backgroundColor: colors.card }]}
      >
        <View style={[styles.dialogContent, { backgroundColor: colors.card }]}>
          <Text style={[typography.h3, { color: colors.text }]}>Join New Agenda</Text>
          <Input
            placeholder="Agenda Name"
            value={joinAgendaData.name}
            onChangeText={(text) => setJoinAgendaData(prev => ({ ...prev, name: text }))}
            inputStyle={{ color: colors.text }}
          />
          <Input
            placeholder="Agenda Key"
            value={joinAgendaData.key}
            onChangeText={(text) => setJoinAgendaData(prev => ({ ...prev, key: text }))}
            inputStyle={{ color: colors.text }}
          />
          <View style={[{ flexDirection: 'row', justifyContent: 'flex-end' }, { backgroundColor: colors.card }]}>
            <DialogButton onPress={() => setShowJoinDialog(false)}>
              Cancel
            </DialogButton>
            <DialogButton 
              onPress={handleJoinAgenda}
              disabled={!joinAgendaData.name.trim() || !joinAgendaData.key.trim()}
            >
              Join
            </DialogButton>
          </View>
        </View>
      </Dialog>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
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
  urgentCard: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.error,
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
    alignItems: 'center',
    padding: spacing.md,
  },
  bottomActions: {
    marginTop: 'auto',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
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
  urgentListContent: {
    marginTop: spacing.sm,
  },
  modal: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    padding: spacing.lg,
    borderRadius: 12,
    maxHeight: '90%',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    margin: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: spacing.sm,
    maxHeight: '80%',
  },
  bottomSheetContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#999',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
})
