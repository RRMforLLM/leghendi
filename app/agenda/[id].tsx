import { useEffect, useState, useCallback } from 'react';
import { StyleSheet, FlatList, Alert } from 'react-native';
import { View, Text } from '@/components/Themed';
import { Button, Input, Dialog } from '@rneui/themed';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams } from 'expo-router';
import { AgendaWithSections, AgendaElement } from '@/types';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

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

  const fetchAgenda = useCallback(async () => {
    try {
      const { data: agenda, error } = await supabase
        .from("Agenda")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

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
            emission,
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

      setAgenda(agendaWithSections);
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
          section_id: newElementData.sectionId,
          emission: new Date().toISOString()
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

  const renderElement = ({ item }: { item: AgendaElement }) => (
    <View style={[styles.elementCard, { backgroundColor: theme.card }]}>
      <Text style={[styles.elementTitle, { color: theme.text }]}>{item.subject}</Text>
      {item.details && (
        <Text style={[styles.elementDetails, { color: theme.text }]}>{item.details}</Text>
      )}
      <View style={styles.elementMeta}>
        <Text style={[styles.deadline, { color: theme.text }]}>
          Due: {new Date(item.deadline).toLocaleDateString()}
        </Text>
        <Text style={[styles.status, { color: theme.text }]}>{item.status}</Text>
      </View>
    </View>
  );

  const renderSection = ({ item: section }) => (
    <View style={styles.sectionContainer}>
      <View style={[styles.sectionHeader, { borderBottomColor: theme.border }]}>
        <Text style={styles.sectionTitle}>{section.name}</Text>
        {isCreator && (
          <Button
            title="+"
            type="clear"
            onPress={() => handleAddElement(section.id)}
          />
        )}
      </View>
      <FlatList
        data={section.elements}
        renderItem={renderElement}
        keyExtractor={item => item.id}
        style={styles.elementsList}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>No elements in this section</Text>
        )}
      />
    </View>
  );

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
      <View style={styles.header}>
        <Text style={styles.title}>{agenda.name}</Text>
        {isCreator && (
          <Button
            title="+ Add Section"
            type="outline"
            onPress={() => setShowSectionDialog(true)}
          />
        )}
      </View>
      <FlatList
        data={agenda.sections}
        renderItem={renderSection}
        keyExtractor={item => item.id}
        style={styles.sectionsList}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>No sections yet</Text>
        )}
      />

      {/* Add Section Dialog */}
      <Dialog
        isVisible={showSectionDialog}
        onBackdropPress={() => setShowSectionDialog(false)}
      >
        <Dialog.Title title="Add New Section"/>
        <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
          <Input
            placeholder="Section Name"
            value={newSectionName}
            onChangeText={setNewSectionName}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
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
      >
        <Dialog.Title title="Add New Element"/>
        <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
          <Input
            placeholder="Subject"
            value={newElementData.subject}
            onChangeText={(text) => setNewElementData(prev => ({ ...prev, subject: text }))}
          />
          <Input
            placeholder="Details (optional)"
            value={newElementData.details}
            onChangeText={(text) => setNewElementData(prev => ({ ...prev, details: text }))}
            multiline
          />
          <Input
            placeholder="Deadline (YYYY-MM-DD)"
            value={newElementData.deadline}
            onChangeText={(text) => setNewElementData(prev => ({ ...prev, deadline: text }))}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <DialogButton onPress={() => setShowElementDialog(false)}>
              Cancel
            </DialogButton>
            <DialogButton 
              onPress={addElement}
              disabled={!newElementData.subject.trim()}
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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  sectionsList: {
    flex: 1,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  elementsList: {
    marginLeft: 10,
  },
  elementCard: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
  },
  elementTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
  },
  elementDetails: {
    fontSize: 14,
    marginBottom: 10,
    opacity: 0.7,
  },
  elementMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deadline: {
    fontSize: 12,
    opacity: 0.6,
  },
  status: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.5,
    padding: 20,
  },
  dialog: {
    borderRadius: 8,
    padding: 20,
  },
});
