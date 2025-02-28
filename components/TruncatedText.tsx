import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from './Themed';
import { typography, spacing } from '@/constants/Typography';
import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';

const TRUNCATE_AT = 50;

interface TruncatedTextProps {
  text: string;
  textStyle?: object;
}

export default function TruncatedText({ text, textStyle = {} }: TruncatedTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { t } = useLanguage();

  if (text.length <= TRUNCATE_AT) {
    return <Text style={[typography.body, { color: theme.text }, textStyle]}>{text}</Text>;
  }

  return (
    <>
      <Text style={[typography.body, { color: theme.text }, textStyle]}>
        {isExpanded ? text : `${text.slice(0, TRUNCATE_AT)}...`}
      </Text>
      <Pressable 
        onPress={() => setIsExpanded(!isExpanded)}
        style={styles.button}
      >
        <Text style={[typography.caption, { color: theme.tint }]}>
          {isExpanded ? t('comments.showLess') : t('comments.readMore')}
        </Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: spacing.xs,
  }
});
