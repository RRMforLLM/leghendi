import { StyleSheet, ScrollView, Alert, Pressable, Image } from 'react-native';
import { View, Text } from '@/components/Themed';
import { typography, spacing } from '@/constants/Typography';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import RainingIcons from '@/components/RainingIcons';
import { useLanguage } from '@/contexts/LanguageContext';

interface Bundle {
  id: string;
  name: string;
  vibes: number;
  price: number;
  popular?: boolean;
}

const BUNDLES: Bundle[] = [
  { id: 'basic', name: 'store.bundle.starter', vibes: 50, price: 0.99 },
  { id: 'medium', name: 'store.bundle.popular', vibes: 150, price: 2.49, popular: true },
  { id: 'large', name: 'store.bundle.super', vibes: 400, price: 4.99 },
  { id: 'xl', name: 'store.bundle.mega', vibes: 1000, price: 9.99 },
];

export default function StoreScreen() {
  const { t } = useLanguage();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async (bundle: Bundle) => {
    if (purchasing) return;
    setPurchasing(true);

    try {
      Alert.alert(
        t('store.comingSoon'),
        t('store.comingSoonDesc')
      );
      
      // After successful payment, you'd update the user's credits:
      /*
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('User Credit')
        .update({ 
          amount: currentCredits + bundle.vibes 
        })
        .eq('user_id', user.id);

      if (error) throw error;
      */
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert(t('store.error'), t('store.errorPurchase'));
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.animationContainer}>
        <RainingIcons />
      </View>
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {BUNDLES.map((bundle) => (
          <Pressable
            key={bundle.id}
            style={({ pressed }) => [
              styles.bundleCard,
              { 
                backgroundColor: theme.card,
                opacity: pressed ? 0.8 : 1,
                borderColor: bundle.popular ? theme.tint : theme.border
              }
            ]}
            onPress={() => handlePurchase(bundle)}
            disabled={purchasing}
          >
            <View style={[styles.bundleContent, { backgroundColor: 'transparent' }]}>
              <View style={[styles.titleRow, { backgroundColor: 'transparent' }]}>
                <Text style={[typography.h3, { color: theme.text }]}>
                  {t(bundle.name)}
                </Text>
              </View>
              <View style={[styles.vibesRow, { backgroundColor: 'transparent' }]}>
                <Image
                  source={{ uri: 'https://hmrvdkweceanxnuyuorq.supabase.co/storage/v1/object/public/utilities/Vibes-Icon.png' }}
                  style={styles.icon}
                />
                <Text 
                  style={[
                    typography.h2, 
                    { 
                      color: theme.text,
                      includeFontPadding: false,
                      padding: 0,
                      margin: 0,
                    }
                  ]}
                >
                  {bundle.vibes}
                </Text>
              </View>
              <Text style={[typography.body, { color: theme.placeholder }]}>
                ${bundle.price.toFixed(2)}
              </Text>
              {bundle.popular && (
                <View style={[styles.popularBadge, { backgroundColor: theme.tint }]}>
                  <Text style={[typography.caption, { color: theme.background }]}>
                    {t('store.bestValue')}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  animationContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    zIndex: 2,
  },
  content: {
    flex: 1,
    zIndex: 2,
  },
  bundleCard: {
    borderRadius: 12,
    marginBottom: spacing.md,
    borderWidth: 2,
    overflow: 'hidden',
  },
  bundleContent: {
    padding: spacing.lg,
  },
  vibesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginVertical: spacing.sm,
    backgroundColor: 'transparent',
  },
  popularBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: spacing.xs,
    backgroundColor: 'transparent',
  },
  icon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    transform: [{ translateY: 4 }],
  },
});
