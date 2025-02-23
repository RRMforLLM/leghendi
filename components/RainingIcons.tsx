import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, View, Easing } from 'react-native';
import { Icon } from '@rneui/themed';

const ICONS = [
  { name: 'like1', type: 'ant-design', color: '#1877F2' },
  { name: 'heart', type: 'font-awesome', color: '#FF3B30' },
  { name: 'kiss-wink-heart', type: 'font-awesome-5', color: '#FF2D55' },
];

interface RainingIcon {
  id: number;
  x: number;
  y: number;
  icon: typeof ICONS[number];
  finalY: number;
}

export default function RainingIcons() {
  const [icons, setIcons] = useState<RainingIcon[]>([]);
  const animationsRef = useRef<{ [key: number]: Animated.Value }>({});
  const { width, height } = Dimensions.get('window');
  const [frozen, setFrozen] = useState(false);

  useEffect(() => {
    const initialIcons = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * width,
      y: -50 - (Math.random() * 200), // Start at different heights above screen
      icon: ICONS[Math.floor(Math.random() * ICONS.length)],
      finalY: 100 + (Math.random() * (height - 200)) // Final position spread across screen
    }));

    setIcons(initialIcons);

    initialIcons.forEach(icon => {
      animationsRef.current[icon.id] = new Animated.Value(icon.y);
    });

    // Modified animation sequence with correct easing
    const fallAnimation = Animated.stagger(200, // Increased stagger delay
      initialIcons.map(icon => 
        Animated.timing(animationsRef.current[icon.id], {
          toValue: icon.finalY,
          duration: 3000, // Longer duration
          useNativeDriver: true,
          easing: (t) => {
            // Custom easing function that starts normal and slows down at the end
            const slowdownPoint = 0.7; // Start slowing down at 70% of the animation
            if (t < slowdownPoint) {
              // Linear motion for the first 70%
              return t / slowdownPoint;
            } else {
              // Ease out cubic for the last 30%
              const remaining = (t - slowdownPoint) / (1 - slowdownPoint);
              return slowdownPoint + (1 - Math.pow(1 - remaining, 3)) * (1 - slowdownPoint);
            }
          }
        })
      )
    );

    fallAnimation.start(() => {
      setFrozen(true);
    });

    // Increased interval for less frequent restarts
    const interval = setInterval(() => {
      if (frozen) {
        setFrozen(false);
        initialIcons.forEach(icon => {
          animationsRef.current[icon.id].setValue(icon.y);
        });
        fallAnimation.start(() => {
          setFrozen(true);
        });
      }
    }, 45000); // 45 seconds between animations

    return () => {
      clearInterval(interval);
      Object.values(animationsRef.current).forEach(anim => {
        anim.stopAnimation();
      });
    };
  }, [width, height]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {icons.map(icon => (
        <Animated.View
          key={icon.id}
          style={[
            styles.icon,
            {
              transform: [{ translateY: animationsRef.current[icon.id] || 0 }],
              left: icon.x,
            },
          ]}
        >
          <Icon
            name={icon.icon.name}
            type={icon.icon.type}
            color={icon.icon.color}
            size={50}
            style={{ opacity: 0.5 }}
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
