import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';

interface ListingDetailModalProps {
  visible: boolean;
  listing: any;
  onClose: () => void;
  isOwner: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ListingDetailModal({
  visible,
  listing,
  onClose,
  isOwner,
  onEdit,
  onDelete,
}: ListingDetailModalProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (visible && !isOwner && listing) {
      checkIfSaved();
    }
  }, [visible, listing]);

  const checkIfSaved = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('saved_listings')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', listing.id)
        .single();

      setIsSaved(!!data);
    } catch (error) {
      // Not saved
      setIsSaved(false);
    }
  };

  const toggleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in to save listings');
        return;
      }

      if (isSaved) {
        // Unsave
        const { error } = await supabase
          .from('saved_listings')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listing.id);

        if (error) throw error;

        // Decrement interested count
        await supabase.rpc('decrement_listing_interested', {
          listing_id: listing.id
        });

        setIsSaved(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // Save
        const { error } = await supabase
          .from('saved_listings')
          .insert({
            user_id: user.id,
            listing_id: listing.id,
          });

        if (error) throw error;

        // Increment interested count
        await supabase.rpc('increment_listing_interested', {
          listing_id: listing.id
        });

        setIsSaved(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Saved!', 'This listing has been added to your saved homes');
      }
    } catch (error: any) {
      console.error('Error toggling save:', error);
      Alert.alert('Error', 'Failed to save listing');
    }
  };

  const handleCall = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      // If phone not in listing, fetch it from owner profile
      let phoneNumber = listing?.owner_phone;
      
      if (!phoneNumber) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', listing.owner_id)
          .single();
        
        phoneNumber = ownerProfile?.phone;
      }
      
      if (!phoneNumber) {
        Alert.alert('No Phone', 'Owner has not provided a phone number');
        return;
      }

      const phoneUrl = `tel:${phoneNumber}`;
      Linking.openURL(phoneUrl).catch(() => {
        Alert.alert('Error', 'Unable to make call');
      });
    } catch (error) {
      console.error('Error getting phone:', error);
      Alert.alert('Error', 'Failed to get owner phone number');
    }
  };

  const handleMessage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in to contact owners');
        return;
      }

      // Close modal first
      onClose();
      
      // Small delay to ensure modal closes before navigation
      setTimeout(() => {
        router.push({
          pathname: '/seeker/conversation/[id]',
          params: {
            id: listing.owner_id,
            listingId: listing.id,
            userName: listing.owner_name || 'Owner',
            listingTitle: listing.title,
          },
        });
      }, 100);
    } catch (error) {
      console.error('Error starting conversation:', error);
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this listing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (onDelete) onDelete();
            onClose();
          },
        },
      ]
    );
  };

  if (!listing) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#111827" />
          </Pressable>
          {!isOwner && (
            <Pressable onPress={toggleSave} style={styles.saveButton}>
              <Ionicons
                name={isSaved ? "heart" : "heart-outline"}
                size={28}
                color={isSaved ? "#DC2626" : "#111827"}
              />
            </Pressable>
          )}
        </View>

        <ScrollView style={styles.scrollView}>
          {listing.images && listing.images.length > 0 && (
            <View style={styles.imageContainer}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const index = Math.floor(
                    event.nativeEvent.contentOffset.x /
                    event.nativeEvent.layoutMeasurement.width
                  );
                  setCurrentImageIndex(index);
                }}
              >
                {listing.images.map((image: string, index: number) => (
                  <Image
                    key={index}
                    source={{ uri: image }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              {listing.images.length > 1 && (
                <View style={styles.pagination}>
                  {listing.images.map((_: any, index: number) => (
                    <View
                      key={index}
                      style={[
                        styles.paginationDot,
                        index === currentImageIndex && styles.paginationDotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.content}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{listing.title}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{listing.status?.toUpperCase()}</Text>
              </View>
            </View>

            <Text style={styles.price}>₹{listing.rent?.toLocaleString()}/month</Text>

            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color="#6B7280" />
              <Text style={styles.address}>{listing.address}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{listing.description}</Text>
            </View>

            {!isOwner && listing.owner_name && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Owner</Text>
                <View style={styles.ownerCard}>
                  <View style={styles.ownerAvatar}>
                    <Ionicons name="person" size={24} color="#007AFF" />
                  </View>
                  <View style={styles.ownerInfo}>
                    <Text style={styles.ownerName}>{listing.owner_name}</Text>
                    {listing.owner_phone && (
                      <Text style={styles.ownerPhone}>{listing.owner_phone}</Text>
                    )}
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {!isOwner ? (
          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.callButton,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={handleCall}
            >
              <Ionicons name="call" size={20} color="#FFFFFF" />
              <Text style={styles.callButtonText}>Call Owner</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.messageButton,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={handleMessage}
            >
              <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
              <Text style={styles.messageButtonText}>Message</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.editButton,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={onEdit}
            >
              <Ionicons name="create" size={20} color="#007AFF" />
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.deleteButton,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={handleDelete}
            >
              <Ionicons name="trash" size={20} color="#DC2626" />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  saveButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: 400,
    height: 300,
    backgroundColor: '#F3F4F6',
  },
  pagination: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  content: {
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
    color: '#007AFF',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 24,
  },
  address: {
    flex: 1,
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  ownerPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  actionButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  callButton: {
    backgroundColor: '#10B981',
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  messageButton: {
    backgroundColor: '#007AFF',
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  editButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '700',
  },
});