import { useState, useEffect } from "react"
import { StyleSheet, Alert } from "react-native"
import { supabase } from "@/lib/supabase"
import { Button, Input } from "@rneui/themed"
import { View, Text } from "@/components/Themed"
import type { Session } from "@supabase/supabase-js"
import { router } from "expo-router"
import Colors from "@/constants/Colors"
import { typography, spacing } from "@/constants/Typography"
import { useColorScheme } from "@/components/useColorScheme"

export default function ProfileScreen() {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme]
  
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  useEffect(() => {
    async function initialize() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        if (session?.user) {
          await getProfile(session.user.id)
        }
      } catch (error) {
        Alert.alert("Error", "Failed to initialize session")
      } finally {
        setLoading(false)
      }
    }
    initialize()
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      if (session?.user) {
        await getProfile(session.user.id)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  async function getProfile(userId: string) {
    try {
      setLoading(true)
      // First check if profile exists
      const { data, error } = await supabase
        .from("Profile")
        .select("username, avatar_url")
        .eq("id", userId)
        .maybeSingle() // Use maybeSingle instead of single to handle no results

      if (error) throw error
      
      if (data) {
        setUsername(data.username || '')
      } else {
        // Create profile if it doesn't exist
        const { error: createError } = await supabase
          .from("Profile")
          .insert({
            id: userId,
            username: email?.split('@')[0] || 'User',
            avatar_url: null
          })
        if (createError) throw createError
      }
    } catch (error) {
      console.error("Error loading profile:", error)
      Alert.alert("Error", "Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  async function signInWithEmail() {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    setAuthLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      
      // Create profile if it doesn't exist
      if (data.user) {
        const { error: profileError } = await supabase
          .from("Profile")
          .upsert({
            id: data.user.id,
            username: data.user.email?.split('@')[0],
            avatar_url: null,
            updated_at: new Date().toISOString()
          })

        if (profileError) throw profileError
      }
    } catch (error) {
      console.error("Sign in error:", error)
      Alert.alert("Error", "Failed to sign in")
    } finally {
      setAuthLoading(false)
    }
  }

  async function signUpWithEmail() {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    setAuthLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error
      
      if (data.user) {
        // Create initial profile without created_at (it's auto-set by DB)
        const { error: profileError } = await supabase
          .from("Profile")
          .insert({
            id: data.user.id,
            username: data.user.email?.split('@')[0] || 'User',
            avatar_url: null
          })

        if (profileError) throw profileError
        
        Alert.alert("Success", "Please check your email to verify your account")
      }
    } catch (error) {
      console.error("Sign up error:", error)
      Alert.alert("Error", "Failed to sign up")
    } finally {
      setAuthLoading(false)
    }
  }

  async function signOut() {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Clear local state
      setSession(null)
      setUsername('')
      setEmail('')
      router.replace('/three')
    } catch (error) {
      console.error("Sign out error:", error)
      Alert.alert("Error", "Failed to sign out. Please try again.")
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

  if (!session) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.inputContainer}>
          <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.lg }]}>
            {isSignUp ? "Create Account" : "Welcome Back"}
          </Text>
          <Input
            label="Email"
            leftIcon={{ type: "font-awesome", name: "envelope", color: colors.text }}
            onChangeText={setEmail}
            value={email}
            placeholder="email@address.com"
            autoCapitalize="none"
            containerStyle={styles.input}
            inputStyle={{ color: colors.text }}
            placeholderTextColor={colors.placeholder}
          />
          <Input
            label="Password"
            leftIcon={{ type: "font-awesome", name: "lock", color: colors.text }}
            onChangeText={setPassword}
            value={password}
            secureTextEntry={true}
            placeholder="Password"
            autoCapitalize="none"
            containerStyle={styles.input}
            inputStyle={{ color: colors.text }}
            placeholderTextColor={colors.placeholder}
          />
          <Button
            title={isSignUp ? "Sign up" : "Sign in"}
            disabled={authLoading}
            onPress={isSignUp ? signUpWithEmail : signInWithEmail}
            containerStyle={styles.button}
            buttonStyle={{ backgroundColor: colors.button }}
            titleStyle={{ color: colors.buttonText }}
          />
          <Button
            title={isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
            type="clear"
            onPress={() => setIsSignUp(!isSignUp)}
            containerStyle={styles.switchButton}
            titleStyle={{ color: colors.text }}
          />
        </View>
      </View>
    )
  }

  return <Account 
    session={session} 
    signOut={signOut} 
    username={username}
    loading={loading}
  />
}

function Account({ 
  session, 
  signOut,
  username,
  loading 
}: { 
  session: Session
  signOut: () => Promise<void>
  username: string
  loading: boolean
}) {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme]

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.profileContainer}>
        <Text style={[typography.h2, { color: colors.text }]}>
          {loading ? "Loading..." : `Welcome, ${username || session.user.email}`}
        </Text>
        <Button
          title="Settings"
          onPress={() => router.push("/settings")}
          type="outline"
          containerStyle={styles.button}
          buttonStyle={{ borderColor: colors.button }}
          titleStyle={{ color: colors.button }}
        />
        <Button
          title="Sign out"
          onPress={signOut}
          disabled={loading}
          containerStyle={[styles.button, styles.signOutButton]}
          buttonStyle={{ backgroundColor: colors.error }}
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
    justifyContent: "center",
  },
  profileContainer: {
    width: "80%",
    alignItems: "center",
    justifyContent: "center",
  },
  inputContainer: {
    width: "80%",
  },
  input: {
    marginVertical: spacing.xs,
  },
  button: {
    marginVertical: spacing.xs,
    width: "100%",
  },
  signOutButton: {
    marginTop: spacing.lg,
  },
  switchButton: {
    marginTop: spacing.sm,
  },
})
