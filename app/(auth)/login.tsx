import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  Alert, 
  StyleSheet, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Dimensions
} from 'react-native';
import { supabase } from '../../lib/supabase';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
// 1. Import the icon library
import { Ionicons } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const triggerHaptic = async (style = 'medium') => {
    if (style === 'light') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const checkUserAndNavigate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user found');

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        router.replace('/complete-profile');
        return;
      }

      if (profile.role === 'owner') {
        router.replace('/owner'); 
      } else if (profile.role === 'seeker') {
        router.replace('/(tabs)');
      } else {
        router.replace('/complete-profile');
      }
    } catch (error) {
      console.error('Navigation check failed:', error);
      router.replace('/complete-profile');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      triggerHaptic('medium');

      const redirectUrl = makeRedirectUri({
        scheme: 'dwellr',
      });

      console.log('redirect url is', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url, 
          redirectUrl
        );

        if (result.type === 'success' && result.url) {
          const url = result.url;
          let params;
          
          if (url.includes('#')) {
            const hashFragment = url.split('#')[1];
            params = new URLSearchParams(hashFragment);
          } else if (url.includes('?')) {
            const queryString = url.split('?')[1];
            params = new URLSearchParams(queryString);
          } else {
            throw new Error('no authentication parameters found');
          }

          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (sessionError) throw sessionError;
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await checkUserAndNavigate();
          } else {
            throw new Error('no tokens received from google');
          }
        }
      }
    } catch (error) {
      console.error('google sign in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      if (errorMessage !== 'User cancelled the auth session') {
        Alert.alert('Google Sign-In Error', errorMessage);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(false);
    }
  };

  async function handleEmailAuth() {
    triggerHaptic('medium');
    
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        if (data.session) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await checkUserAndNavigate();
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (error) throw error;
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Check your email to verify your account.');
        setIsLogin(true);
      }
    } catch (error) {
      console.error('email auth failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.illustrationContainer}>
            {/* 2. Changed Logo to Vector */}
            <Ionicons name="home" size={48} color="#007AFF" />
          </View>
          
          <Text style={styles.title}>Dwellr</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Find your perfect home' : 'Start your housing journey'}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              {/* 3. Changed Email Icon to Vector */}
              <Ionicons 
                name="mail-outline" 
                size={20} 
                color="#6B7280" 
                style={styles.vectorIcon} 
              />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              {/* 4. Changed Password Icon to Vector */}
              <Ionicons 
                name="lock-closed-outline" 
                size={20} 
                color="#6B7280" 
                style={styles.vectorIcon} 
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />
            </View>
          </View>

          <Pressable 
            onPress={handleEmailAuth} 
            disabled={loading}
            style={({ pressed }) => [
              styles.button,
              pressed && !loading && styles.buttonPressed,
              loading && styles.buttonDisabled
            ]}
          >
            <LinearGradient
              colors={['#007AFF', '#0051D5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {isLogin ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </LinearGradient>
          </Pressable>
          
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable 
            onPress={handleGoogleLogin} 
            disabled={loading}
            style={({ pressed }) => [
              styles.googleButton,
              pressed && !loading && styles.googleButtonPressed,
              loading && styles.buttonDisabled
            ]}
          >
            {/* Kept Google Logo as Image (Standard Practice) */}
            <Image 
              source={{ uri: 'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png' }} 
              style={styles.googleIcon} 
            />
            <Text style={styles.googleButtonText}>
              Continue with Google
            </Text>
          </Pressable>

          <Pressable 
            onPress={() => {
              if (!loading) {
                triggerHaptic('light');
                setIsLogin(!isLogin);
              }
            }} 
            style={styles.switchButton}
            disabled={loading}
          >
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <Text style={styles.switchTextBold}>
                {isLogin ? "Sign Up" : "Sign In"}
              </Text>
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Dwellr v1.0.0</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 60,
  },
  
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  illustrationContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  // Removed image-specific style, logic handled by Icon size props
  
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  
  form: {
    width: '100%',
  },
  
  inputContainer: {
    marginBottom: 20,
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
  vectorIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    height: '100%',
  },
  
  button: {
    height: 56,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },

  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonPressed: {
    backgroundColor: '#F9FAFB',
  },
  googleIcon: {
    width: 24,
    height: 24,
  },
  googleButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },

  switchButton: {
    marginTop: 24,
    alignItems: 'center',
    padding: 12,
  },
  switchText: {
    color: '#6B7280',
    fontSize: 15,
  },
  switchTextBold: {
    color: '#007AFF',
    fontWeight: '700',
  },

  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});