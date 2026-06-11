import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import api, { COLORS } from '../src/utils/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  async function submit() {
    if (!email) { Alert.alert('Error', 'Please enter your email'); return; }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      Alert.alert('Error', err.toString());
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoArea}>
          <Text style={styles.ball}>⚽</Text>
          <Text style={styles.title}>CHAMPIONSHIP{'\n'}SURVIVOR</Text>
        </View>

        <View style={styles.card}>
          {sent ? (
            <View style={styles.sentContainer}>
              <Text style={styles.sentEmoji}>📧</Text>
              <Text style={styles.sentTitle}>CHECK YOUR EMAIL</Text>
              <Text style={styles.sentText}>
                If an account exists for {email}, we've sent a password reset link. Check your inbox and spam folder.
              </Text>
              <Text style={styles.sentSub}>The link expires in 1 hour.</Text>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.heading}>FORGOT PASSWORD</Text>
              <Text style={styles.sub}>Enter your email and we'll send you a reset link.</Text>

              <View style={styles.field}>
                <Text style={styles.label}>EMAIL</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && { opacity: 0.5 }]}
                onPress={submit}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#080C10" />
                  : <Text style={styles.btnText}>Send Reset Link</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, alignItems: 'center' }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>← Back to Sign In</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgPrimary },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  logoArea: { alignItems: 'center', marginBottom: 32 },
  ball: { fontSize: 40, marginBottom: 10 },
  title: { fontWeight: '900', fontSize: 36, color: COLORS.textPrimary, textAlign: 'center', lineHeight: 36, letterSpacing: 1 },

  card: { backgroundColor: COLORS.bgCard, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },

  form: { padding: 24, gap: 18 },
  heading: { fontSize: 22, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 1 },
  sub: { color: COLORS.textSecondary, fontSize: 14 },

  field: { gap: 8 },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 2 },
  input: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, color: COLORS.textPrimary, padding: 14, fontSize: 15 },

  btn: { backgroundColor: COLORS.accent, borderRadius: 10, padding: 16, alignItems: 'center' },
  btnText: { color: '#080C10', fontWeight: '800', fontSize: 16 },

  sentContainer: { padding: 28, alignItems: 'center', gap: 12 },
  sentEmoji: { fontSize: 48 },
  sentTitle: { fontSize: 20, fontWeight: '900', color: COLORS.accent, letterSpacing: 1 },
  sentText: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  sentSub: { color: COLORS.textMuted, fontSize: 12 },
});
