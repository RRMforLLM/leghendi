import { useState, useEffect } from "react"
import { StyleSheet, Alert, ScrollView } from "react-native"
import { View, Text } from "@/components/Themed"
import { Button, Input } from "@rneui/themed"
import { supabase } from "@/lib/supabase"
import Colors from "@/constants/Colors"
import { typography, spacing } from "@/constants/Typography"
import { useColorScheme } from "@/components/useColorScheme"
import { router } from "expo-router"
import { useNetworkState } from '@/hooks/useNetworkState';
import OfflineBanner from '@/components/OfflineBanner';

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
            accountCreated: new Date(user.created_at).toLocaleDateString(),
            lastActive: new Date(profileData.data.updated_at).toLocaleDateString(),
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
  }, [])

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
      Alert.alert("Success", "Profile updated successfully!")
    } catch (error) {
      Alert.alert("Error", "Failed to update profile")
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
      Alert.alert("Error", "Failed to sign out")
    }
  }

  const deleteAccount = async () => {
    try {
      setLoading(true)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      Alert.alert(
        "Delete Account",
        "This will permanently delete your account and all associated data. This action cannot be undone. Are you sure?",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Delete",
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
                Alert.alert('Error', 'Failed to delete account')
              }
            }
          }
        ]
      )
    } catch (error) {
      console.error('Delete account error:', error)
      Alert.alert('Error', 'Failed to delete account')
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
            Account Settings
          </Text>
          
          <View style={styles.section}>
            <Text style={[typography.h3, { color: colors.text }]}>Profile Information</Text>
            <Input
              label="Email"
              value={email}
              disabled
              containerStyle={styles.input}
              inputStyle={{ color: colors.text }}
              labelStyle={{ color: colors.text }}
              disabledInputStyle={{ opacity: 0.7 }}
            />
            <Input
              label="Username"
              value={username}
              onChangeText={setUsername}
              containerStyle={styles.input}
              inputStyle={{ color: colors.text }}
              labelStyle={{ color: colors.text }}
            />
            <Input
              label="Description"
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
            <Text style={[typography.h3, { color: colors.text }]}>Statistics</Text>
            <View style={styles.statRow}>
              <Text style={[typography.body, { color: colors.text }]}>Account Created</Text>
              <Text style={[typography.body, { color: colors.text }]}>{statistics.accountCreated}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[typography.body, { color: colors.text }]}>Last Active</Text>
              <Text style={[typography.body, { color: colors.text }]}>{statistics.lastActive}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[typography.body, { color: colors.text }]}>Total Reactions Received</Text>
              <Text style={[typography.body, { color: colors.text }]}>{statistics.totalReactionsReceived}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[typography.body, { color: colors.text }]}>Total Reactions Sent</Text>
              <Text style={[typography.body, { color: colors.text }]}>{statistics.totalReactionsSent}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[typography.body, { color: colors.text }]}>Total Comments</Text>
              <Text style={[typography.body, { color: colors.text }]}>{statistics.totalComments}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[typography.body, { color: colors.text }]}>Credits Available</Text>
              <Text style={[typography.body, { color: colors.text }]}>{statistics.credits}</Text>
            </View>
          </View>
          
          <Button
            title="Save Changes"
            onPress={updateProfile}
            disabled={loading}
            containerStyle={styles.button}
            buttonStyle={{ backgroundColor: colors.button }}
            titleStyle={{ color: colors.buttonText }}
          />

          <View style={styles.divider} />

          <Button
            title="Sign Out"
            onPress={handleSignOut}
            containerStyle={[styles.button, styles.signOutButton]}
            buttonStyle={{ backgroundColor: colors.error }}
            titleStyle={{ color: colors.buttonText }}
          />
        </View>

        <View style={styles.dangerZone}>
          <Text style={[typography.h3, { color: colors.error, marginBottom: spacing.md }]}>
            Danger Zone
          </Text>
          <Button
            title="Delete Account"
            onPress={deleteAccount}
            containerStyle={[styles.button, styles.deleteButton]}
            buttonStyle={{ backgroundColor: colors.error }}
            titleStyle={{ color: colors.buttonText }}
          />
          <Text style={[typography.caption, { color: colors.placeholder, marginTop: spacing.xs }]}>
            This action cannot be undone. All your data will be permanently deleted.
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
})
