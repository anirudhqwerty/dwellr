import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Analytics() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Total Views</Text>
          <Text style={styles.bigNumber}>124</Text>
          <Text style={styles.subtext}>+12% from last month</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Listing Interactions</Text>
          <Text style={styles.bigNumber}>45</Text>
          <Text style={styles.subtext}>Calls and messages</Text>
        </View>
        
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
          <Text style={styles.infoText}>
            Detailed analytics will be available once your listings get more traction.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  cardTitle: { fontSize: 16, color: '#6B7280', marginBottom: 8 },
  bigNumber: { fontSize: 48, fontWeight: '800', color: '#111827', marginBottom: 4 },
  subtext: { color: '#166534', fontWeight: '600', fontSize: 14 },
  infoBox: { flexDirection: 'row', backgroundColor: '#EFF6FF', padding: 16, borderRadius: 12, alignItems: 'center', gap: 12 },
  infoText: { flex: 1, color: '#1E40AF', fontSize: 14, lineHeight: 20 },
});