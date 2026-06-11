import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/utils/api';

export default function LoginScreen() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const router = useRouter();

  const update = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  async function submit() {
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.email, form.username, form.password);
      }
      router.replace('/dashboard');
    } catch (err) {
      Alert.alert('Error', err.toString());
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo area */}
        <View style={styles.logoArea}>
          <Text style={styles.ball}>⚽</Text>
          <Text style={styles.title}>CHAMPIONSHIP{'\n'}SURVIVOR</Text>
          <Text style={styles.tagline}>EFL CHAMPIONSHIP SURVIVAL GAME</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, mode === 'login' && styles.tabActive]}
              onPress={() => setMode('login')}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'register' && styles.tabActive]}
              onPress={() => setMode('register')}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Register</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                style={styles.input}
                value={form.email}
                onChangeText={update('email')}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {mode === 'register' && (
              <View style={styles.field}>
                <Text style={styles.label}>USERNAME</Text>
                <TextInput
                  style={styles.input}
                  value={form.username}
                  onChangeText={update('username')}
                  placeholder="YourGamertag"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput
                style={styles.input}
                value={form.password}
                onChangeText={update('password')}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
              />
              {mode === 'login' && (
                <TouchableOpacity onPress={() => router.push('/forgot-password')} style={{ alignSelf: 'flex-end', marginTop: 6 }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>Forgot password?</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={submit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#080C10" />
                : <Text style={styles.btnText}>
                    {mode === 'login' ? 'Enter the Game' : 'Join the Game'}
                  </Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footer}>Pick smart. Stay alive. Be the last.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgPrimary },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  logoArea: { alignItems: 'center', marginBottom: 36 },
  ball: { fontSize: 48, marginBottom: 12 },
  title: {
    fontWeight: '900',
    fontSize: 42,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: 1,
  },
  tagline: {
    marginTop: 10,
    fontSize: 10,
    color: COLORS.accent,
    letterSpacing: 3,
    fontWeight: '700',
  },

  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.accent },
  tabText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: COLORS.accent },

  form: { padding: 24, gap: 18 },
  field: { gap: 8 },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 2 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    color: COLORS.textPrimary,
    padding: 14,
    fontSize: 15,
  },

  btn: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#080C10', fontWeight: '800', fontSize: 16 },

  footer: { textAlign: 'center', marginTop: 28, color: COLORS.textMuted, fontSize: 12, fontStyle: 'italic' },
});
