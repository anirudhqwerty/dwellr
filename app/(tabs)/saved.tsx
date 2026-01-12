import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';

export default function SavedScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved Homes</Text>
        <Text style={styles.subtitle}>Your favorite listings</Text>
      </View>

      <View style={styles.emptyState}>
        <Image
          source={{ uri: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f494.svg' }}
          style={styles.emptyIcon}
        />
        <Text style={styles.emptyTitle}>No saved homes yet</Text>
        <Text style={styles.emptySubtitle}>
          When you find a home you like, tap the heart icon to save it here
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    marginBottom: 24,
    opacity: 0.8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});