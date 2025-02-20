import { View, Text, StyleSheet, Animated } from 'react-native';
import { useState, useEffect } from 'react';
import { spacing } from '@/constants/Typography';
import Colors from '@/constants/Colors';

export default function OfflineBanner() {
  const [slideAnim] = useState(new Animated.Value(-50));

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start();
  }, []);

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <Text style={styles.text}>You're offline</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.error,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
