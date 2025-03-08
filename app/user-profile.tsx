import { StyleSheet, ScrollView, Platform, Alert, Animated, TouchableWithoutFeedback, View as RNView, Pressable } from 'react-native';
import { View, Text } from '@/components/Themed';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar, Icon, Input } from '@rneui/themed';
import Colors from '@/constants/Colors';
import { typography, spacing } from '@/constants/Typography';
import { useColorScheme } from '@/components/useColorScheme';
import { getRelativeTime } from '@/utils/dateUtils';
import { StatusBar } from 'expo-status-bar';
import { useNetworkState } from '@/hooks/useNetworkState';
import OfflineBanner from '@/components/OfflineBanner';
import VibesDisplay from '@/components/VibesDisplay';
import { useLanguage } from '@/contexts/LanguageContext';
import RainingIcons from '@/components/RainingIcons';
import ReactionRain from '@/components/ReactionRain';
import TruncatedComment from '@/components/TruncatedComment';
import TruncatedText from '@/components/TruncatedText';

const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/avataaars/svg";

const REACTION_COSTS = {
  heart: 5,
  kiss: 10,
  hug: 0
} as const;

interface ProfileComment {
  id: number;
  text: string;
  created_at: string;
  author: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface Reaction {
  type: 'hug' | 'heart' | 'kiss';
  id: number;
}

const UserProfileScreen = () => {
  const isOnline = useNetworkState();
  const { t, language } = useLanguage();

  interface ReactionStatistics {
    hugs: number;
    hearts: number;
    kisses: number;
    totalComments: number;
    accountCreated: string;
    lastActive: string;
  }

  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [comments, setComments] = useState<ProfileComment[]>([]);
  const [statistics, setStatistics] = useState<ReactionStatistics>({
    hugs: 0,
    hearts: 0,
    kisses: 0,
    totalComments: 0,
    accountCreated: '',
    lastActive: '',
  });
  const [commentText, setCommentText] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [userReactions, setUserReactions] = useState<Reaction[]>([]);
  const [sendingReaction, setSendingReaction] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
  const [currentUserCredits, setCurrentUserCredits] = useState(0);
  const [showRainingAnimation, setShowRainingAnimation] = useState<'hug' | 'heart' | 'kiss' | null>(null);
  const [activeAnimations, setActiveAnimations] = useState<Array<{ id: number; type: 'hug' | 'heart' | 'kiss' }>>([]);
  const animationIdCounter = useRef(0);

  const reactionTypeToStatKey = {
    'hug': 'hugs',
    'heart': 'hearts',
    'kiss': 'kisses'
  } as const;

  const scaleAnims = {
    hug: new Animated.Value(1),
    heart: new Animated.Value(1),
    kiss: new Animated.Value(1)
  };

  const animatePress = (type: 'hug' | 'heart' | 'kiss') => {
    Animated.sequence([
      Animated.timing(scaleAnims[type], {
        toValue: 0.4,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(scaleAnims[type], {
          toValue: 1.5,
          useNativeDriver: true,
          speed: 40,
          bounciness: 25
        }),
        Animated.sequence([
          Animated.timing(new Animated.Value(0), {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(new Animated.Value(0), {
            toValue: 0,
            useNativeDriver: true,
            speed: 30,
            bounciness: 8
          })
        ])
      ]),
      Animated.sequence([
        Animated.timing(scaleAnims[type], {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnims[type], {
          toValue: 1.2,
          useNativeDriver: true,
          speed: 35,
          bounciness: 15
        }),
        Animated.spring(scaleAnims[type], {
          toValue: 0.9,
          useNativeDriver: true,
          speed: 35,
          bounciness: 15
        }),
        Animated.spring(scaleAnims[type], {
          toValue: 1,
          useNativeDriver: true,
          speed: 25,
          bounciness: 8
        })
      ])
    ]).start();
  };

  const addReactionAnimation = (type: 'hug' | 'heart' | 'kiss') => {
    const id = animationIdCounter.current++;
    setActiveAnimations(prev => [...prev, { id, type }]);
  };

  const removeReactionAnimation = (id: number) => {
    setActiveAnimations(prev => prev.filter(anim => anim.id !== id));
  };

  const handleReactionWithAnimation = async (type: 'hug' | 'heart' | 'kiss') => {
    if (!currentUserId || sendingReaction) return;
    
    const cost = REACTION_COSTS[type];

    if (cost > 0 && currentUserCredits < cost) {
      Alert.alert(
        t('userProfile.error.insufficientVibes'),
        t('userProfile.error.insufficientVibesDesc').replace('{amount}', String(cost)),
        [
          { text: t('settings.cancel'), style: "cancel" },
          { 
            text: t('userProfile.action.getVibes'),
            onPress: () => router.push('/store')
          }
        ]
      );
      return;
    }

    setSendingReaction(true);
    animatePress(type);

    try {
      const statKey = reactionTypeToStatKey[type];
      const existingReaction = userReactions.find(r => r.type.toLowerCase() === type.toLowerCase());

      if (type === 'hug') {
        if (existingReaction) {
          const { error: deleteError } = await supabase
            .from('Reaction')
            .delete()
            .eq('id', existingReaction.id)
            .eq('sender_id', currentUserId);

          if (deleteError) throw deleteError;

          setUserReactions(prev => prev.filter(r => r.id !== existingReaction.id));
          setStatistics(prev => ({
            ...prev,
            [statKey]: Math.max(0, prev[statKey] - 1)
          }));
        } else {
          const { data, error } = await supabase
            .from('Reaction')
            .insert({
              type: type.toLowerCase(),
              sender_id: currentUserId,
              recipient_id: id,
              paid: false
            })
            .select()
            .single();

          if (error) throw error;

          if (data) {
            setUserReactions(prev => [...prev, data]);
            setStatistics(prev => ({
              ...prev,
              [statKey]: prev[statKey] + 1
            }));
            addReactionAnimation(type);
          }
        }
      } else {
        const { data: reactionData, error: reactionError } = await supabase
          .from('Reaction')
          .insert({
            type: type.toLowerCase(),
            sender_id: currentUserId,
            recipient_id: id,
            paid: true
          })
          .select()
          .single();

        if (reactionError) throw reactionError;

        const { error: creditError } = await supabase
          .from('User Credit')
          .update({ amount: currentUserCredits - cost })
          .eq('user_id', currentUserId);

        if (creditError) throw creditError;

        setCurrentUserCredits(prev => prev - cost);
        setUserReactions(prev => [...prev, reactionData]);
        setStatistics(prev => ({
          ...prev,
          [statKey]: prev[statKey] + 1
        }));
        addReactionAnimation(type);
      }
    } catch (error) {
      console.error('Reaction error:', error);
      Alert.alert('Error', 'Failed to process reaction');
      await fetchProfile(currentUserId);
    } finally {
      setSendingReaction(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const initialize = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted) return;
        
        if (user?.id === id) {
          router.push('/three');
          return;
        }
        
        setCurrentUserId(user?.id || null);
        await fetchCurrentUserCredits(user?.id);
        await fetchProfile(user?.id || null);
      } catch (error) {
        console.error('Init error:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();
    return () => { mounted = false; };
  }, [id]);

  const fetchProfile = async (userId: string | null) => {
    if (!id) return;
    
    try {
      const [profileData, reactionsData, userReactionsData, commentsData, creditsData] = await Promise.all([
        supabase
          .from("Profile")
          .select("username, avatar_url, description, comments")
          .eq("id", id)
          .single(),
        supabase
          .from("Reaction")
          .select('type')
          .eq("recipient_id", id),
        userId ? supabase
          .from('Reaction')
          .select('id, type')
          .eq('sender_id', userId)
          .eq('recipient_id', id) : Promise.resolve({ data: [] }),
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
          .eq('profile_id', id)
          .order('created_at', { ascending: false }),
        supabase
          .from('User Credit')
          .select('amount')
          .eq('user_id', id)
          .single()
      ]);

      if (profileData.error) throw profileData.error;

      const reactionCounts = {
        hugs: 0,
        hearts: 0,
        kisses: 0
      };

      reactionsData.data?.forEach((reaction: { type: string }) => {
        const type = reaction.type.toLowerCase().trim();
        switch (type) {
          case 'hug':
            reactionCounts.hugs++;
            break;
          case 'heart':
            reactionCounts.hearts++;
            break;
          case 'kiss':
            reactionCounts.kisses++;
            break;
        }
      });

      setProfile(profileData.data);
      setUserReactions(userReactionsData.data || []);
      setComments(commentsData.data || []);
      setStatistics(prev => ({
        ...prev,
        hugs: reactionCounts.hugs,
        hearts: reactionCounts.hearts,
        kisses: reactionCounts.kisses
      }));

      if (!creditsData.error) {
        setUserCredits(creditsData.data?.amount || 0);
      }

    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const fetchCurrentUserCredits = async (userId: string | null) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('User Credit')
        .select('amount')
        .eq('user_id', userId)
        .single();
  
      if (error) throw error;
      setCurrentUserCredits(data.amount || 0);
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  const postComment = async () => {
    if (!currentUserId || !commentText.trim()) return;
    
    try {
      setIsPostingComment(true);
      const { error } = await supabase
        .from('Profile Comment')
        .insert({
          text: commentText.trim(),
          author_id: currentUserId,
          profile_id: id
        });

      if (error) throw error;
      
      const { data: newComments } = await supabase
        .from('Profile Comment')
        .select(`
          id,
          text,
          created_at,
          author:Profile!author_id(username, avatar_url)
        `)
        .eq('profile_id', id)
        .order('created_at', { ascending: false });

      setComments(newComments || []);
      setCommentText("");
    } catch (error) {
      console.error('Post comment error:', error);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  const renderComment = ({ item }: { item: ProfileComment }) => (
    <RNView style={[styles.commentContainer, { backgroundColor: theme.card }]}>
      <RNView style={styles.commentHeader}>
        <RNView style={styles.commentAuthor}>
          <Pressable 
            onPress={() => {
              if (currentUserId === item.author.id) {
                // Navigate to own profile
                router.push('/three');
              } else if (id === item.author.id) {
                // Already viewing this user's profile, do nothing
                return;
              } else {
                // Navigate to another user's profile
                router.push({
                  pathname: "/user-profile",
                  params: { id: item.author.id }
                });
              }
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
              </Text>
            </RNView>
          </Pressable>
        </RNView>
        <Text style={[typography.caption, { color: theme.placeholder }]}>
          {getRelativeTime(item.created_at, t, language)}
        </Text>
      </RNView>
      <TruncatedComment text={item.text} />
    </RNView>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={{ color: theme.text }}>{t('userProfile.loading')}</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={{ color: theme.text }}>{t('userProfile.notFound')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {activeAnimations.map(animation => (
        <ReactionRain
          key={animation.id}
          type={animation.type}
          onAnimationComplete={() => removeReactionAnimation(animation.id)}
        />
      ))}
      {!isOnline && <OfflineBanner />}
      <View style={styles.headerRow}>
        {currentUserId && <VibesDisplay amount={currentUserCredits} />}
      </View>
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.profileContainer}>
          <Avatar
            size={100}
            rounded
            source={{ uri: profile.avatar_url || DEFAULT_AVATAR }}
            containerStyle={[styles.avatar, styles.avatarContainer]}
          />
          <View style={styles.usernameContainer}>
            <Text style={[typography.h2, { color: theme.text }]}>
              {profile.username}
            </Text>
          </View>
          
          <View style={styles.descriptionContainer}>
            <Text style={[typography.body, { color: theme.text, textAlign: 'center' }]}>
              {profile.description || t('userProfile.noDescription')}
            </Text>
          </View>
          
          <View style={styles.reactionStats}>
            <View style={styles.reactionItem}>
              <TouchableWithoutFeedback 
                onPress={() => !sendingReaction && handleReactionWithAnimation('hug')}
                disabled={!currentUserId || sendingReaction}
              >
                <Animated.View style={{ transform: [{ scale: scaleAnims.hug }] }}>
                  <Icon
                    name="like1"
                    type="ant-design"
                    color={userReactions.some(r => r.type === 'hug') ? '#1877F2' : theme.text}
                    size={30}
                    style={styles.iconStyle}
                  />
                </Animated.View>
              </TouchableWithoutFeedback>
              <Text style={[typography.body, { color: theme.text }]}>{statistics.hugs}</Text>
            </View>
            <View style={styles.reactionItem}>
              <TouchableWithoutFeedback 
                onPress={() => !sendingReaction && handleReactionWithAnimation('heart')}
                disabled={!currentUserId || sendingReaction || currentUserCredits < REACTION_COSTS.heart}
              >
                <Animated.View style={{ transform: [{ scale: scaleAnims.heart }] }}>
                  <Icon
                    name="heart"
                    type="font-awesome"
                    color={userReactions.some(r => r.type === 'heart') ? '#FF3B30' : theme.text}
                    size={30}
                    style={styles.iconStyle}
                  />
                </Animated.View>
              </TouchableWithoutFeedback>
              <Text style={[typography.body, { color: theme.text }]}>{statistics.hearts}</Text>
            </View>
            <View style={styles.reactionItem}>
              <TouchableWithoutFeedback 
                onPress={() => !sendingReaction && handleReactionWithAnimation('kiss')}
                disabled={!currentUserId || sendingReaction || currentUserCredits < REACTION_COSTS.kiss}
              >
                <Animated.View style={{ transform: [{ scale: scaleAnims.kiss }] }}>
                  <Icon
                    name="kiss-wink-heart"
                    type="font-awesome-5"
                    color={userReactions.some(r => r.type === 'kiss') ? '#FF2D55' : theme.text}
                    size={30}
                    style={styles.iconStyle}
                  />
                </Animated.View>
              </TouchableWithoutFeedback>
              <Text style={[typography.body, { color: theme.text }]}>{statistics.kisses}</Text>
            </View>
          </View>
        </View>

        <View style={styles.commentsSection}>
          <Text style={[typography.h3, { color: theme.text }]}>
            {t('userProfile.comments')}
          </Text>
          
          {profile?.comments ? (
            <>
              <RNView style={styles.commentInputContainer}>
                {currentUserId && (
                  <Input
                    placeholder={t('userProfile.addComment')}
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
                        onPress={postComment}
                      />
                    }
                  />
                )}
              </RNView>

              <View style={styles.commentsList}>
                {comments.map((comment) => (
                  <View key={comment.id.toString()} style={[styles.commentCard, { backgroundColor: theme.card }]}>
                    <RNView style={styles.commentHeader}>
                      <RNView style={styles.commentAuthor}>
                        <Pressable 
                          onPress={() => {
                            if (currentUserId === comment.author.id) {
                              // Navigate to own profile
                              router.push('/three');
                            } else if (id === comment.author.id) {
                              // Already viewing this user's profile, do nothing
                              return;
                            } else {
                              // Navigate to another user's profile
                              router.push({
                                pathname: "/user-profile",
                                params: { id: comment.author.id }
                              });
                            }
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
                            </Text>
                          </RNView>
                        </Pressable>
                      </RNView>
                      <Text style={[typography.caption, { color: theme.placeholder }]}>
                        {getRelativeTime(comment.created_at, t, language)}
                      </Text>
                    </RNView>
                    <TruncatedText text={comment.text} />
                  </View>
                ))}
                {comments.length === 0 && (
                  <Text style={[typography.body, { color: theme.placeholder }]}>
                    {t('userProfile.noComments')}
                  </Text>
                )}
              </View>
            </>
          ) : (
            <Text style={[typography.body, { color: theme.placeholder }]}>
              {t('userProfile.commentsDisabled')}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export default UserProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    padding: spacing.lg,
    paddingBottom: 0,
    position: 'absolute',
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: spacing.xl + spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  profileContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    width: '100%',
  },
  commentsSection: {
    width: '100%',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  commentsList: {
    width: '100%',
  },
  commentCard: {
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
  reactionItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  descriptionContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.sm,
    minHeight: 25,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  pressableIcon: {
    ...Platform.select({
      ios: {
        margin: 5,
      },
      android: {
        margin: 5,
        backgroundColor: 'transparent',
      },
      web: {
        cursor: 'pointer',
        outline: 'none',
        backgroundColor: 'transparent',
        borderRadius: 0,
        overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent',
      },
    }),
    opacity: 1,
    backgroundColor: 'transparent',
  },
  iconStyle: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  usernameContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
});
