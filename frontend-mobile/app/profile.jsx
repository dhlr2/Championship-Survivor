import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import api, { COLORS } from '../src/utils/api';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const update = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit() {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (form.newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      Alert.alert('✅', 'Password updated successfully!');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      Alert.alert('Error', err.toString());
    } finally {
      setLoading(false);
    }
  }

  function confirmLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout }
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.bgPrimary }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: user?.avatar_color }]}>
            <Text style={styles.avatarText}>{user?.username?.[0]?.toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.username}>{user?.username}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        {/* Change password */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CHANGE PASSWORD</Text>

          <View style={styles.field}>
            <Text style={styles.label}>CURRENT PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={form.currentPassword}
              onChangeText={update('currentPassword')}
              placeholder="Your current password"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>NEW PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={form.newPassword}
              onChangeText={update('newPassword')}
              placeholder="Min 6 characters"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={form.confirmPassword}
              onChangeText={update('confirmPassword')}
              placeholder="Repeat new password"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? 'Updating...' : 'Update Password'}</Text>
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={confirmLogout}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 20 },

  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: COLORS.bgCard, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 20 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#080C10', fontWeight: '900', fontSize: 22 },
  username: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 18 },
  email: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },

  section: { backgroundColor: COLORS.bgCard, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 20, gap: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 2, textTransform: 'uppercase' },

  field: { gap: 8 },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 2 },
  input: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, color: COLORS.textPrimary, padding: 14, fontSize: 15 },

  btn: { backgroundColor: COLORS.accent, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#080C10', fontWeight: '800', fontSize: 16 },

  signOutBtn: { borderWidth: 1, borderColor: 'rgba(255,59,59,0.3)', borderRadius: 10, padding: 16, alignItems: 'center' },
  signOutText: { color: COLORS.red, fontWeight: '700', fontSize: 16 },
});
