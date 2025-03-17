import { useState, useEffect, useCallback } from "react"
import { StyleSheet, Alert, View as RNView, FlatList, ScrollView, Pressable } from "react-native"
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
import { useNetworkState } from '@/hooks/useNetworkState';
import { storeData, getData, KEYS } from '@/utils/offlineStorage';
import OfflineBanner from '@/components/OfflineBanner';
import VibesDisplay from '@/components/VibesDisplay';
import { useCredits } from '@/hooks/useCredits';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '@/contexts/LanguageContext';
import TruncatedText from '@/components/TruncatedText';
import { getAuthErrorMessage } from '@/utils/authErrorTranslator';

const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/avataaars/svg"
const LONG_PRESS_DURATION = 500;

interface ProfileComment {
  id: number
  text: string
  created_at: string
  author: {
    id: string
    username: string
    avatar_url: string | null
  }
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? 'light'];
  const isOnline = useNetworkState();
  const { t } = useLanguage();
  
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
  const [commentText, setCommentText] = useState("")
  const { credits, setCredits, fetchCredits } = useCredits();
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [isPasswordValid, setIsPasswordValid] = useState(true);
  
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (text.trim()) {
      setIsEmailValid(validateEmail(text));
    } else {
      setIsEmailValid(true);
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (text.trim()) {
      setIsPasswordValid(text.length >= 6);
    } else {
      setIsPasswordValid(true);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        if (error) {
          console.error('Session error:', error);
          return;
        }

        setSession(session);
        if (session?.user) {
          await Promise.all([
            getProfile(session.user.id),
            fetchCredits()
          ]);
        }
      } catch (error) {
        console.error('Init error:', error);
        Alert.alert(t('settings.error'), t('profile.error.session'));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        await Promise.all([
          getProfile(session.user.id),
          fetchCredits()
        ]);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (session?.user) {
        fetchCredits();
      }
    }, [session?.user, fetchCredits])
  );

  async function getProfile(userId: string) {
    try {
      setLoading(true);

      if (!isOnline) {
        const cachedProfile = await getData(KEYS.USER_PROFILE);
        if (cachedProfile) {
          setUsername(cachedProfile.username || '');
          setAvatarUrl(cachedProfile.avatar_url);
          setDescription(cachedProfile.description || '');
          setReactionStats(cachedProfile.reactionStats || { hugs: 0, hearts: 0, kisses: 0 });
          setComments(cachedProfile.comments || []);
          return;
        }
      }

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
            author:Profile!author_id(
              id,
              username, 
              avatar_url
            )
          `)
          .eq('profile_id', userId)
          .order('created_at', { ascending: false })
      ]);

      const newStats = {
        hugs: 0,
        hearts: 0,
        kisses: 0
      };

      if (!reactionCounts.error && reactionCounts.data) {
        reactionCounts.data.forEach((reaction: { type: string }) => {
          switch (reaction.type) {
            case 'hug': newStats.hugs++; break;
            case 'heart': newStats.hearts++; break;
            case 'kiss': newStats.kisses++; break;
          }
        });
      }

      setReactionStats(newStats);

      if (!profileData.error && profileData.data) {
        setUsername(profileData.data.username || '');
        setAvatarUrl(profileData.data.avatar_url);
        setDescription(profileData.data.description || '');
      }

      if (!commentsData.error) {
        setComments(commentsData.data || []);
      }

      await storeData(KEYS.USER_PROFILE, {
        username: profileData.data?.username || '',
        avatar_url: profileData.data?.avatar_url,
        description: profileData.data?.description || '',
        reactionStats: newStats,
        comments: commentsData.data || []
      });

    } catch (error) {
      console.error("Error loading profile:", error);
      const cachedProfile = await getData(KEYS.USER_PROFILE);
      if (cachedProfile) {
        setUsername(cachedProfile.username || '');
        setAvatarUrl(cachedProfile.avatar_url);
        setDescription(cachedProfile.description || '');
        setReactionStats(cachedProfile.reactionStats || { hugs: 0, hearts: 0, kisses: 0 });
        setComments(cachedProfile.comments || []);
      } else {
        Alert.alert("Error", "Failed to load profile");
      }
    } finally {
      setLoading(false);
    }
  }

  async function signInWithEmail() {
    if (!email || !password) {
      Alert.alert(t('settings.error'), t('profile.error.fields'))
      return
    }

    setAuthLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
    } catch (error) {
      console.error("Sign in error:", error)
      Alert.alert(t('settings.error'), getAuthErrorMessage(error, t))
    } finally {
      setAuthLoading(false)
    }
  }

  async function signUpWithEmail() {
    if (!email || !password) {
      Alert.alert(t('settings.error'), t('profile.error.fields'))
      return
    }

    setAuthLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: null,
          data: {
            email_confirmed: true
          }
        }
      })

      if (error) throw error
      
      if (!data.session) {
        throw new Error("Failed to create session")
      }

      await new Promise(resolve => setTimeout(resolve, 1000))

      const { data: profile, error: profileError } = await supabase
        .from('Profile')
        .select('*')
        .eq('id', data.session.user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
      }

      setSession(data.session)
      router.replace('/(tabs)/')
    } catch (error) {
      console.error("Sign up error:", error)
      Alert.alert(t('settings.error'), getAuthErrorMessage(error, t))
    } finally {
      setAuthLoading(false)
    }
  }

  async function signOut() {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error

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

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, decode(avatarBase64), {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

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


  const postComment = async (profileId: string, text: string) => {
    if (!session?.user?.id || !text.trim()) return
    
    try {
      setIsPostingComment(true)
      const { error } = await supabase
        .from('Profile Comment')
        .insert({
          text: text.trim(),
          author_id: session.user.id,
          profile_id: profileId
        })

      if (error) throw error

      await getProfile(profileId)
      setCommentText("")
    } catch (error) {
      console.error('Post comment error:', error)
      Alert.alert('Error', 'Failed to post comment')
    } finally {
      setIsPostingComment(false)
    }
  }

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

  const fetchComments = async () => {
    if (!session?.user?.id) return;
    
    try {
      const { data: commentsData, error } = await supabase
        .from('Profile Comment')
        .select(`
          id,
          text,
          created_at,
          author:Profile!author_id(
            id,
            username, 
            avatar_url
          )
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

  const fetchUserCredits = useCallback(async (userId: string) => {
    const amount = await fetchCredits();
    setCredits(amount);
  }, [fetchCredits, setCredits]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={{ color: theme.text }}>{t('profile.loading')}</Text>
      </View>
    )
  }

  if (!session) {
    const inputErrorStyles = {
      invalidInput: {
        color: theme.error,
      },
      errorText: {
        color: theme.error,
        fontSize: 12,
        marginTop: 4,
      },
      errorBorder: {
        borderBottomColor: theme.error,
      }
    };

    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.authContainer}>
            <Text style={[typography.h2, { color: theme.text, marginBottom: spacing.lg }]}>
              {isSignUp ? t('profile.createAccount') : t('profile.welcomeBack')}
            </Text>
            <Input
              label={t('profile.email')}
              leftIcon={{ type: "font-awesome", name: "envelope", color: theme.text }}
              onChangeText={handleEmailChange}
              value={email}
              placeholder={t('profile.emailPlaceholder')}
              autoCapitalize="none"
              containerStyle={[styles.input, { marginBottom: spacing.sm }]}
              inputStyle={[
                { color: theme.text },
                !isEmailValid && email.trim() && inputErrorStyles.invalidInput
              ]}
              errorMessage={email.trim() && !isEmailValid ? t('profile.error.invalidEmail') : ''}
              errorStyle={inputErrorStyles.errorText}
              inputContainerStyle={[
                { borderBottomColor: theme.border },
                !isEmailValid && email.trim() && inputErrorStyles.errorBorder
              ]}
              placeholderTextColor={theme.placeholder}
            />
            <Input
              label={t('profile.password')}
              leftIcon={{ type: "font-awesome", name: "lock", color: theme.text }}
              onChangeText={handlePasswordChange}
              value={password}
              secureTextEntry={true}
              placeholder={t('profile.passwordPlaceholder')}
              autoCapitalize="none"
              containerStyle={[styles.input, { marginBottom: spacing.lg }]}
              inputStyle={[
                { color: theme.text },
                !isPasswordValid && password.trim() && inputErrorStyles.invalidInput
              ]}
              errorMessage={password.trim() && !isPasswordValid ? t('profile.error.passwordTooShort') : ''}
              errorStyle={inputErrorStyles.errorText}
              inputContainerStyle={[
                { borderBottomColor: theme.border },
                !isPasswordValid && password.trim() && inputErrorStyles.errorBorder
              ]}
              placeholderTextColor={theme.placeholder}
            />
            <Button
              title={isSignUp ? t('profile.signUp') : t('profile.signIn')}
              disabled={Boolean(
                authLoading || 
                !email.trim() || // Disable if email is empty
                !password.trim() || // Disable if password is empty
                (!isEmailValid && email.trim()) || // Disable if email is invalid
                (!isPasswordValid && password.trim()) // Disable if password is invalid
              )}
              onPress={isSignUp ? signUpWithEmail : signInWithEmail}
              containerStyle={[styles.button, { marginBottom: spacing.md }]}
              buttonStyle={{ backgroundColor: theme.button }}
              titleStyle={{ color: theme.buttonText }}
            />
            <Button
              title={isSignUp ? t('profile.switchToSignIn') : t('profile.switchToSignUp')}
              type="clear"
              onPress={() => {
                setIsSignUp(!isSignUp);
                setEmail('');
                setPassword('');
                setIsEmailValid(true);
                setIsPasswordValid(true);
              }}
              containerStyle={styles.switchButton}
              titleStyle={{ color: theme.text }}
            />
          </View>
        </ScrollView>
      </View>
    );
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
    commentText={commentText}
    setCommentText={setCommentText}
    updateReactionStats={updateReactionStats}
    fetchComments={fetchComments}
    isOnline={isOnline}
    userCredits={credits}
    translations={{
      noDescription: t('profile.noDescription'),
      addDescription: t('profile.addDescription'),
      comments: t('profile.comments'),
      addComment: t('profile.addComment'),
      noComments: t('profile.noComments'),
    }}
  />
}

interface AccountProps {
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
  fetchComments: () => Promise<void>;
  isOnline: boolean;
  userCredits: number;
  translations: {
    noDescription: string;
    addDescription: string;
    comments: string;
    addComment: string;
    noComments: string;
  };
}

interface ProfileState {
  comments: boolean;
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
  fetchComments,
  isOnline,
  userCredits,
  translations,
}: AccountProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? 'light'];
  const { t, language } = useLanguage();
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState(username)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [newDescription, setNewDescription] = useState(description)

  const [profile, setProfile] = useState<ProfileState>({ comments: true });
  const [isDestructiveMode, setIsDestructiveMode] = useState(false);
  const [pressedCommentId, setPressedCommentId] = useState<number | null>(null);

  const updateUsername = async () => {
    if (!session?.user?.id || !newUsername.trim()) return
    
    try {
      await onUpdateUsername(newUsername)
      setIsEditingUsername(false)
    } catch (error) {
    }
  }

  const updateDescription = async () => {
    if (!session?.user?.id) return
    try {
      await onUpdateDescription(newDescription)
      setIsEditingDescription(false)
    } catch (error) {
    }
  }

  const handleAvatarPress = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  useEffect(() => {
    if (!session?.user?.id) return;

    const pollInterval = setInterval(updateReactionStats, 5000);

    updateReactionStats();

    return () => clearInterval(pollInterval);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const pollInterval = setInterval(() => {
      updateReactionStats();
      fetchComments();
    }, 5000);

    updateReactionStats();
    fetchComments();

    return () => clearInterval(pollInterval);
  }, [session?.user?.id]);

  const toggleComments = async () => {
    if (!session?.user?.id) return;
    
    try {
      const { error } = await supabase
        .from('Profile')
        .update({ comments: !profile.comments })
        .eq('id', session.user.id);

      if (error) throw error;

      setProfile(prev => ({ ...prev, comments: !prev.comments }));
    } catch (error) {
      console.error('Toggle comments error:', error);
      Alert.alert(t('settings.error'), t('profile.error.toggleComments'));
    }
  };

  useEffect(() => {
    const fetchProfileState = async () => {
      if (!session?.user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('Profile')
          .select('comments')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;
        
        setProfile(prev => ({ ...prev, ...data }));
      } catch (error) {
        console.error('Error fetching profile state:', error);
      }
    };

    fetchProfileState();
  }, [session?.user?.id]);

  const handleDeleteComment = async (commentId: number) => {
    try {
      const { error } = await supabase
        .from('Profile Comment')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      await fetchComments();
    } catch (error) {
      console.error('Delete comment error:', error);
      Alert.alert(t('settings.error'), t('profile.error.deleteComment'));
    }
  };

  const renderComment = ({ item }: { item: AgendaComment }) => (
    <Pressable 
      onLongPress={() => setPressedCommentId(item.id)}
      onPress={() => setPressedCommentId(null)}
      delayLongPress={LONG_PRESS_DURATION}
    >
      <RNView style={[styles.commentContainer, { backgroundColor: theme.card }]}>
        <RNView style={styles.commentHeader}>
          <RNView style={styles.commentAuthor}>
            <Pressable 
              onPress={() => {
                if (session?.user?.id === item.author.id) {
                  return; // Stay on current profile
                }
                router.push({
                  pathname: "/user-profile",
                  params: { id: item.author.id }
                });
              }}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <RNView style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar
                  size={24}
                  rounded
                  source={{ uri: item.author.avatar_url || DEFAULT_AVATAR }}
                  containerStyle={styles.commentAvatar}
                />
                <Text style={[typography.caption, { color: theme.text }]}>
                  {item.author.username}
                  {session?.user?.id === item.author.id && ` (${t('agenda.you')})`}
                </Text>
              </RNView>
            </Pressable>
          </RNView>
          <RNView style={styles.commentActions}>
            <Text style={[typography.caption, { color: theme.placeholder }]}>
              {getRelativeTime(item.created_at, t, language)}
            </Text>
            {pressedCommentId === item.id && (
              <Icon
                name="eraser"
                type="font-awesome-5"
                size={14}
                color={theme.error}
                onPress={() => handleDeleteComment(item.id)}
                containerStyle={[styles.actionIcon, { marginLeft: spacing.sm }]}
              />
            )}
          </RNView>
        </RNView>
        <TruncatedText text={item.text} />
      </RNView>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {!isOnline && <OfflineBanner />}
      <RNView style={styles.headerContainer}>
        <VibesDisplay amount={userCredits} />
        <RNView style={styles.settingsIconWrapper}>
          <Icon
            name="cog"
            type="font-awesome-5"
            color={theme.text}
            size={24}
            onPress={() => router.push("/settings")}
          />
        </RNView>
      </RNView>
      <ScrollView 
        showsVerticalScrollIndicator={false}
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
                  inputStyle={{ color: theme.text }}
                  autoFocus
                  onSubmitEditing={updateUsername}
                  rightIcon={
                    <Icon
                      name="check"
                      type="font-awesome"
                      color={theme.text}
                      size={20}
                      onPress={updateUsername}
                    />
                  }
                />
              </RNView>
            ) : (
              <Pressable
                onLongPress={() => setIsEditingUsername(true)}
                delayLongPress={LONG_PRESS_DURATION}
                style={({ pressed }) => [
                  styles.usernameRow,
                  { opacity: pressed ? 0.7 : 1 }
                ]}
              >
                <Text style={[typography.h2, { color: theme.text }]}>
                  {loading ? "Loading..." : username || session.user.email}
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.descriptionContainer}>
            {isEditingDescription ? (
              <RNView style={styles.descriptionEditContainer}>
                <Input
                  value={newDescription}
                  onChangeText={setNewDescription}
                  placeholder={translations.addDescription}
                  multiline
                  numberOfLines={3}
                  containerStyle={styles.descriptionInput}
                  inputStyle={{ color: theme.text }}
                  autoFocus
                  onSubmitEditing={updateDescription}
                  rightIcon={
                    <Icon
                      name="check"
                      type="font-awesome"
                      color={theme.text}
                      size={20}
                      onPress={updateDescription}
                    />
                  }
                />
              </RNView>
            ) : (
              <Pressable
                onLongPress={() => setIsEditingDescription(true)}
                delayLongPress={LONG_PRESS_DURATION}
                style={({ pressed }) => [
                  styles.descriptionRow,
                  { opacity: pressed ? 0.7 : 1 }
                ]}
              >
                <Text style={[typography.body, { color: theme.text }]}>
                  {description || translations.noDescription}
                </Text>
              </Pressable>
            )}
          </View>

          <RNView style={styles.reactionStats}>
            <RNView style={styles.reactionItem}>
              <Icon 
                name="like1" 
                type="ant-design" 
                color="#1877F2"
                size={30}
                style={styles.iconStyle}
              />
              <Text style={[typography.body, { color: theme.text }]}>{reactionStats.hugs}</Text>
            </RNView>
            <RNView style={styles.reactionItem}>
              <Icon 
                name="heart" 
                type="font-awesome" 
                color="#FF3B30"
                size={30}
                style={styles.iconStyle}
              />
              <Text style={[typography.body, { color: theme.text }]}>{reactionStats.hearts}</Text>
            </RNView>
            <RNView style={styles.reactionItem}>
              <Icon 
                name="kiss-wink-heart" 
                type="font-awesome-5" 
                color="#FF2D55"
                size={30}
                style={styles.iconStyle}
              />
              <Text style={[typography.body, { color: theme.text }]}>{reactionStats.kisses}</Text>
            </RNView>
          </RNView>

          <View style={styles.commentsSection}>
            <View style={styles.commentsSectionHeader}>
              <Text style={[typography.h3, { color: theme.text }]}>
                {translations.comments}
              </Text>
              <RNView style={styles.commentHeaderActions}>
                <Icon
                  name={profile.comments ? "eye" : "eye-slash"}
                  type="font-awesome-5"
                  size={20}
                  color={profile.comments ? theme.tint : theme.placeholder}
                  onPress={toggleComments}
                />
              </RNView>
            </View>
            
            {profile.comments ? (
              <>
                <RNView style={styles.commentInputContainer}>
                  <Input
                    placeholder={translations.addComment}
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                    containerStyle={styles.commentInput}
                    inputStyle={{ color: theme.text }}
                    rightIcon={
                      <Icon
                        name="send"
                        type="font-awesome"
                        color={commentText.trim() ? theme.text : theme.placeholder}
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
                    <Pressable 
                      key={comment.id.toString()}
                      onLongPress={() => setPressedCommentId(comment.id)}
                      onPress={() => setPressedCommentId(null)}
                      delayLongPress={LONG_PRESS_DURATION}
                    >
                      <View style={[styles.commentContainer, { backgroundColor: theme.card }]}>
                        <RNView style={styles.commentHeader}>
                          <RNView style={styles.commentAuthor}>
                            <Pressable 
                              onPress={() => {
                                if (session?.user?.id === comment.author.id) {
                                  return; // Stay on current profile
                                }
                                router.push({
                                  pathname: "/user-profile",
                                  params: { id: comment.author.id }
                                });
                              }}
                              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                            >
                              <RNView style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Avatar
                                  size={24}
                                  rounded
                                  source={{ uri: comment.author.avatar_url || DEFAULT_AVATAR }}
                                  containerStyle={styles.commentAvatar}
                                />
                                <Text style={[typography.caption, { color: theme.text }]}>
                                  {comment.author.username}
                                  {session?.user?.id === comment.author.id && ` (${t('agenda.you')})`}
                                </Text>
                              </RNView>
                            </Pressable>
                          </RNView>
                          <RNView style={styles.commentActions}>
                            <Text style={[typography.caption, { color: theme.placeholder }]}>
                              {getRelativeTime(comment.created_at, t, language)}
                            </Text>
                            {pressedCommentId === comment.id && (
                              <Icon
                                name="eraser"
                                type="font-awesome-5"
                                size={14}
                                color={theme.error}
                                onPress={() => handleDeleteComment(comment.id)}
                                containerStyle={[styles.actionIcon, { marginLeft: spacing.sm }]}
                              />
                            )}
                          </RNView>
                        </RNView>
                        <TruncatedText text={comment.text} />
                      </View>
                    </Pressable>
                  ))}
                  {comments.length === 0 && (
                    <Text style={[typography.body, { color: theme.placeholder }]}>
                      {translations.noComments}
                    </Text>
                  )}
                </View>
              </>
            ) : (
              <Text style={[styles.disabledMessage, { color: theme.placeholder }]}>
                {t('profile.commentsDisabled')}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: {
    padding: spacing.xs,
  },
  usernameEditContainer: {
    width: '80%',
  },
  usernameInput: {
    marginBottom: -spacing.lg,
  },
  descriptionContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  descriptionRow: {
    alignItems: 'center',
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
    justifyContent: 'space-between',
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
    marginBottom: spacing.md,
  },
  commentInput: {
    marginBottom: -spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: spacing.xl + spacing.lg,
    padding: spacing.lg,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: spacing.lg,
    paddingBottom: 0,
    position: 'absolute',
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  settingsIconWrapper: {
    padding: spacing.xs,
  },
  iconStyle: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  commentsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  authContainer: {
    width: '100%',
    padding: spacing.lg,
    flex: 1,
  },
  disabledMessage: {
    ...typography.body,
    textAlign: 'center',
    paddingVertical: spacing.md,
    fontStyle: 'italic',
  },
  commentHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    padding: spacing.xs,
  },
})
