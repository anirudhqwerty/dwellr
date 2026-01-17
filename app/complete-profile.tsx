import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function CompleteProfile() {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'owner' | 'seeker' | null>(null);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!name || !role) {
      Alert.alert('Missing info', 'Please fill all required fields');
      return;
    }

    if (role === 'owner' && !phone) {
      Alert.alert('Phone required', 'Owners must add a phone number');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('User not found');

      const { error } = await supabase.from('profiles').insert({
        id: user.id,
        name,
        role,
        phone: role === 'owner' ? phone : null,
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (role === 'owner') {
        router.replace('/owner');
      } else {
        router.replace('/(tabs)');
      }

    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Something went wrong');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        {/* Header Vector */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: 'https://img.icons8.com/clouds/200/user.png' }} 
            style={styles.headerImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>
          Tell us a bit about yourself to get started
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color="#6B7280" style={{ marginRight: 12 }} />
            <TextInput
              placeholder="Enter your name"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>I am a...</Text>
          <View style={styles.roleRow}>
            {/* Seeker Role */}
            <Pressable
              style={[
                styles.roleButton,
                role === 'seeker' && styles.roleSelected,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setRole('seeker');
              }}
            >
              <View style={styles.roleContent}>
                <Image 
                  source={{ uri: 'https://img.icons8.com/clouds/200/map-pin.png' }} 
                  style={styles.roleImage}
                  resizeMode="contain"
                />
                <Text style={[
                  styles.roleText,
                  role === 'seeker' && styles.roleTextSelected
                ]}>
                  Seeker
                </Text>
                <Text style={styles.roleDescription}>
                  Looking for a place
                </Text>
              </View>
            </Pressable>

            {/* Owner Role */}
            <Pressable
              style={[
                styles.roleButton,
                role === 'owner' && styles.roleSelected,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setRole('owner');
              }}
            >
              <View style={styles.roleContent}>
                <Image 
                  source={{ uri: 'https://img.icons8.com/clouds/200/home.png' }} 
                  style={styles.roleImage}
                  resizeMode="contain"
                />
                <Text style={[
                  styles.roleText,
                  role === 'owner' && styles.roleTextSelected
                ]}>
                  Owner
                </Text>
                <Text style={styles.roleDescription}>
                  I have properties
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {role === 'owner' && (
          <View style={[styles.inputContainer, styles.fadeIn]}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color="#6B7280" style={{ marginRight: 12 }} />
              <TextInput
                placeholder="Your contact number"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
            <Text style={styles.helperText}>
              This will be shown to interested seekers
            </Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            pressed && styles.submitButtonPressed,
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <LinearGradient
            colors={['#007AFF', '#0051D5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Continue to Dwellr</Text>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  imageContainer: {
    marginBottom: 20,
    // Add a subtle shadow/glow behind the main vector
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  headerImage: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    height: '100%',
  },
  helperText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 6,
    marginLeft: 4,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  roleSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#007AFF',
  },
  roleContent: {
    alignItems: 'center',
  },
  roleImage: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  roleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  roleTextSelected: {
    color: '#007AFF',
  },
  roleDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  fadeIn: {
    opacity: 1,
  },
  submitButton: {
    height: 56,
    borderRadius: 12,
    marginTop: 16,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 17,
  },
});