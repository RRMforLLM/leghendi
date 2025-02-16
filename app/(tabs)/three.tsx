import { useState, useEffect } from "react"
import { StyleSheet, Alert, View as RNView, FlatList, ScrollView } from "react-native"
import { supabase } from "@/lib/supabase"
import { Button, Input, Avatar, Icon } from "@rneui/themed"
import { View, Text } from "@/components/Themed"
import type { Session } from "@supabase/supabase-js"
import { router } from "expo-router"
import Colors from "@/constants/Colors"
import { typography, spacing } from "@/constants/Typography"
import { useColorScheme } from "@/components/useColorScheme"
import * as ImagePicker from 'expo-image-picker'
import { decode } from 'base64-arraybuffer'
import { getRelativeTime } from '@/utils/dateUtils';

const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/avataaars/svg" // Default avatar URL

interface ProfileComment {
  id: number
  text: string
  created_at: string
  author: {
    username: string
    avatar_url: string | null
  }
}

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [reactionStats, setReactionStats] = useState({
    hugs: 0,
    hearts: 0,
    kisses: 0
  })
  const [description, setDescription] = useState("")
  const [comments, setComments] = useState<ProfileComment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isPostingComment, setIsPostingComment] = useState(false)
  const [commentText, setCommentText] = useState("")  // Add this state here

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
      const [profileData, reactionCounts, commentsData] = await Promise.all([
        supabase
          .from("Profile")
          .select("username, avatar_url, description")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("Reaction")
          .select('type', { count: 'exact' })
          .eq('recipient_id', userId)
          .in('type', ['hug', 'heart', 'kiss']),
        supabase
          .from('Profile Comment')
          .select(`
            id,
            text,
            created_at,
            author:Profile!author_id(username, avatar_url)
          `)
          .eq('profile_id', userId)
          .order('created_at', { ascending: false })
      ])
      
      if (!commentsData.error) {
        setComments(commentsData.data || [])
      }

      if (profileData.error) throw profileData.error
      
      if (!profileData.data) {
        // Get email from session and extract username
        const emailUsername = session?.user?.email?.split('@')[0] || 'user'
        
        // Create profile with username
        const { error: createError } = await supabase
          .from("Profile")
          .insert({ 
            id: userId,
            username: emailUsername  // Set the username explicitly
          })
          .select()
          .single()

        if (createError) throw createError
        
        // Fetch the profile again to get DB-generated values
        const { data: newProfile, error: refetchError } = await supabase
          .from("Profile")
          .select("username, avatar_url, description")
          .eq("id", userId)
          .single()
          
        if (refetchError) throw refetchError
        
        if (newProfile) {
          setUsername(newProfile.username || '')
          setAvatarUrl(newProfile.avatar_url)
          setDescription(newProfile.description || '')
        }
      } else {
        setUsername(profileData.data.username || '')
        setAvatarUrl(profileData.data.avatar_url)
        setDescription(profileData.data.description || '')
      }

      // Calculate reaction counts
      if (!reactionCounts.error) {
        const stats = {
          hugs: 0,
          hearts: 0,
          kisses: 0
        }
        reactionCounts.data.forEach((reaction: { type: string }) => {
          switch (reaction.type) {
            case 'hug': stats.hugs++; break
            case 'heart': stats.hearts++; break
            case 'kiss': stats.kisses++; break
          }
        })
        setReactionStats(stats)
      }

      if (!commentsData.error) {
        setComments(commentsData.data || [])
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Properly throw the error so it can be caught
        throw error
      }
      // Success case - no need to do anything else as the auth state change will trigger
    } catch (error) {
      // Proper error handling
      const message = error?.message || 'An error occurred during sign in'
      console.error("Sign in error:", message)
      Alert.alert("Error", message)
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
        options: {
          emailRedirectTo: null, // Disable email confirmation
          data: {
            email_confirmed: true // Mark as confirmed immediately
          }
        }
      })

      if (error) throw error
      
      // User should be logged in immediately now
      if (!data.session) {
        throw new Error("Failed to create session")
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

  const updateProfileUsername = async (newUsername: string) => {
    if (!session?.user?.id) return
    try {
      const { error } = await supabase
        .from('Profile')
        .update({ username: newUsername.trim() })
        .eq('id', session.user.id)

      if (error) throw error
      setUsername(newUsername.trim())
    } catch (error) {
      console.error('Update username error:', error)
      Alert.alert('Error', 'Failed to update username')
    }
  }

  const updateProfileAvatar = async (avatarBase64: string) => {
    if (!session?.user?.id) return
    try {
      const fileName = `${session.user.id}-${Date.now()}.jpg`
      
      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, decode(avatarBase64), {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('Profile')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id)

      if (updateError) throw updateError
      
      setAvatarUrl(publicUrl)
    } catch (error) {
      console.error('Update avatar error:', error)
      Alert.alert('Error', 'Failed to update avatar')
    }
  }

  const updateProfileDescription = async (newDescription: string) => {
    if (!session?.user?.id) return
    try {
      const { error } = await supabase
        .from('Profile')
        .update({ description: newDescription.trim() })
        .eq('id', session.user.id)

      if (error) throw error
      setDescription(newDescription.trim())
    } catch (error) {
      console.error('Update description error:', error)
      Alert.alert('Error', 'Failed to update description')
    }
  }

  // In the ProfileScreen component:

  const postComment = async (profileId: string, text: string) => {
    if (!session?.user?.id || !text.trim()) return
    
    try {
      setIsPostingComment(true)
      const { error } = await supabase
        .from('Profile Comment')
        .insert({
          text: text.trim(),
          author_id: session.user.id,
          profile_id: profileId  // This is correct now
        })

      if (error) throw error
      
      // Refresh comments for the current profile
      await getProfile(profileId)
      setCommentText("")  // Now this will work
    } catch (error) {
      console.error('Post comment error:', error)
      Alert.alert('Error', 'Failed to post comment')
    } finally {
      setIsPostingComment(false)
    }
  }

  // Add this function to update reaction stats
  const updateReactionStats = async () => {
    if (!session?.user?.id) return;
    
    try {
      const { data: reactionData } = await supabase
        .from("Reaction")
        .select('type')
        .eq('recipient_id', session.user.id);

      if (reactionData) {
        const newStats = {
          hugs: 0,
          hearts: 0,
          kisses: 0
        };
        
        reactionData.forEach((reaction: { type: string }) => {
          const type = reaction.type.toLowerCase().trim();
          switch (type) {
            case 'hug': newStats.hugs++; break;
            case 'heart': newStats.hearts++; break;
            case 'kiss': newStats.kisses++; break;
          }
        });

        setReactionStats(newStats);
      }
    } catch (error) {
      console.error('Error fetching reactions:', error);
    }
  };

  // Move fetchComments here
  const fetchComments = async () => {
    if (!session?.user?.id) return;
    
    try {
      const { data: commentsData, error } = await supabase
        .from('Profile Comment')
        .select(`
          id,
          text,
          created_at,
          author:Profile!author_id(username, avatar_url)
        `)
        .eq('profile_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!error && commentsData) {
        setComments(commentsData);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

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
    avatarUrl={avatarUrl}
    reactionStats={reactionStats}
    description={description}
    onUpdateUsername={updateProfileUsername}
    onUpdateAvatar={updateProfileAvatar}
    onUpdateDescription={updateProfileDescription}
    comments={comments}
    onPostComment={postComment}
    isPostingComment={isPostingComment}
    commentText={commentText}  // Add these props
    setCommentText={setCommentText}
    updateReactionStats={updateReactionStats}
    fetchComments={fetchComments}  // Add this prop
  />
}

function Account({ 
  session, 
  signOut,
  username,
  loading,
  avatarUrl,
  reactionStats,
  description,
  onUpdateUsername,
  onUpdateAvatar,
  onUpdateDescription,
  comments,
  onPostComment,
  isPostingComment,
  commentText,
  setCommentText,
  updateReactionStats,
  fetchComments,  // Add this to props
}: { 
  session: Session
  signOut: () => Promise<void>
  username: string
  loading: boolean
  avatarUrl: string | null
  reactionStats: { hugs: number; hearts: number; kisses: number }
  description: string
  onUpdateUsername: (newUsername: string) => Promise<void>
  onUpdateAvatar: (base64: string) => Promise<void>
  onUpdateDescription: (description: string) => Promise<void>
  comments: ProfileComment[]
  onPostComment: (userId: string, text: string) => Promise<void>
  isPostingComment: boolean
  commentText: string
  setCommentText: (text: string) => void
  updateReactionStats: () => Promise<void>;
  fetchComments: () => Promise<void>;  // Add this type
}) {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme]
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState(username)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [newDescription, setNewDescription] = useState(description)

  const updateUsername = async () => {
    if (!session?.user?.id || !newUsername.trim()) return
    
    try {
      await onUpdateUsername(newUsername)
      setIsEditingUsername(false)
    } catch (error) {
      // Error is handled by parent component
    }
  }

  const updateDescription = async () => {
    if (!session?.user?.id) return
    try {
      await onUpdateDescription(newDescription)
      setIsEditingDescription(false)
    } catch (error) {
      // Error handled by parent
    }
  }

  const handleAvatarPress = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,  // Fixed: Use the enum instead of string array
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      })

      if (!result.canceled && result.assets[0].base64) {
        await onUpdateAvatar(result.assets[0].base64)
      }
    } catch (error) {
      console.error('Image picker error:', error)
      Alert.alert('Error', 'Failed to pick image')
    }
  }

  const renderComment = ({ item }: { item: ProfileComment }) => (
    <RNView style={[styles.commentContainer, { backgroundColor: colors.card }]}>
      <RNView style={styles.commentHeader}>
        <RNView style={styles.commentAuthor}>
          <Avatar
            size={24}
            rounded
            source={{ uri: item.author.avatar_url || DEFAULT_AVATAR }}
            containerStyle={styles.commentAvatar}
          />
          <Text style={[typography.caption, { color: colors.text }]}>
            {item.author.username}
          </Text>
        </RNView>
        <Text style={[typography.caption, { color: colors.placeholder }]}>
          {getRelativeTime(item.created_at)}
        </Text>
      </RNView>
      <Text style={[typography.body, { color: colors.text }]}>
        {item.text}
      </Text>
    </RNView>
  )

  // Add polling effect
  useEffect(() => {
    if (!session?.user?.id) return;

    // Poll every 5 seconds
    const pollInterval = setInterval(updateReactionStats, 5000);

    // Initial fetch
    updateReactionStats();

    // Cleanup interval on unmount
    return () => clearInterval(pollInterval);
  }, [session?.user?.id]);

  // Update the polling effect to include comments
  useEffect(() => {
    if (!session?.user?.id) return;

    // Poll every 5 seconds for both reactions and comments
    const pollInterval = setInterval(() => {
      updateReactionStats();
      fetchComments();
    }, 5000);

    // Initial fetch
    updateReactionStats();
    fetchComments();

    // Cleanup interval on unmount
    return () => clearInterval(pollInterval);
  }, [session?.user?.id]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RNView style={styles.headerContainer}>
        <RNView style={styles.settingsIconWrapper}>
          <Icon
            name="cog"
            type="font-awesome-5"
            color={colors.text}
            size={24}
            onPress={() => router.push("/settings")}
          />
        </RNView>
      </RNView>
      
      <ScrollView 
        showsconst renderVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.profileContainer}>
          <Avatar
            size={100}
            rounded
            source={{ uri: avatarUrl || DEFAULT_AVATAR }}
            containerStyle={[styles.avatar, styles.avatarContainer]}
            onPress={handleAvatarPress}
          />
          
          <View style={styles.usernameContainer}>
            {isEditingUsername ? (
              <RNView style={styles.usernameEditContainer}>
                <Input
                  value={newUsername}
                  onChangeText={setNewUsername}
                  containerStyle={styles.usernameInput}
                  inputStyle={{ color: colors.text }}
                  autoFocus
                  onSubmitEditing={updateUsername}
                  rightIcon={
                    <Icon
                      name="check"
                      type="font-awesome"
                      color={colors.text}
                      size={20}
                      onPress={updateUsername}
                    />
                  }
                />
              </RNView>
            ) : (
              <RNView style={styles.usernameRow}>
                <Text style={[typography.h2, { color: colors.text }]}>
                  {loading ? "Loading..." : username || session.user.email}
                </Text>
                <Icon
                  name="edit"
                  type="font-awesome"
                  color={colors.text}
                  size={20}
                  onPress={() => setIsEditingUsername(true)}
                  containerStyle={styles.editIcon}
                />
              </RNView>
            )}
          </View>

          <View style={styles.descriptionContainer}>
            {isEditingDescription ? (
              <RNView style={styles.descriptionEditContainer}>
                <Input
                  value={newDescription}
                  onChangeText={setNewDescription}
                  placeholder="Add a description..."
                  multiline
                  numberOfLines={3}
                  containerStyle={styles.descriptionInput}
                  inputStyle={{ color: colors.text }}
                  autoFocus
                  onSubmitEditing={updateDescription}
                  rightIcon={
                    <Icon
                      name="check"
                      type="font-awesome"
                      color={colors.text}
                      size={20}
                      onPress={updateDescription}
                    />
                  }
                />
              </RNView>
            ) : (
              <RNView style={styles.descriptionRow}>
                <Text style={[typography.body, { color: colors.text }]}>
                  {description || "No description"}
                </Text>
                <Icon
                  name="edit"
                  type="font-awesome"
                  color={colors.text}
                  size={16}
                  onPress={() => setIsEditingDescription(true)}
                  containerStyle={styles.editIcon}
                />
              </RNView>
            )}
          </View>

          <RNView style={styles.reactionStats}>
            <RNView style={styles.reactionItem}>
              <Icon 
                name="like1" 
                type="ant-design" 
                color="#1877F2" // Facebook blue
                size={30}
                style={styles.iconStyle}
              />
              <Text style={[typography.body, { color: colors.text }]}>{reactionStats.hugs}</Text>
            </RNView>
            <RNView style={styles.reactionItem}>
              <Icon 
                name="heart" 
                type="font-awesome" 
                color="#FF3B30" // iOS red
                size={30}
                style={styles.iconStyle}
              />
              <Text style={[typography.body, { color: colors.text }]}>{reactionStats.hearts}</Text>
            </RNView>
            <RNView style={styles.reactionItem}>
              <Icon 
                name="kiss-wink-heart" 
                type="font-awesome-5" 
                color="#FF2D55" // Vibrant pink
                size={30}
                style={styles.iconStyle}
              />
              <Text style={[typography.body, { color: colors.text }]}>{reactionStats.kisses}</Text>
            </RNView>
          </RNView>

          <View style={styles.commentsSection}>
            <Text style={[typography.h3, { color: colors.text }]}>Comments</Text>
            
            <RNView style={styles.commentInputContainer}>
              <Input
                placeholder="Add a comment..."
                value={commentText}
                onChangeText={setCommentText}
                multiline
                containerStyle={styles.commentInput}
                inputStyle={{ color: colors.text }}
                rightIcon={
                  <Icon
                    name="send"
                    type="font-awesome"
                    color={commentText.trim() ? colors.text : colors.placeholder}
                    size={20}
                    onPress={() => {
                      if (session?.user?.id && commentText.trim()) {
                        onPostComment(session.user.id, commentText);
                      }
                    }}
                    style={{ opacity: commentText.trim() ? 1 : 0.5 }}
                  />
                }
              />
            </RNView>

            <View style={styles.commentsList}>
              {comments.map((comment) => (
                <View key={comment.id.toString()} style={[styles.commentContainer, { backgroundColor: colors.card }]}>
                  <RNView style={styles.commentHeader}>
                    <RNView style={styles.commentAuthor}>
                      <Avatar
                        size={24}
                        rounded
                        source={{ uri: comment.author.avatar_url || DEFAULT_AVATAR }}
                        containerStyle={styles.commentAvatar}
                      />
                      <Text style={[typography.caption, { color: colors.text }]}>
                        {comment.author.username}
                      </Text>
                    </RNView>
                    <Text style={[typography.caption, { color: colors.placeholder }]}>
                      {getRelativeTime(comment.created_at)}
                    </Text>
                  </RNView>
                  <Text style={[typography.body, { color: colors.text }]}>
                    {comment.text}
                  </Text>
                </View>
              ))}
              {comments.length === 0 && (
                <Text style={[typography.body, { color: colors.placeholder }]}>
                  No comments yet. Be the first to comment!
                </Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  profileContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  inputContainer: {
    width: "100%",
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
  avatarContainer: {
    opacity: 0.9,
  },
  avatar: {
    backgroundColor: '#e1e1e1',
    marginBottom: spacing.sm,
  },
  reactionStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginVertical: spacing.md,
    paddingVertical: spacing.sm,
    width: '100%',
  },
  reactionItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  usernameContainer: {
    marginTop: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  editIcon: {
    padding: spacing.xs,
  },
  usernameEditContainer: {
    width: '80%',
  },
  usernameInput: {
    marginBottom: -spacing.lg, // Reduce bottom margin from Input component
  },
  descriptionContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  descriptionEditContainer: {
    width: '100%',
    paddingHorizontal: spacing.sm,
  },
  descriptionInput: {
    marginBottom: -spacing.lg,
  },
  commentsSection: {
    width: '100%',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  commentsList: {
    width: '100%',
  },
  commentContainer: {
    padding: spacing.sm,
    borderRadius: 8,
    marginVertical: spacing.xs,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // This spreads the author info and timestamp
    marginBottom: spacing.xs,
  },
  commentAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  commentAvatar: {
    marginRight: spacing.xs,
  },
  commentInputContainer: {
    marginBottom: spacing.md, // Add margin below input
  },
  commentInput: {
    marginBottom: -spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl, // Add some bottom padding for better scrolling
  },
  headerContainer: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 1,
  },
  settingsIconWrapper: {
    padding: spacing.xs,
  },
  iconStyle: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
})
