import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  read: boolean;
}

export default function ConversationDetail() {
  const params = useLocalSearchParams();
  const { id: otherUserId, listingId, userName, listingTitle } = params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  
  const flatListRef = useRef<FlatList>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    initializeChat();
    
    return () => {
      // Cleanup on unmount
      if (channelRef.current) {
        console.log(' Cleaning up realtime subscription');
        channelRef.current.unsubscribe();
      }
    };
  }, []);

  const initializeChat = async () => {
    await loadMessages();
    setupRealtimeSubscription();
  };

  const loadMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not found');
        return;
      }

      setCurrentUserId(user.id);

      console.log(' Loading messages for:', {
        currentUser: user.id,
        otherUser: otherUserId,
        listing: listingId
      });

      // Load messages
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('listing_id', listingId as string)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error(' Error loading messages:', error);
        throw error;
      }

      console.log(` Loaded ${data?.length || 0} messages`);
      setMessages(data || []);

      // Mark unread messages as read
      if (data && data.length > 0) {
        const unreadMessages = data.filter(
          (msg) => msg.receiver_id === user.id && !msg.read
        );

        if (unreadMessages.length > 0) {
          console.log(` Marking ${unreadMessages.length} messages as read`);
          const { error: updateError } = await supabase
            .from('messages')
            .update({ read: true })
            .in('id', unreadMessages.map(m => m.id));

          if (updateError) {
            console.error(' Error marking messages as read:', updateError);
          }
        }
      }
    } catch (error) {
      console.error(' Error in loadMessages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channelName = `messages:${listingId}`;
      console.log(` Setting up realtime for channel: ${channelName}`);

      // Create a channel for this specific conversation
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `listing_id=eq.${listingId}`,
          },
          async (payload) => {
            console.log(' New message received via realtime:', payload);
            const newMsg = payload.new as Message;
            
            // Only add message if it's part of this conversation
            if (
              (newMsg.sender_id === otherUserId && newMsg.receiver_id === user.id) ||
              (newMsg.sender_id === user.id && newMsg.receiver_id === otherUserId)
            ) {
              console.log(' Message belongs to this conversation, adding to list');
              
              // Add to messages list
              setMessages((prev) => {
                // Prevent duplicates
                if (prev.some(m => m.id === newMsg.id)) {
                  return prev;
                }
                return [...prev, newMsg];
              });
              
              // Mark as read if we're the receiver
              if (newMsg.receiver_id === user.id && !newMsg.read) {
                await supabase
                  .from('messages')
                  .update({ read: true })
                  .eq('id', newMsg.id);
              }
              
              // Scroll to bottom
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
              
              // Haptic feedback
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }
        )
        .subscribe((status) => {
          console.log(' Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log(' Successfully subscribed to realtime');
            setIsOnline(true);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(' Realtime subscription error');
            setIsOnline(false);
          } else if (status === 'TIMED_OUT') {
            console.error('️ Realtime subscription timed out');
            setIsOnline(false);
          }
        });

      channelRef.current = channel;
    } catch (error) {
      console.error(' Error setting up realtime:', error);
      setIsOnline(false);
    }
  };

  const sendMessage = async () => {
    const messageText = newMessage.trim();
    if (!messageText) return;

    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      console.log(' Sending message:', {
        from: currentUserId,
        to: otherUserId,
        listing: listingId,
        message: messageText
      });

      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUserId,
          receiver_id: otherUserId as string,
          listing_id: listingId as string,
          message: messageText,
          read: false,
        })
        .select()
        .single();

      if (error) {
        console.error(' Error sending message:', error);
        throw error;
      }

      console.log(' Message sent successfully:', data);
      
      // Clear input
      setNewMessage('');
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error(' Error in sendMessage:', error);
      Alert.alert('Error', error.message || 'Failed to send message');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === currentUserId;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
            ]}
          >
            {item.message}
          </Text>
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
              ]}
            >
              {formatTime(item.created_at)}
            </Text>
            {isOwnMessage && (
              <Ionicons 
                name={item.read ? "checkmark-done" : "checkmark"} 
                size={14} 
                color="rgba(255, 255, 255, 0.7)" 
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading conversation...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>
        <View style={styles.headerInfo}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>{userName || 'User'}</Text>
            {isOnline && (
              <View style={styles.onlineIndicator}>
                <View style={styles.onlineDot} />
              </View>
            )}
          </View>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {listingTitle || 'Property'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
        onLayout={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
            editable={!sending}
            onSubmitEditing={sendMessage}
          />
          <Pressable
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  onlineDot: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '75%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
  },
  ownMessageBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#111827',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageTime: {
    fontSize: 11,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: '#9CA3AF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  inputContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});