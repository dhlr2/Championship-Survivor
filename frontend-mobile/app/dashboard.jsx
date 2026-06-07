import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, TextInput, Modal, ActivityIndicator, RefreshControl
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import api, { COLORS } from '../src/utils/api';

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(null);
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [saving, setSaving] = useState(false);

  async function fetchRooms() {
    try {
      const data = await api.get('/rooms');
      setRooms(data);
    } catch { Alert.alert('Error', 'Could not load rooms'); }
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { fetchRooms(); }, []);

  // Refresh when navigating back to this screen
  useFocusEffect(useCallback(() => { fetchRooms(); }, []));

  async function createRoom() {
    if (!roomName.trim()) return;
    setSaving(true);
    try {
      const room = await api.post('/rooms', { name: roomName });
      setModal(null);
      setRoomName('');
      router.push(`/room/${room.id}`);
    } catch (e) { Alert.alert('Error', e.toString()); }
    setSaving(false);
  }

  async function joinRoom() {
    if (!joinCode.trim()) return;
    setSaving(true);
    try {
      const data = await api.post('/rooms/join', { code: joinCode });
      setModal(null);
      setJoinCode('');
      router.push(`/room/${data.room.id}`);
    } catch (e) { Alert.alert('Error', e.toString()); }
    setSaving(false);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgPrimary }}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      {/* User bar */}
      <View style={styles.userBar}>
        <View style={[styles.avatar, { backgroundColor: user?.avatar_color }]}>
          <Text style={styles.avatarText}>{user?.username?.[0]?.toUpperCase()}</Text>
        </View>
        <Text style={styles.username}>{user?.username}</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statBar}>
        {[
          { num: rooms.length, label: 'Rooms' },
          { num: rooms.filter(r => r.status === 'active').length, label: 'Live' },
          { num: rooms.filter(r => r.status === 'finished').length, label: 'Done' },
        ].map((s, i) => (
          <View key={i} style={styles.statItem}>
            <Text style={styles.statNum}>{s.num}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setModal('join')}>
          <Text style={styles.actionBtnText}>🔗 Join Room</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => setModal('create')}>
          <Text style={styles.actionBtnPrimaryText}>+ Create Room</Text>
        </TouchableOpacity>
      </View>

      {/* Room list */}
      <FlatList
        data={rooms}
        keyExtractor={r => r.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRooms(); }} tintColor={COLORS.accent} />}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>⚽</Text>
            <Text style={{ color: COLORS.textMuted, textAlign: 'center' }}>No rooms yet.{'\n'}Create or join one!</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.roomCard} onPress={() => router.push(`/room/${item.id}`)}>
            <View style={styles.roomTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.roomName}>{item.name}</Text>
                <Text style={styles.roomCode}>#{item.code}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? 'rgba(0,255,135,0.15)' : item.status === 'finished' ? 'rgba(255,59,59,0.1)' : 'rgba(122,140,153,0.1)' }]}>
                <Text style={{ color: item.status === 'active' ? COLORS.accent : item.status === 'finished' ? COLORS.red : COLORS.textSecondary, fontSize: 11, fontWeight: '700' }}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.roomMeta}>
              <Text style={styles.roomMetaText}>👥 {item.member_count} players</Text>
              {item.current_gameweek && <Text style={styles.roomMetaText}>GW{item.current_gameweek}</Text>}
              <Text style={{ color: item.my_status === 'eliminated' ? COLORS.red : item.my_status === 'yellow_card' ? COLORS.yellow : COLORS.accent, fontSize: 12, fontWeight: '700' }}>
                {item.my_status === 'eliminated' ? '🟥 Out' : item.my_status === 'yellow_card' ? '🟨 Warning' : '✅ Active'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Modals */}
      <Modal visible={modal !== null} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{modal === 'create' ? 'CREATE ROOM' : 'JOIN ROOM'}</Text>
            <Text style={styles.modalSub}>
              {modal === 'create' ? 'Give your room a name' : 'Enter the 6-character code'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={modal === 'create' ? roomName : joinCode}
              onChangeText={modal === 'create' ? setRoomName : setJoinCode}
              placeholder={modal === 'create' ? "e.g. The Lads League" : "AB12CD"}
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize={modal === 'join' ? 'characters' : 'words'}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.modalBtn, saving && { opacity: 0.5 }]}
              onPress={modal === 'create' ? createRoom : joinRoom}
              disabled={saving}
            >
              <Text style={styles.modalBtnText}>{saving ? 'Please wait...' : modal === 'create' ? 'Create' : 'Join'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModal(null)} style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bgPrimary },
  userBar: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10, backgroundColor: COLORS.bgSecondary, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#080C10', fontWeight: '800', fontSize: 16 },
  username: { flex: 1, color: COLORS.textSecondary, fontWeight: '600' },
  logoutBtn: { padding: 8 },
  logoutText: { color: COLORS.textMuted, fontSize: 13 },

  statBar: { flexDirection: 'row', backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  statItem: { flex: 1, alignItems: 'center', padding: 16 },
  statNum: { fontSize: 28, fontWeight: '900', color: COLORS.accent },
  statLabel: { fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },

  actionRow: { flexDirection: 'row', gap: 10, padding: 16 },
  actionBtn: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  actionBtnText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 14 },
  actionBtnPrimary: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  actionBtnPrimaryText: { color: '#080C10', fontWeight: '800', fontSize: 14 },

  roomCard: { backgroundColor: COLORS.bgCard, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 18, gap: 12 },
  roomTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  roomName: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 16 },
  roomCode: { color: COLORS.textMuted, fontSize: 12, fontFamily: 'monospace', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  roomMeta: { flexDirection: 'row', gap: 16 },
  roomMetaText: { color: COLORS.textSecondary, fontSize: 12 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, borderTopWidth: 1, borderColor: COLORS.border },
  modalTitle: { fontSize: 28, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 4 },
  modalSub: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 20 },
  modalInput: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, color: COLORS.textPrimary, padding: 16, fontSize: 16, marginBottom: 16 },
  modalBtn: { backgroundColor: COLORS.accent, borderRadius: 10, padding: 16, alignItems: 'center' },
  modalBtnText: { color: '#080C10', fontWeight: '800', fontSize: 16 },
});
