import { Platform, Pressable } from 'react-native';
import { Input } from '@rneui/themed';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface DatePickerInputProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  inputStyle?: any;
}

export default function DatePickerInput({ value, onChange, placeholder, inputStyle }: DatePickerInputProps) {
  const [show, setShow] = useState(false);
  const { language } = useLanguage();
  
  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShow(Platform.OS === 'ios');
    if (event.type === 'set' && selectedDate) {
      onChange(selectedDate.toISOString().split('T')[0]);
    }
  };

  return (
    <>
      <Pressable onPress={() => setShow(true)}>
        <Input
          value={value ? new Date(value).toLocaleDateString(language) : ''}
          placeholder={placeholder}
          editable={false}
          inputStyle={inputStyle}
          pointerEvents="none"
        />
      </Pressable>
      
      {show && (
        <DateTimePicker
          value={value ? new Date(value) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}
    </>
  );
}
