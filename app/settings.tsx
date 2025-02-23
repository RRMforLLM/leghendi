import { useState, useEffect } from "react"
import { StyleSheet, Alert, ScrollView, Pressable } from "react-native"
import { View, Text } from "@/components/Themed"
import { Button, Input } from "@rneui/themed"
import { supabase } from "@/lib/supabase"
import Colors from "@/constants/Colors"
import { typography, spacing } from "@/constants/Typography"
import { useColorScheme } from "@/components/useColorScheme"
import { router } from "expo-router"
import { useNetworkState } from '@/hooks/useNetworkState';
import OfflineBanner from '@/components/OfflineBanner';
import { useLanguage } from '@/contexts/LanguageContext';
import { SUPPORTED_LANGUAGES, Language } from '@/constants/Translations';

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [description, setDescription] = useState("")
  const [statistics, setStatistics] = useState({
    totalReactionsReceived: 0,
    totalReactionsSent: 0,
    totalComments: 0,
    accountCreated: '',
    lastActive: '',
    credits: 0
  })
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme]
  const isOnline = useNetworkState();
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error

        // Fetch profile and additional statistics
        const [profileData, reactionsReceived, reactionsSent, commentsData, creditsData] = 
          await Promise.all([
            supabase
              .from("Profile")
              .select("*")
              .eq("id", user?.id)
              .single(),
            supabase
              .from("Reaction")
              .select("*", { count: 'exact' })
              .eq("recipient_id", user?.id),
            supabase
              .from("Reaction")
              .select("*", { count: 'exact' })
              .eq("sender_id", user?.id),
            supabase
              .from("Profile Comment")
              .select("*", { count: 'exact' })
              .eq("author_id", user?.id),
            supabase
              .from("User Credit")
              .select("amount")
              .eq("user_id", user?.id)
              .single()
          ])

        if (profileData.data) {
          setUsername(profileData.data.username)
          setDescription(profileData.data.description || '')
          setEmail(user.email || '')
          setStatistics({
            totalReactionsReceived: reactionsReceived.count || 0,
            totalReactionsSent: reactionsSent.count || 0,
            totalComments: commentsData.count || 0,
            accountCreated: new Date(user.created_at).toLocaleDateString(language),
            lastActive: new Date(profileData.data.updated_at).toLocaleDateString(language),
            credits: creditsData.data?.amount || 0
          })
        }
      } catch (error) {
        Alert.alert("Error loading profile", error.message)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [language])

  const updateProfile = async () => {
    try {
      setLoading(true)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      const updates = {
        id: user.id,
        username,
        description,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("Profile")
        .upsert(updates)

      if (error) throw error
      Alert.alert(t('settings.success'), t('settings.successMessage'))
    } catch (error) {
      Alert.alert(t('settings.error'), t('settings.errorProfile'))
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      // The root layout will handle the navigation and reload
    } catch (error) {
      Alert.alert(t('settings.error'), t('settings.errorSignOut'))
    }
  }

  const deleteAccount = async () => {
    try {
      setLoading(true)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      Alert.alert(
        t('settings.deleteConfirmTitle'),
        t('settings.deleteConfirmMessage'),
        [
          {
            text: t('settings.cancel'),
            style: "cancel"
          },
          {
            text: t('settings.delete'),
            style: "destructive",
            onPress: async () => {
              try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession()
                if (sessionError) throw sessionError

                // Use supabase functions directly instead of raw fetch
                const { data, error: functionError } = await supabase.functions.invoke('delete-account', {
                  method: 'POST',
                })

                if (functionError) {
                  throw functionError
                }

                // Sign out and redirect
                await supabase.auth.signOut()
                router.replace('/')
              } catch (error) {
                console.error('Delete account error:', error)
                Alert.alert(t('settings.error'), t('settings.errorDelete'))
              }
            }
          }
        ]
      )
    } catch (error) {
      console.error('Delete account error:', error)
      Alert.alert(t('settings.error'), t('settings.errorDelete'))
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[typography.body, { color: colors.text }]}>Loading...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {!isOnline && <OfflineBanner />}
        <View style={styles.content}>
          <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.lg }]}>
            {t('settings.title')}
          </Text>
          
          {/* Language Section */}
          <View style={styles.section}>
            <Text style={[typography.h3, { color: colors.text }]}>{t('settings.language')}</Text>
            {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
              <Pressable
                key={code}
                style={[
                  styles.languageOption,
                  language === code && { backgroundColor: colors.tint + '20' }
                ]}
                onPress={() => setLanguage(code as Language)}
              >
                <Text style={[typography.body, { color: colors.text }]}>{name}</Text>
                {language === code && (
                  <Text style={[typography.body, { color: colors.tint }]}>✓</Text>
                )}
              </Pressable>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={[typography.h3, { color: colors.text }]}>{t('settings.profile')}</Text>
            <Input
              label={t('settings.email')}
              value={email}
              disabled
              containerStyle={styles.input}
              inputStyle={{ color: colors.text }}
              labelStyle={{ color: colors.text }}
              disabledInputStyle={{ opacity: 0.7 }}
            />
            <Input
              label={t('settings.username')}
              value={username}
              onChangeText={setUsername}
              containerStyle={styles.input}
              inputStyle={{ color: colors.text }}
              labelStyle={{ color: colors.text }}
            />
            <Input
              label={t('settings.description')}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              containerStyle={styles.input}
              inputStyle={{ color: colors.text }}
              labelStyle={{ color: colors.text }}
            />
          </View>

          <View style={styles.section}>
            <Text style={[typography.h3, { color: colors.text }]}>{t('settings.statistics')}</Text>
            <View style={styles.statRow}>
              <Text style={[typography.body, { color: colors.text }]}>{t('settings.accountCreated')}</Text>
              <Text style={[typography.body, { color: colors.text }]}>{statistics.accountCreated}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[typography.body, { color: colors.text }]}>{t('settings.lastActive')}</Text>
              <Text style={[typography.body, { color: colors.text }]}>{statistics.lastActive}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[typography.body, { color: colors.text }]}>{t('settings.totalReactionsReceived')}</Text>
              <Text style={[typography.body, { color: colors.text }]}>{statistics.totalReactionsReceived}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[typography.body, { color: colors.text }]}>{t('settings.totalReactionsSent')}</Text>
              <Text style={[typography.body, { color: colors.text }]}>{statistics.totalReactionsSent}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[typography.body, { color: colors.text }]}>{t('settings.totalComments')}</Text>
              <Text style={[typography.body, { color: colors.text }]}>{statistics.totalComments}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[typography.body, { color: colors.text }]}>{t('settings.creditsAvailable')}</Text>
              <Text style={[typography.body, { color: colors.text }]}>{statistics.credits}</Text>
            </View>
          </View>
          
          <Button
            title={t('settings.save')}
            onPress={updateProfile}
            disabled={loading}
            containerStyle={styles.button}
            buttonStyle={{ backgroundColor: colors.button }}
            titleStyle={{ color: colors.buttonText }}
          />

          <View style={styles.divider} />

          <Button
            title={t('settings.signOut')}
            onPress={handleSignOut}
            containerStyle={[styles.button, styles.signOutButton]}
            buttonStyle={{ backgroundColor: colors.error }}
            titleStyle={{ color: colors.buttonText }}
          />
        </View>

        <View style={styles.dangerZone}>
          <Text style={[typography.h3, { color: colors.error, marginBottom: spacing.md }]}>
            {t('settings.dangerZone')}
          </Text>
          <Button
            title={t('settings.deleteAccount')}
            onPress={deleteAccount}
            containerStyle={[styles.button, styles.deleteButton]}
            buttonStyle={{ backgroundColor: colors.error }}
            titleStyle={{ color: colors.buttonText }}
          />
          <Text style={[typography.caption, { color: colors.placeholder, marginTop: spacing.xs }]}>
            {t('settings.dangerZoneWarning')}
          </Text>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  content: {
    width: '100%',
  },
  input: {
    marginVertical: spacing.xs,
  },
  button: {
    marginVertical: spacing.xs,
    width: '100%',
  },
  signOutButton: {
    marginTop: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: spacing.xl,
    opacity: 0.2,
  },
  section: {
    marginBottom: spacing.xl,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  dangerZone: {
    marginTop: spacing.xl * 2,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#ff0000',
    borderRadius: 8,
    opacity: 0.8,
  },
  deleteButton: {
    marginBottom: spacing.xs,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginVertical: spacing.xs,
  },
})
