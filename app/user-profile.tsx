import { StyleSheet, ScrollView, Platform, Alert, Animated, TouchableWithoutFeedback, View as RNView } from 'react-native';
import { View, Text } from '@/components/Themed';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar, Icon, Input } from '@rneui/themed';
import Colors from '@/constants/Colors';
import { typography, spacing } from '@/constants/Typography';
import { useColorScheme } from '@/components/useColorScheme';
import { getRelativeTime } from '@/utils/dateUtils';
import { StatusBar } from 'expo-status-bar';
import { useNetworkState } from '@/hooks/useNetworkState';
import OfflineBanner from '@/components/OfflineBanner';

const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/avataaars/svg";

interface ProfileComment {
  id: number;
  text: string;
  created_at: string;
  author: {
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

  // Let's add type safety for our statistics
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
  const colors = Colors[colorScheme];
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

  // Add a type-safe mapping
  const reactionTypeToStatKey = {
    'hug': 'hugs',
    'heart': 'hearts',
    'kiss': 'kisses'
  } as const;

  // Add animated values for each reaction type
  const scaleAnims = {
    hug: new Animated.Value(1),
    heart: new Animated.Value(1),
    kiss: new Animated.Value(1)
  };

  const animatePress = (type: 'hug' | 'heart' | 'kiss') => {
    Animated.sequence([
      // Initial quick shrink
      Animated.timing(scaleAnims[type], {
        toValue: 0.4,
        duration: 150,
        useNativeDriver: true,
      }),
      // Dramatic expansion with rotation and bounce
      Animated.parallel([
        Animated.spring(scaleAnims[type], {
          toValue: 1.5,
          useNativeDriver: true,
          speed: 40,
          bounciness: 25
        }),
        // Add rotation animation
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
      // Wobble effect
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
        // Final settle to normal size
        Animated.spring(scaleAnims[type], {
          toValue: 1,
          useNativeDriver: true,
          speed: 25,
          bounciness: 8
        })
      ])
    ]).start();
  };

  const handleReactionWithAnimation = async (type: 'hug' | 'heart' | 'kiss') => {
    animatePress(type);
    await handleReaction(type);
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
        await fetchProfile(user?.id || null);  // Pass the userId directly
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
  }, [id]); // Remove currentUserId dependency

  // Modify fetchProfile to accept userId parameter
  const fetchProfile = async (userId: string | null) => {
    if (!id) return;
    
    try {
      const [profileData, reactionsData, userReactionsData, commentsData] = await Promise.all([
        supabase
          .from("Profile")
          .select("*")
          .eq("id", id)
          .single(),
        // Get total counts per reaction type
        supabase
          .from("Reaction")
          .select('type')
          .eq("recipient_id", id),
        userId ? supabase
          .from('Reaction')
          .select('id, type')
          .eq('sender_id', userId)
          .eq('recipient_id', id) : Promise.resolve({ data: [] }),
        // Add this to fetch comments
        supabase
          .from('Profile Comment')
          .select(`
            id,
            text,
            created_at,
            author:Profile!author_id(username, avatar_url)
          `)
          .eq('profile_id', id)
          .order('created_at', { ascending: false })
      ]);

      if (profileData.error) throw profileData.error;
      
      // Initialize counts first
      const reactionCounts = {
        hugs: 0,
        hearts: 0,
        kisses: 0
      };
      
      // Count all reactions
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
      setComments(commentsData.data || []); // Add this line to set comments
      // Update statistics all at once
      setStatistics(prev => ({
        ...prev,
        hugs: reactionCounts.hugs,
        hearts: reactionCounts.hearts,
        kisses: reactionCounts.kisses
      }));

    } catch (error) {
      console.error('Error loading profile:', error);
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

  const handleReaction = async (type: 'hug' | 'heart' | 'kiss') => {
    if (!currentUserId || sendingReaction) return;
    
    try {
      setSendingReaction(true);
      const statKey = reactionTypeToStatKey[type];
      const existingReaction = userReactions.find(r => r.type.toLowerCase() === type.toLowerCase());

      if (existingReaction) {
        // First verify the reaction exists and belongs to the user
        const { data: verifyReaction, error: verifyError } = await supabase
          .from('Reaction')
          .select('id')
          .eq('id', existingReaction.id)
          .eq('sender_id', currentUserId)
          .single();

        if (verifyError || !verifyReaction) {
          throw new Error('Reaction verification failed');
        }

        // Then delete it
        const { error: deleteError } = await supabase
          .from('Reaction')
          .delete()
          .eq('id', existingReaction.id)
          .eq('sender_id', currentUserId); // Add this safety check

        if (deleteError) throw deleteError;

        // Update local state only after successful deletion
        setUserReactions(prev => prev.filter(r => r.id !== existingReaction.id));
        setStatistics(prev => ({
          ...prev,
          [statKey]: Math.max(0, prev[statKey] - 1)
        }));
      } else {
        // Add new reaction
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
          // Update local state only after successful addition
          setUserReactions(prev => [...prev, data]);
          setStatistics(prev => ({
            ...prev,
            [statKey]: prev[statKey] + 1
          }));
        }
      }
    } catch (error) {
      console.error('Reaction error:', error);
      Alert.alert('Error', 'Failed to process reaction');
      // Refresh the entire profile state on error
      await fetchProfile(currentUserId);
    } finally {
      setSendingReaction(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.text }}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.text }}>Profile not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isOnline && <OfflineBanner />}
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
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
            <Text style={[typography.h2, { color: colors.text }]}>
              {profile.username}
            </Text>
          </View>
          
          <View style={styles.descriptionContainer}>
            <Text style={[typography.body, { color: colors.text, textAlign: 'center' }]}>
              {profile.description || "No description"}
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
                    color={userReactions.some(r => r.type === 'hug') ? '#1877F2' : colors.text}
                    size={30}
                    style={styles.iconStyle}
                  />
                </Animated.View>
              </TouchableWithoutFeedback>
              <Text style={[typography.body, { color: colors.text }]}>{statistics.hugs}</Text>
            </View>
            <View style={styles.reactionItem}>
              <TouchableWithoutFeedback 
                onPress={() => !sendingReaction && handleReactionWithAnimation('heart')}
                disabled={!currentUserId || sendingReaction}
              >
                <Animated.View style={{ transform: [{ scale: scaleAnims.heart }] }}>
                  <Icon
                    name="heart"
                    type="font-awesome"
                    color={userReactions.some(r => r.type === 'heart') ? '#FF3B30' : colors.text}
                    size={30}
                    style={styles.iconStyle}
                  />
                </Animated.View>
              </TouchableWithoutFeedback>
              <Text style={[typography.body, { color: colors.text }]}>{statistics.hearts}</Text>
            </View>
            <View style={styles.reactionItem}>
              <TouchableWithoutFeedback 
                onPress={() => !sendingReaction && handleReactionWithAnimation('kiss')}
                disabled={!currentUserId || sendingReaction}
              >
                <Animated.View style={{ transform: [{ scale: scaleAnims.kiss }] }}>
                  <Icon
                    name="kiss-wink-heart"
                    type="font-awesome-5"
                    color={userReactions.some(r => r.type === 'kiss') ? '#FF2D55' : colors.text}
                    size={30}
                    style={styles.iconStyle}
                  />
                </Animated.View>
              </TouchableWithoutFeedback>
              <Text style={[typography.body, { color: colors.text }]}>{statistics.kisses}</Text>
            </View>
          </View>
        </View>

        <View style={styles.commentsSection}>
          <Text style={[typography.h3, { color: colors.text }]}>Comments</Text>
          
          <RNView style={styles.commentInputContainer}>
            {currentUserId && (
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
                    onPress={postComment}
                  />
                }
              />
            )}
          </RNView>

          <View style={styles.commentsList}>
            {comments.map((comment) => (
              <View key={comment.id.toString()} style={[styles.commentCard, { backgroundColor: colors.card }]}>
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
      </ScrollView>
    </View>
  );
}

export default UserProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
        WebkitTapHighlightColor: 'transparent', // This helps on mobile web
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
