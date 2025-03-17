import { useEffect, useState, useRef } from 'react';
import { StyleSheet, View as RNView, ScrollView, Pressable } from 'react-native';
import { View, Text } from '@/components/Themed';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { AgendaElement } from '@/types';
import Colors from '@/constants/Colors';
import { typography, spacing } from '@/constants/Typography';
import { useColorScheme } from '@/components/useColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button, Dialog, Icon } from '@rneui/themed';

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
  if (!element) return null;
  
  return (
    <Dialog
      isVisible={isVisible}
      onBackdropPress={onClose}
      overlayStyle={styles.dayDialog}
    >
      <View style={[styles.dialogDayContainer, { backgroundColor: 'transparent' }]}>
        <View style={[styles.elementCard, { 
          backgroundColor: theme.background,
          borderLeftColor: element.isUrgent ? theme.error : theme.border,
          marginBottom: 0
        }]}>
          <View style={[styles.elementHeader, { padding: spacing.md }]}>
            <View style={styles.elementContent}>
              <View style={[styles.titleRow, { alignItems: 'center' }]}>
                <View style={styles.titleMain}>
                  <Text 
                    style={[
                      styles.elementDetailsTitle,
                      { color: theme.text },
                      element.isUrgent && { color: theme.error }
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
              {t('agenda.due')}: {new Date(element.deadline).toLocaleDateString(language)}
            </Text>
          </ScrollView>

          <View style={[styles.dialogFooterActions, { justifyContent: 'flex-end' }]}>
            <Button
              title={t('calendar.viewAgenda')}
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

const DayElementsDialog = ({ elements, isVisible, onClose, onElementPress, theme, t, colorScheme, language }) => {
  const date = elements[0]?.deadline ? new Date(elements[0].deadline) : new Date();
  const sortedElements = sortElementsByUrgencyAndDeadline(elements);

  return (
    <Dialog
      isVisible={isVisible}
      onBackdropPress={onClose}
      overlayStyle={[styles.dialog, { 
        padding: 0, 
        backgroundColor: 'transparent',
        width: '85%' // Changed from 90% to 85%
      }]}
    >
      <View style={[styles.dialogDayContainer, { backgroundColor: theme.card }]}>
        <Text style={[styles.dayHeader, { color: theme.text }]}>
          {t(`calendar.days.${['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()]}`)}
          {'\n'}
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
                  backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                  opacity: pressed ? 0.7 : 1,
                  borderLeftColor: element.isUrgent ? theme.error : theme.border
                },
                element.isUrgent && {
                  backgroundColor: Colors[colorScheme ?? 'light'].error + '20',
                }
              ]}
            >
              <View style={styles.elementHeader}>
                <View style={styles.elementContent}>
                  <View style={[styles.titleRow, { alignItems: 'center' }]}>
                    <View style={styles.titleMain}>
                      <Text 
                        style={[
                          styles.elementTitle,
                          { color: theme.text },
                          element.isUrgent && { color: Colors[colorScheme ?? 'light'].error }
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

const sortElementsByUrgency = (elements: CalendarElement[]) => {
  return [...elements].sort((a, b) => {
    if (a.isUrgent && !b.isUrgent) return -1;
    if (!a.isUrgent && b.isUrgent) return 1;
    return 0;
  });
};

const sortElementsByUrgencyAndDeadline = (elements: CalendarElement[]) => {
  return [...elements].sort((a, b) => {
    // First sort by urgency
    if (a.isUrgent && !b.isUrgent) return -1;
    if (!a.isUrgent && b.isUrgent) return 1;
    
    // Then sort by deadline
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });
};

export default function CalendarScreen() {
  const weekScrollRef = useRef<ScrollView>(null);
  
  const { t, language } = useLanguage();
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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
    navigation.setOptions({
      title: t('calendar.header'),
      headerBackTitle: t('agenda.header'),
    });

    setCurrentWeek(getWeekDates(currentDate));

    if (encodedElements) {
      try {
        const elements: CalendarElement[] = JSON.parse(decodeURIComponent(encodedElements as string));

        const uniqueSections = Array.from(new Set(elements.map(e => e.sectionId)))
          .filter(Boolean)
          .map(sectionId => ({
            id: sectionId as string,
            name: elements.find(e => e.sectionId === sectionId)?.sectionName || sectionId
          }));
        setSections(uniqueSections);

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
  }, [encodedElements, currentDate]);

  useEffect(() => {
    if (viewType === 'week') {
      setCurrentWeek(getWeekDates(currentDate));
    }
  }, [currentDate, viewType]);

  useEffect(() => {
    if (weekScrollRef.current && viewType === 'week') {
      const scrollOffset = (120 + 4) * 3;
      requestAnimationFrame(() => {
        weekScrollRef.current?.scrollTo({
          x: scrollOffset,
          animated: false
        });
      });
    }
  }, [viewType, currentWeek]);

  useEffect(() => {
    if (viewType === 'week') {
      setCurrentWeek(getWeekDates(currentDate));
      const scrollOffset = (120 + 4) * 3;
      requestAnimationFrame(() => {
        weekScrollRef.current?.scrollTo({
          x: scrollOffset,
          animated: false
        });
      });
    }
  }, [currentDate, viewType]);

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

    for (let i = 0; i < firstDay.getDay(); i++) {
      const prevDate = new Date(firstDay);
      prevDate.setDate(prevDate.getDate() - (firstDay.getDay() - i));
      days.push(prevDate);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(date.getFullYear(), date.getMonth(), i));
    }

    const remainingDays = 42 - days.length;
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
    const filteredElements = sortElementsByUrgency(getFilteredElements(dayElements));
    const isToday = new Date().toDateString() === dateKey;
    const isSelected = dateKey === selectedDate;
    const MAX_VISIBLE_ELEMENTS = 2;

    return (
      <Pressable
        key={dateKey}
        onPress={() => {
          if (filteredElements.length > 0) {
            setSelectedDate(dateKey);
            setSelectedDayElements(filteredElements);
            setShowDayDialog(true);
          }
        }}
        style={({ pressed }) => [
          styles.dayContainer,
          { 
            backgroundColor: theme.card,
            opacity: isSelected ? 0.1 : pressed ? 0.7 : 1
          },
          isToday && { borderColor: theme.tint, borderWidth: 1 }
        ]}
      >
        <Text style={[styles.dayHeader, { color: theme.text }]}>
          {t(`calendar.days.${['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()]}`)}
          {'\n'}
          {date.getDate()}
        </Text>
        <ScrollView style={styles.elementsContainer}>
          {sortElementsByUrgencyAndDeadline(filteredElements).slice(0, MAX_VISIBLE_ELEMENTS).map((element, index) => (
            <Pressable 
              key={`${element.id}-${index}`}
              onPress={() => setSelectedElement(element)}
              style={({ pressed }) => [
                styles.elementCard,
                { 
                  backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                  opacity: pressed ? 0.7 : 1,
                  borderLeftColor: element.isUrgent ? theme.error : theme.border
                },
                element.isUrgent && {
                  backgroundColor: Colors[colorScheme ?? 'light'].error + '20',
                }
              ]}
            >
              <View style={styles.elementHeader}>
                <View style={styles.elementContent}>
                  <View style={[styles.titleRow, { alignItems: 'center' }]}>
                    <View style={styles.titleMain}>
                      <Text 
                        style={[
                          styles.elementTitle,
                          { color: theme.text },
                          element.isUrgent && { color: Colors[colorScheme ?? 'light'].error }
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
          {filteredElements.length > MAX_VISIBLE_ELEMENTS && (
            <View style={[styles.moreContainer, { backgroundColor: theme.tint }]}>
              <Text style={[styles.moreText, { color: colorScheme === 'dark' ? 'black' : 'white' }]}>
                +{filteredElements.length - MAX_VISIBLE_ELEMENTS}
              </Text>
            </View>
          )}
        </ScrollView>
      </Pressable>
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
          ref={weekScrollRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekContainer}
          contentOffset={{ x: (120 + 4) * 3, y: 0 }}
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
        onClose={() => {
          setShowDayDialog(false);
          setSelectedDate(null); // Reset the selected date when closing
        }}
        onElementPress={(element) => {
          setSelectedElement(element);
          setShowDayDialog(false);
          setSelectedDate(null); // Also reset when selecting an element
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
  elementTextContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  elementText: {
    ...typography.caption,
    fontSize: 12,
  },
  dialog: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '85%'  // Changed from 90% to 85%
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
    padding: 0,  // Changed from spacing.md to 0
    maxHeight: '80%',
    backgroundColor: 'transparent',  // Added this
    shadowColor: 'transparent',      // Added this
  },
  dialogDayContainer: {
    width: '100%',
    borderRadius: 12,
    padding: spacing.md,
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dialogElementsContainer: {
    minHeight: 300,     // Changed from 400
    maxHeight: 300,     // Changed from 400
    overflow: 'hidden',
  },
  dayDialogScroll: {
    maxHeight: 300,
  },
  dayDialogElement: {
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
  dayDialogElementText: {
    ...typography.caption,
    fontSize: 12,
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
  moreContainer: {
    alignSelf: 'center',
    marginTop: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  moreText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  elementDialogScroll: {
    maxHeight: 300,
    marginBottom: spacing.md,
  },
  elementCard: {
    marginBottom: spacing.xs,
    borderRadius: 8,
    overflow: 'hidden',
    borderLeftWidth: 3,
    width: '100%',
  },
  elementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
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
  },
  elementTitle: {
    ...typography.h3,
    fontSize: 13,
    marginBottom: 4,
    marginTop: 4,
    margin: 3
  },
  elementDetailsTitle: {
    ...typography.h3,
    fontSize: 20,
    marginBottom: 0,
  },
  dialogDayContainer: {
    width: '100%',
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
    overflow: 'hidden',
  },
  dialogFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
});
