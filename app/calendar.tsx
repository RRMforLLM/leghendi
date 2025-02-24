import { useEffect, useState } from 'react';
import { StyleSheet, View as RNView, ScrollView, Pressable } from 'react-native';
import { View, Text } from '@/components/Themed';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { AgendaElement } from '@/types';
import Colors from '@/constants/Colors';
import { typography, spacing } from '@/constants/Typography';
import { useColorScheme } from '@/components/useColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button, Dialog, Icon } from '@rneui/themed'; // Update import to include Button

type ViewType = 'week' | 'month';

interface CalendarElement extends AgendaElement {
  isUrgent?: boolean;
  sectionId?: string;
  sectionName?: string;
}

interface Section {
  id: string;
  name: string;
}

const ElementDetailsDialog = ({ element, isVisible, onClose, theme, t, language }) => {
  if (!element) return null;  // Add this guard clause
  
  return (
    <Dialog
      isVisible={isVisible}
      onBackdropPress={onClose}
      overlayStyle={[styles.dialog, { backgroundColor: theme.card }]}
    >
      <View style={[styles.dialogContent, { backgroundColor: theme.card }]}>
        <Text style={[styles.dialogTitle, { color: theme.text }]}>
          {element.subject}
        </Text>
        {element.details && (
          <Text style={[styles.dialogDetails, { color: theme.text }]}>
            {element.details}
          </Text>
        )}
        <Text style={[styles.dialogDeadline, { color: theme.placeholder }]}>
          {t('agenda.due')}: {new Date(element.deadline).toLocaleDateString(language)}
        </Text>
      </View>
    </Dialog>
  );
};

const DayElementsDialog = ({ elements, isVisible, onClose, onElementPress, theme, t, colorScheme, language }) => (
  <Dialog
    isVisible={isVisible}
    onBackdropPress={onClose}
    overlayStyle={[styles.dayDialog, { backgroundColor: theme.card }]}
  >
    <View style={[styles.dialogContent, { backgroundColor: theme.card }]}>
      <Text style={[styles.dialogTitle, { color: theme.text }]}>
        {new Date(elements[0]?.deadline).toLocaleDateString(language)}
      </Text>
      <ScrollView style={styles.dayDialogScroll}>
        {elements.map((element, index) => (
          <Pressable
            key={`${element.id}-${index}`}
            onPress={() => onElementPress(element)}
            style={({ pressed }) => [
              styles.dayDialogElement,
              element.isUrgent && { backgroundColor: Colors[colorScheme ?? 'light'].error + '20' },
              { opacity: pressed ? 0.7 : 1 }
            ]}
          >
            <View style={styles.elementTextContainer}>
              <Text
                style={[
                  styles.dayDialogElementText,
                  { color: theme.text },
                  element.isUrgent && { color: Colors[colorScheme ?? 'light'].error }
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {element.subject}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  </Dialog>
);

const getWeekDates = (date: Date) => {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const newDate = new Date(startOfWeek);
    newDate.setDate(startOfWeek.getDate() + i);
    dates.push(new Date(newDate));
  }
  return dates;
};

export default function CalendarScreen() {
  const { t, language } = useLanguage(); // Add language here
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { elements: encodedElements } = useLocalSearchParams();
  const [currentWeek, setCurrentWeek] = useState<Date[]>([]);
  const [elementsByDay, setElementsByDay] = useState<{[key: string]: CalendarElement[]}>({});
  const [selectedElement, setSelectedElement] = useState<CalendarElement | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [viewType, setViewType] = useState<ViewType>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayElements, setSelectedDayElements] = useState<CalendarElement[]>([]);
  const [showDayDialog, setShowDayDialog] = useState(false);

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewType === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
    if (viewType === 'week') {
      setCurrentWeek(getWeekDates(newDate));
    }
  };

  useEffect(() => {
    // Set up navigation options
    navigation.setOptions({
      title: t('calendar.header'),
      headerBackTitle: t('agenda.header'),
    });

    // Set current week dates immediately when component mounts
    setCurrentWeek(getWeekDates(currentDate));

    // Parse and organize elements by day with sections
    if (encodedElements) {
      try {
        const elements: CalendarElement[] = JSON.parse(decodeURIComponent(encodedElements as string));
        
        // Extract unique sections
        const uniqueSections = Array.from(new Set(elements.map(e => e.sectionId)))
          .filter(Boolean)
          .map(sectionId => ({
            id: sectionId as string,
            name: elements.find(e => e.sectionId === sectionId)?.sectionName || sectionId
          }));
        setSections(uniqueSections);

        // Organize elements by day
        const organized: {[key: string]: CalendarElement[]} = {};
        elements.forEach(element => {
          const dateKey = new Date(element.deadline).toDateString();
          if (!organized[dateKey]) {
            organized[dateKey] = [];
          }
          organized[dateKey].push(element);
        });

        setElementsByDay(organized);
      } catch (error) {
        console.error('Error parsing elements:', error);
      }
    }
  }, [encodedElements, currentDate]); // Add currentDate as dependency

  // Add this effect to update week when currentDate changes
  useEffect(() => {
    if (viewType === 'week') {
      setCurrentWeek(getWeekDates(currentDate));
    }
  }, [currentDate, viewType]);

  const getDayName = (date: Date) => {
    const days = {
      0: 'calendar.days.sun',
      1: 'calendar.days.mon',
      2: 'calendar.days.tue',
      3: 'calendar.days.wed',
      4: 'calendar.days.thu',
      5: 'calendar.days.fri',
      6: 'calendar.days.sat'
    };
    return t(days[date.getDay() as keyof typeof days]);
  };

  const getMonthName = (date: Date) => {
    const months = {
      0: 'calendar.months.jan',
      1: 'calendar.months.feb',
      2: 'calendar.months.mar',
      3: 'calendar.months.apr',
      4: 'calendar.months.may',
      5: 'calendar.months.jun',
      6: 'calendar.months.jul',
      7: 'calendar.months.aug',
      8: 'calendar.months.sep',
      9: 'calendar.months.oct',
      10: 'calendar.months.nov',
      11: 'calendar.months.dec',
    };
    return t(months[date.getMonth() as keyof typeof months]);
  };

  const getDaysInMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const days: Date[] = [];
    
    // Add padding days from previous month
    for (let i = 0; i < firstDay.getDay(); i++) {
      const prevDate = new Date(firstDay);
      prevDate.setDate(prevDate.getDate() - (firstDay.getDay() - i));
      days.push(prevDate);
    }
    
    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(date.getFullYear(), date.getMonth(), i));
    }
    
    // Add padding days from next month if needed
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const nextDate = new Date(lastDay);
      nextDate.setDate(nextDate.getDate() + i);
      days.push(nextDate);
    }
    
    return days;
  };

  const getFilteredElements = (dayElements: CalendarElement[]) => {
    if (selectedSection === 'all') return dayElements;
    return dayElements.filter(element => element.sectionId === selectedSection);
  };

  const renderSectionPicker = () => (
    <Dialog
      isVisible={showSectionPicker}
      onBackdropPress={() => setShowSectionPicker(false)}
      overlayStyle={[styles.dialog, { backgroundColor: theme.card }]}
    >
      <View style={[styles.dialogContent, { backgroundColor: theme.card }]}>
        <Pressable
          style={[styles.sectionOption, 
            { backgroundColor: selectedSection === 'all' ? theme.tint + '20' : 'transparent' }
          ]}
          onPress={() => {
            setSelectedSection('all');
            setShowSectionPicker(false);
          }}
        >
          <Text style={[styles.sectionOptionText, { color: theme.text }]}>
            {t('calendar.allSections')}
          </Text>
        </Pressable>
        {sections.map(section => (
          <Pressable
            key={section.id}
            style={[styles.sectionOption, 
              { backgroundColor: selectedSection === section.id ? theme.tint + '20' : 'transparent' }
            ]}
            onPress={() => {
              setSelectedSection(section.id);
              setShowSectionPicker(false);
            }}
          >
            <Text style={[styles.sectionOptionText, { color: theme.text }]}>
              {section.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </Dialog>
  );

  const renderDay = (date: Date) => {
    const dateKey = date.toDateString();
    const dayElements = elementsByDay[dateKey] || [];
    const filteredElements = getFilteredElements(dayElements);
    const isToday = new Date().toDateString() === dateKey;

    return (
      <View key={dateKey} style={[
        styles.dayContainer,
        { backgroundColor: theme.card },
        isToday && { borderColor: theme.tint, borderWidth: 1 }
      ]}>
        <Text style={[styles.dayHeader, { color: theme.text }]}>
          {getDayName(date)}
          {'\n'}
          {date.getDate()}
        </Text>
        <ScrollView style={styles.elementsContainer}>
          {filteredElements.map((element, index) => (
            <Pressable 
              key={`${element.id}-${index}`}
              onPress={() => setSelectedElement(element)}
              style={({ pressed }) => [
                styles.elementItem,
                element.isUrgent && { backgroundColor: Colors[colorScheme ?? 'light'].error + '20' },
                { opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <View style={styles.elementTextContainer}>
                <Text 
                  style={[
                    styles.elementText,
                    { color: theme.text },
                    element.isUrgent && { color: Colors[colorScheme ?? 'light'].error }
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {element.subject}
                </Text>
              </View>
            </Pressable>
          ))}
          {filteredElements.length === 0 && dayElements.length > 0 && (
            <Text style={[styles.emptyText, { color: theme.placeholder }]}>
              {t('calendar.noEventsInSection')}
            </Text>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    const currentMonth = currentDate.getMonth();
    
    return (
      <View style={styles.monthContainer}>
        <View style={styles.weekDayHeader}>
          {['calendar.days.sun', 'calendar.days.mon', 'calendar.days.tue', 
            'calendar.days.wed', 'calendar.days.thu', 'calendar.days.fri', 
            'calendar.days.sat'].map((day) => (
            <Text key={day} style={[styles.weekDayText, { color: theme.text }]}>
              {t(day)}
            </Text>
          ))}
        </View>
        <View style={styles.monthGrid}>
          {days.map((date, index) => {
            const dayElements = elementsByDay[date.toDateString()] || [];
            const filteredElements = getFilteredElements(dayElements);
            const isToday = new Date().toDateString() === date.toDateString();
            const isCurrentMonth = date.getMonth() === currentMonth;

            return (
              <Pressable
                key={index}
                style={[
                  styles.monthDay,
                  { backgroundColor: theme.card },
                  isToday && { borderColor: theme.tint, borderWidth: 1 },
                  !isCurrentMonth && { opacity: 0.5 }
                ]}
                onPress={() => {
                  if (filteredElements.length > 0) {
                    setSelectedDayElements(filteredElements);
                    setShowDayDialog(true);
                  }
                }}
              >
                <Text style={[styles.monthDayText, { color: theme.text }]}>
                  {date.getDate()}
                </Text>
                {filteredElements.length > 0 && (
                  <View style={[styles.monthDayDot, { backgroundColor: theme.tint }]} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          title={selectedSection === 'all' 
            ? t('calendar.allSections')
            : sections.find(s => s.id === selectedSection)?.name || ''
          }
          type="clear"
          onPress={() => setShowSectionPicker(true)}
          icon={{
            name: 'filter',
            type: 'font-awesome-5',
            size: 14,
            color: theme.text,
          }}
          iconRight
          titleStyle={{ color: theme.text }}
        />
        <View style={styles.viewToggle}>
          <Button
            title={t('calendar.weekView')}
            type={viewType === 'week' ? 'solid' : 'clear'}
            onPress={() => setViewType('week')}
            buttonStyle={viewType === 'week' ? { backgroundColor: theme.tint } : undefined}
            titleStyle={viewType === 'week' ? { color: colorScheme === 'dark' ? 'black' : 'white' } : { color: theme.text }}
          />
          <Button
            title={t('calendar.monthView')}
            type={viewType === 'month' ? 'solid' : 'clear'}
            onPress={() => setViewType('month')}
            buttonStyle={viewType === 'month' ? { backgroundColor: theme.tint } : undefined}
            titleStyle={viewType === 'month' ? { color: colorScheme === 'dark' ? 'black' : 'white' } : { color: theme.text }}
          />
        </View>
      </View>

      <View style={styles.periodNavigation}>
        <Icon
          name="chevron-left"
          type="font-awesome-5"
          size={20}
          color={theme.text}
          onPress={() => navigatePeriod('prev')}
          containerStyle={styles.navIcon}
        />
        <Text style={[styles.periodText, { color: theme.text }]}>
          {viewType === 'week' && currentWeek.length > 0
            ? `${currentWeek[0].toLocaleDateString(language, { month: 'short', day: 'numeric' })} - ${currentWeek[6].toLocaleDateString(language, { month: 'short', day: 'numeric' })}`
            : `${getMonthName(currentDate)} ${currentDate.getFullYear()}`
          }
        </Text>
        <Icon
          name="chevron-right"
          type="font-awesome-5"
          size={20}
          color={theme.text}
          onPress={() => navigatePeriod('next')}
          containerStyle={styles.navIcon}
        />
      </View>
      
      {viewType === 'week' ? (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekContainer}
        >
          {currentWeek.map(date => renderDay(date))}
        </ScrollView>
      ) : (
        renderMonthView()
      )}

      {renderSectionPicker()}

      {/* Day Elements Dialog */}
      <DayElementsDialog
        elements={selectedDayElements}
        isVisible={showDayDialog}
        onClose={() => setShowDayDialog(false)}
        onElementPress={(element) => {
          setSelectedElement(element);
          setShowDayDialog(false);
        }}
        theme={theme}
        t={t}
        colorScheme={colorScheme}
        language={language}
      />

      {/* Element Details Dialog */}
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
    padding: spacing.sm,
  },
  weekContainer: {
    flexDirection: 'row',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  dayContainer: {
    width: 120,
    height: '100%',
    borderRadius: 12,
    padding: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayHeader: {
    ...typography.h4,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  elementsContainer: {
    flex: 1,
  },
  elementItem: {
    padding: spacing.xs,
    marginBottom: spacing.xs,
    borderRadius: 12, // Increased from 6 to 12 for softer look
  },
  elementTextContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.05)', // Add subtle background
    borderRadius: 12,
    padding: spacing.sm,
    paddingHorizontal: spacing.md, // Add more horizontal padding
  },
  elementText: {
    ...typography.caption,
  },
  dialog: {
    width: '90%',
    borderRadius: 12,
    padding: spacing.md,
  },
  dialogContent: {
    padding: spacing.md,
  },
  dialogTitle: {
    ...typography.h2,
    marginBottom: spacing.md,
  },
  dialogDetails: {
    ...typography.body,
    marginBottom: spacing.md,
  },
  dialogDeadline: {
    ...typography.caption,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  sectionOption: {
    padding: spacing.md,
    borderRadius: 8,
    marginVertical: spacing.xs,
  },
  sectionOptionText: {
    ...typography.body,
  },
  emptyText: {
    ...typography.caption,
    textAlign: 'center',
    padding: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  monthContainer: {
    flex: 1,
    padding: spacing.md,
  },
  monthHeader: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  weekDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
  },
  weekDayText: {
    ...typography.caption,
    width: 40,
    textAlign: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthDay: {
    width: '14%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  monthDayText: {
    ...typography.body,
  },
  monthDayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: spacing.xs,
  },
  dayDialog: {
    width: '90%',
    borderRadius: 12,
    padding: spacing.md,
    maxHeight: '80%',
  },
  dayDialogScroll: {
    maxHeight: 300,
  },
  dayDialogElement: {
    marginBottom: spacing.xs,
    borderRadius: 12,
  },
  dayDialogElementText: {
    ...typography.body,
    padding: spacing.sm, // Add padding to text
    paddingHorizontal: spacing.md, // Add more horizontal padding
  },
  periodNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  periodText: {
    ...typography.h3,
    textAlign: 'center',
    flex: 1,
  },
  navIcon: {
    padding: spacing.sm,
    borderRadius: 8,
  },
});
