import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ListingDetailModal from '../../components/ListingDetailModal';

export default function MyListings() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setListings(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openListingDetail = (listing: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedListing(listing);
    setModalVisible(true);
  };

  const handleEditListing = () => {
    // TODO: Navigate to edit screen
    Alert.alert('Edit Listing', 'Edit functionality coming soon!');
  };

  const handleDeleteListing = async () => {
    if (!selectedListing) return;

    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', selectedListing.id);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Listing deleted successfully');
      fetchListings();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete listing');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={() => openListingDetail(item)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? '#DCFCE7' : '#F3F4F6' }]}>
          <Text style={[styles.statusText, { color: item.status === 'active' ? '#166534' : '#374151' }]}>
            {item.status?.toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.row}>
        <Ionicons name="location-outline" size={16} color="#6B7280" />
        <Text style={styles.address}>{item.address}</Text>
      </View>
      <Text style={styles.price}>₹{item.rent}/month</Text>
      <View style={styles.tapHint}>
        <Text style={styles.tapHintText}>Tap for details</Text>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </View>
    </Pressable>
  );

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>My Listings</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#007AFF" />
        ) : (
          <FlatList
            data={listings}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="home-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No listings found</Text>
                <Text style={styles.emptySubtitle}>Create your first listing to get started</Text>
              </View>
            }
          />
        )}
      </View>

      <ListingDetailModal
        visible={modalVisible}
        listing={selectedListing}
        onClose={() => setModalVisible(false)}
        isOwner={true}
        onEdit={handleEditListing}
        onDelete={handleDeleteListing}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingTop: 60, 
    paddingHorizontal: 20, 
    paddingBottom: 15, 
    backgroundColor: '#FFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB' 
  },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  list: { padding: 20 },
  card: { 
    backgroundColor: '#FFF', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#E5E7EB' 
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 4 },
  address: { color: '#6B7280', fontSize: 14, flex: 1 },
  price: { fontSize: 18, fontWeight: '700', color: '#007AFF', marginBottom: 8 },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  tapHintText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  empty: { 
    alignItems: 'center', 
    marginTop: 50,
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});