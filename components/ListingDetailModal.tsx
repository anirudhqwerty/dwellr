import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const { width } = Dimensions.get('window');

interface ListingDetailModalProps {
  visible: boolean;
  listing: any;
  onClose: () => void;
  isOwner?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onContact?: () => void;
}

export default function ListingDetailModal({
  visible,
  listing,
  onClose,
  isOwner = false,
  onEdit,
  onDelete,
  onContact,
}: ListingDetailModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

  if (!listing) return null;

  const images = listing.images || [];
  const hasImages = images.length > 0;

  const openInMaps = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = `https://www.google.com/maps/search/?api=1&query=${listing.latitude},${listing.longitude}`;
    Linking.openURL(url);
  };

  const handleCall = () => {
    if (listing.owner_phone) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Linking.openURL(`tel:${listing.owner_phone}`);
    } else {
      Alert.alert('No Phone Number', 'Owner phone number not available');
    }
  };

  const handleMessage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onContact?.();
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEdit?.();
    onClose();
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this listing? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete?.();
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>Listing Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Image Gallery */}
          {hasImages && (
            <View style={styles.imageSection}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={(e) => {
                  const index = Math.round(
                    e.nativeEvent.contentOffset.x / width
                  );
                  setCurrentImageIndex(index);
                }}
                scrollEventThrottle={16}
              >
                {images.map((imageUrl: string, index: number) => (
                  <Image
                    key={index}
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              
              {/* Image Indicator */}
              <View style={styles.imageIndicator}>
                <Text style={styles.imageIndicatorText}>
                  {currentImageIndex + 1} / {images.length}
                </Text>
              </View>

              {/* Dots Indicator */}
              <View style={styles.dotsContainer}>
                {images.map((_: any, index: number) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      currentImageIndex === index && styles.activeDot,
                    ]}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Title and Status */}
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{listing.title}</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      listing.status === 'active' ? '#DCFCE7' : '#F3F4F6',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        listing.status === 'active' ? '#166534' : '#374151',
                    },
                  ]}
                >
                  {listing.status?.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Price */}
            <View style={styles.priceContainer}>
              <Text style={styles.price}>₹{listing.rent?.toLocaleString()}</Text>
              <Text style={styles.priceLabel}>/month</Text>
            </View>
          </View>

          {/* Details Grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailCard}>
              <Ionicons name="location" size={24} color="#007AFF" />
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue} numberOfLines={2}>
                {listing.address}
              </Text>
            </View>

            <View style={styles.detailCard}>
              <Ionicons name="calendar" size={24} color="#007AFF" />
              <Text style={styles.detailLabel}>Posted</Text>
              <Text style={styles.detailValue}>
                {new Date(listing.created_at).toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.detailCard}>
              <Ionicons name="eye" size={24} color="#007AFF" />
              <Text style={styles.detailLabel}>Views</Text>
              <Text style={styles.detailValue}>0</Text>
            </View>

            <View style={styles.detailCard}>
              <Ionicons name="heart" size={24} color="#007AFF" />
              <Text style={styles.detailLabel}>Interested</Text>
              <Text style={styles.detailValue}>0</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{listing.description}</Text>
          </View>

          {/* Location Map */}
          {listing.latitude && listing.longitude && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Location</Text>
                <Pressable onPress={openInMaps} style={styles.mapButton}>
                  <Ionicons name="navigate" size={16} color="#007AFF" />
                  <Text style={styles.mapButtonText}>Open in Maps</Text>
                </Pressable>
              </View>
              <View style={styles.mapContainer}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude: listing.latitude,
                    longitude: listing.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  <Marker
                    coordinate={{
                      latitude: listing.latitude,
                      longitude: listing.longitude,
                    }}
                  >
                    <Ionicons name="location-sharp" size={40} color="#EA4335" />
                  </Marker>
                </MapView>
              </View>
            </View>
          )}

          {/* Owner Actions */}
          {isOwner && (
            <View style={styles.ownerActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.editButton,
                  pressed && styles.actionButtonPressed,
                ]}
                onPress={handleEdit}
              >
                <Ionicons name="create-outline" size={20} color="#007AFF" />
                <Text style={styles.editButtonText}>Edit Listing</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.deleteButton,
                  pressed && styles.actionButtonPressed,
                ]}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={20} color="#DC2626" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            </View>
          )}

          {/* Seeker Actions */}
          {!isOwner && (
            <View style={styles.seekerActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.contactButton,
                  styles.callButton,
                  pressed && styles.actionButtonPressed,
                ]}
                onPress={handleCall}
              >
                <Ionicons name="call" size={20} color="#FFFFFF" />
                <Text style={styles.contactButtonText}>Call Owner</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.contactButton,
                  styles.messageButton,
                  pressed && styles.actionButtonPressed,
                ]}
                onPress={handleMessage}
              >
                <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
                <Text style={styles.contactButtonText}>Message</Text>
              </Pressable>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  imageSection: {
    position: 'relative',
  },
  image: {
    width: width,
    height: 300,
    backgroundColor: '#E5E7EB',
  },
  imageIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  imageIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeDot: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  titleSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 32,
    fontWeight: '800',
    color: '#007AFF',
  },
  priceLabel: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 4,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  detailCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  section: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mapButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  map: {
    flex: 1,
  },
  ownerActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  editButton: {
    backgroundColor: '#EFF6FF',
    borderColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
  },
  actionButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.8,
  },
  seekerActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  callButton: {
    backgroundColor: '#10B981',
  },
  messageButton: {
    backgroundColor: '#007AFF',
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});