import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { Icon } from '@rneui/themed';

interface Props {
  type: 'hug' | 'heart' | 'kiss';
  onAnimationComplete?: () => void;
}

const ICON_CONFIG = {
  hug: { name: 'like1', type: 'ant-design', color: '#1877F2' },
  heart: { name: 'heart', type: 'font-awesome', color: '#FF3B30' },
  kiss: { name: 'kiss-wink-heart', type: 'font-awesome-5', color: '#FF2D55' }
} as const;

export default function ReactionRain({ type, onAnimationComplete }: Props) {
  const { width, height } = Dimensions.get('window');
  const [animatedIcons, setAnimatedIcons] = useState<Array<{
    id: number;
    x: number;
    anim: Animated.Value;
  }>>([]);

  useEffect(() => {
    const numIcons = 12;
    const newAnimatedIcons = Array(numIcons).fill(0).map((_, index) => ({
      id: index,
      x: Math.random() * width,
      anim: new Animated.Value(-100)
    }));

    setAnimatedIcons(newAnimatedIcons);

    const animations = newAnimatedIcons.map(icon => 
      Animated.timing(icon.anim, {
        toValue: height + 100,
        duration: 2000 + Math.random() * 1000,
        useNativeDriver: true,
        delay: Math.random() * 500,
      })
    );

    // Start animations immediately after setting state
    requestAnimationFrame(() => {
      Animated.parallel(animations).start(() => {
        onAnimationComplete?.();
      });
    });

    return () => {
      newAnimatedIcons.forEach(icon => icon.anim.stopAnimation());
    };
  }, [width, height]);

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]} pointerEvents="none">
      {animatedIcons.map(icon => (
        <Animated.View
          key={icon.id}
          style={[
            styles.icon,
            {
              transform: [{ translateY: icon.anim }],
              left: icon.x,
            },
          ]}
        >
          <Icon
            name={ICON_CONFIG[type].name}
            type={ICON_CONFIG[type].type}
            color={ICON_CONFIG[type].color}
            size={30}
            style={{ opacity: 0.8 }}
          />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    position: 'absolute',
  },
});
