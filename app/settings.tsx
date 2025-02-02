import { useState, useEffect } from "react"
import { StyleSheet, Alert } from "react-native"
import { View, Text } from "@/components/Themed"
import { Button, Input } from "@rneui/themed"
import { supabase } from "@/lib/supabase"
import Colors from "@/constants/Colors"
import { typography, spacing } from "@/constants/Typography"
import { useColorScheme } from "@/components/useColorScheme"

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme]

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error

        const { data: profile, error: profileError } = await supabase
          .from("Profile")
          .select("*")
          .eq("id", user?.id)
          .single()

        if (profileError) throw profileError
        if (profile) {
          setUsername(profile.username)
          setEmail(user.email || '')
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
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("profiles")  // Correct table name from schema
        .upsert(updates)

      if (error) throw error
      Alert.alert("Profile updated successfully!")
    } catch (error) {
      Alert.alert("Error updating profile", error.message)
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[typography.h1, { color: colors.text }]}>Account Settings</Text>
      <View style={styles.inputContainer}>
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
        <Button
          title="Update Settings"
          onPress={updateProfile}
          disabled={loading}
          containerStyle={styles.button}
          buttonStyle={{ backgroundColor: colors.button }}
          titleStyle={{ color: colors.buttonText }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: spacing.lg,
  },
  inputContainer: {
    width: "80%",
  },
  input: {
    marginVertical: spacing.xs,
  },
  button: {
    marginVertical: spacing.sm,
  },
})
