import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Image, FlatList, RefreshControl, ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import api, { COLORS } from '../../src/utils/api';

export default function RoomScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const navigation = useNavigation();

  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [gw, setGw] = useState(null);
  const [myMembership, setMyMembership] = useState(null);
  const [winner, setWinner] = useState(null);
  const [pickData, setPickData] = useState(null);
  const [allPicks, setAllPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [tab, setTab] = useState('pick');
  const [refreshing, setRefreshing] = useState(false);

  const isCreator = room?.creator_id === user?.id;

  const load = useCallback(async () => {
    try {
      const [roomData, pd, ap] = await Promise.all([
        api.get(`/rooms/${id}`),
        api.get(`/picks/room/${id}`),
        api.get(`/picks/room/${id}/all-picks`),
      ]);
      setRoom(roomData.room);
      setMembers(roomData.members);
      setGw(roomData.currentGameweek);
      setMyMembership(roomData.myMembership);
      setWinner(roomData.winner);
      setPickData(pd);
      setAllPicks(ap);
      navigation.setOptions({ title: roomData.room.name });
    } catch {
      Alert.alert('Error', 'Could not load room');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function startGame() {
    try {
      await api.post(`/rooms/${id}/start`);
      Alert.alert('🚀', 'Game started! Picks are now open.');
      load();
    } catch (e) { Alert.alert('Error', e.toString()); }
  }

  async function nextWeek() {
    try {
      await api.post(`/rooms/${id}/next-week`);
      Alert.alert('⏭', 'Advanced to next gameweek!');
      load();
    } catch (e) { Alert.alert('Error', e.toString()); }
  }

  async function resolveWeek() {
    setResolving(true);
    try {
      const result = await api.post(`/picks/room/${id}/resolve`, { gameweekId: gw.id });
      Alert.alert('✅', result.winner ? '🏆 We have a winner!' : `Resolved ${result.resolved} picks!`);
      load();
    } catch (e) { Alert.alert('Error', e.toString()); }
    setResolving(false);
  }

  async function makePick(team) {
    Alert.alert(
      `Pick ${team.name}?`,
      'You cannot change this pick after confirming.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Pick', onPress: async () => {
            setPicking(team.id);
            try {
              await api.post(`/picks/room/${id}`, { teamId: team.id, gameweekId: gw.id });
              Alert.alert('⚽', `You picked ${team.name}!`);
              load();
            } catch (e) { Alert.alert('Error', e.toString()); }
            setPicking(false);
          }
        }
      ]
    );
  }

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgPrimary }}>
      <ActivityIndicator color={COLORS.accent} />
    </View>
  );

  const tabs = ['pick', 'players', 'fixtures'];

  return (
    <View style={styles.page}>
      {/* Winner banner */}
      {winner && (
        <View style={styles.winnerBanner}>
          <Text style={styles.winnerText}>🏆 {winner.username} WINS! 🏆</Text>
        </View>
      )}

      {/* Creator controls */}
      {isCreator && room?.status !== 'finished' && (
        <View style={styles.creatorBar}>
          {room?.status === 'waiting' && (
            <TouchableOpacity style={styles.creatorBtn} onPress={startGame}>
              <Text style={styles.creatorBtnText}>🚀 Start Game</Text>
            </TouchableOpacity>
          )}
          {room?.status === 'active' && gw && (
            <>
              <TouchableOpacity style={styles.creatorBtnGhost} onPress={resolveWeek} disabled={resolving}>
                <Text style={styles.creatorBtnGhostText}>{resolving ? '...' : '⚡ Resolve'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.creatorBtnGhost} onPress={nextWeek}>
                <Text style={styles.creatorBtnGhostText}>⏭ Next Week</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* My status */}
      <View style={styles.myStatusBar}>
        <Text style={styles.gwLabel}>{gw ? `Gameweek ${gw.week_number}` : 'Not started'}</Text>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[0, 1].map(i => (
            <View key={i} style={[styles.cardPip,
              i < (myMembership?.cards || 0)
                ? (myMembership?.cards >= 2 ? styles.cardRed : styles.cardYellow)
                : {}
            ]} />
          ))}
        </View>
        <Text style={{ color: myMembership?.status === 'eliminated' ? COLORS.red : myMembership?.status === 'yellow_card' ? COLORS.yellow : COLORS.accent, fontSize: 12, fontWeight: '700' }}>
          {myMembership?.status === 'eliminated' ? 'ELIMINATED' : myMembership?.status === 'yellow_card' ? '⚠ WARNING' : '✅ SAFE'}
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {tabs.map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'pick' ? '⚽ Pick' : t === 'players' ? '👥 Players' : '📅 Fixtures'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.accent} />}
      >
        {tab === 'pick' && <PickTab gw={gw} pickData={pickData} myMembership={myMembership} roomStatus={room?.status} onPick={makePick} picking={picking} allPicks={allPicks} />}
        {tab === 'players' && <PlayersTab members={members} currentUserId={user?.id} />}
        {tab === 'fixtures' && <FixturesTab fixtures={pickData?.fixtures || []} />}
      </ScrollView>
    </View>
  );
}

function PickTab({ gw, pickData, myMembership, roomStatus, onPick, picking, allPicks }) {
  if (roomStatus === 'waiting') return <CenterMsg emoji="⏳" text="Waiting for creator to start." />;
  if (roomStatus === 'finished') return <CenterMsg emoji="🏁" text="Game has finished." />;
  if (myMembership?.status === 'eliminated') return <CenterMsg emoji="🟥" text="You've been eliminated." />;
  if (!gw) return null;

  const currentPick = pickData?.currentPick;
  const used = pickData?.usedTeams || [];
  const available = pickData?.availableTeams || [];

  return (
    <View style={{ gap: 28 }}>
      {/* Current pick */}
      <View>
        <Text style={styles.sectionTitle}>THIS WEEK — GW{gw.week_number}</Text>
        {currentPick ? (
          <View style={styles.currentPickCard}>
            <Text style={styles.pickedLabel}>✅ PICK MADE</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
              {currentPick.team_crest && <Image source={{ uri: currentPick.team_crest }} style={styles.crestMed} />}
              <Text style={styles.pickedTeam}>{currentPick.team_name}</Text>
              {currentPick.result && <ResultChip result={currentPick.result} />}
            </View>
          </View>
        ) : (
          <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>Choose your team below</Text>
        )}
      </View>

      {/* All picks this week */}
      {allPicks.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>ALL PICKS THIS WEEK</Text>
          <View style={{ gap: 8 }}>
            {allPicks.map(p => (
              <View key={p.id} style={styles.playerPickRow}>
                <View style={[styles.playerAvatar, { backgroundColor: p.avatar_color }]}>
                  <Text style={styles.avatarText}>{p.username[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.playerPickName}>{p.username}</Text>
                  <Text style={styles.playerPickTeam}>{p.team_name}</Text>
                </View>
                {p.result && <ResultChip result={p.result} />}
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {[0, 1].map(i => (
                    <View key={i} style={[styles.cardPip, i < p.cards ? (p.cards >= 2 ? styles.cardRed : styles.cardYellow) : {}]} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Team picker */}
      {!currentPick && (
        <View>
          <Text style={styles.sectionTitle}>AVAILABLE TEAMS ({available.length})</Text>
          <View style={styles.teamGrid}>
            {available.map(team => (
              <TouchableOpacity
                key={team.id}
                style={styles.teamCard}
                onPress={() => onPick(team)}
                disabled={!!picking}
              >
                {team.crest_url
                  ? <Image source={{ uri: team.crest_url }} style={styles.crest} />
                  : <View style={styles.crestFallback}><Text style={styles.crestFallbackText}>{team.tla || team.name[0]}</Text></View>
                }
                <Text style={styles.teamName} numberOfLines={2}>{team.name}</Text>
                {picking === team.id && <ActivityIndicator size="small" color={COLORS.accent} style={{ position: 'absolute', top: 8, right: 8 }} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* History */}
      {used.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>YOUR HISTORY</Text>
          <View style={{ gap: 8 }}>
            {used.map(t => (
              <View key={t.team_id} style={styles.historyRow}>
                <Text style={styles.historyGw}>GW{t.week_number}</Text>
                {t.team_crest && <Image source={{ uri: t.team_crest }} style={styles.crestSmall} />}
                <Text style={styles.historyTeam} numberOfLines={1}>{t.team_name}</Text>
                {t.result && <ResultChip result={t.result} />}
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function PlayersTab({ members, currentUserId }) {
  const sorted = [...members].sort((a, b) => a.cards - b.cards);
  return (
    <View style={{ gap: 8 }}>
      {sorted.map((m, i) => (
        <View key={m.user_id} style={[styles.playerRow, m.status === 'eliminated' && { opacity: 0.4 }]}>
          <Text style={styles.rank}>#{i + 1}</Text>
          <View style={[styles.playerAvatar, { backgroundColor: m.avatar_color }]}>
            <Text style={styles.avatarText}>{m.username[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.playerName} numberOfLines={1}>
            {m.username}{m.user_id === currentUserId ? ' (you)' : ''}
          </Text>
          <Text style={{ color: m.status === 'eliminated' ? COLORS.red : m.status === 'yellow_card' ? COLORS.yellow : COLORS.accent, fontSize: 11, fontWeight: '700' }}>
            {m.status === 'eliminated' ? 'OUT' : m.status === 'yellow_card' ? 'WARN' : 'SAFE'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {[0, 1].map(i => (
              <View key={i} style={[styles.cardPip, i < m.cards ? (m.cards >= 2 ? styles.cardRed : styles.cardYellow) : {}]} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function FixturesTab({ fixtures }) {
  if (!fixtures.length) return <CenterMsg emoji="📅" text="No fixtures to show yet." />;
  return (
    <View style={{ gap: 8 }}>
      {fixtures.map(f => {
        const date = new Date(f.match_date);
        const done = f.status === 'FINISHED';
        return (
          <View key={f.external_id} style={[styles.fixture, done && { borderColor: 'rgba(0,255,135,0.15)' }]}>
            <Text style={styles.fixtureDate}>
              {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.fixtureTeam} numberOfLines={1}>{f.home_team}</Text>
              <Text style={styles.fixtureTeam} numberOfLines={1}>{f.away_team}</Text>
            </View>
            <Text style={[styles.fixtureScore, done && { color: COLORS.accent }]}>
              {done ? `${f.home_score}–${f.away_score}` : 'vs'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ResultChip({ result }) {
  const map = { win: [COLORS.accent, 'rgba(0,255,135,0.15)'], draw: [COLORS.textSecondary, 'rgba(122,140,153,0.15)'], loss: [COLORS.red, 'rgba(255,59,59,0.12)'] };
  const [color, bg] = map[result] || [COLORS.textMuted, 'transparent'];
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 }}>
      <Text style={{ color, fontSize: 10, fontWeight: '800' }}>{result.toUpperCase()}</Text>
    </View>
  );
}

function CenterMsg({ emoji, text }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 60 }}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>{emoji}</Text>
      <Text style={{ color: COLORS.textMuted, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bgPrimary },

  winnerBanner: { backgroundColor: '#1a1200', borderBottomWidth: 2, borderBottomColor: COLORS.yellow, padding: 16, alignItems: 'center' },
  winnerText: { color: COLORS.yellow, fontWeight: '900', fontSize: 18, letterSpacing: 1 },

  creatorBar: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: 'rgba(0,255,135,0.05)', borderBottomWidth: 1, borderBottomColor: COLORS.borderActive },
  creatorBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  creatorBtnText: { color: '#080C10', fontWeight: '800', fontSize: 13 },
  creatorBtnGhost: { borderWidth: 1, borderColor: COLORS.borderActive, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  creatorBtnGhostText: { color: COLORS.accent, fontWeight: '700', fontSize: 13 },

  myStatusBar: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 },
  gwLabel: { flex: 1, color: COLORS.textSecondary, fontSize: 13, fontWeight: '700' },
  cardPip: { width: 10, height: 14, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
  cardYellow: { backgroundColor: COLORS.yellow },
  cardRed: { backgroundColor: COLORS.red },

  tabs: { flexDirection: 'row', backgroundColor: COLORS.bgSecondary, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.accent },
  tabText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: COLORS.accent },

  sectionTitle: { fontSize: 12, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },

  currentPickCard: { backgroundColor: COLORS.bgCard, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderActive, padding: 16 },
  pickedLabel: { color: COLORS.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  pickedTeam: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 16, flex: 1 },
  crestMed: { width: 36, height: 36, resizeMode: 'contain' },

  teamGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  teamCard: { width: '30%', backgroundColor: COLORS.bgCard, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', padding: 14, gap: 8 },
  crest: { width: 40, height: 40, resizeMode: 'contain' },
  crestFallback: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.accentDim, alignItems: 'center', justifyContent: 'center' },
  crestFallbackText: { color: COLORS.accent, fontWeight: '900', fontSize: 14 },
  crestSmall: { width: 20, height: 20, resizeMode: 'contain' },
  teamName: { color: COLORS.textPrimary, fontSize: 11, fontWeight: '600', textAlign: 'center' },

  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.bgCard, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  historyGw: { color: COLORS.textMuted, fontWeight: '700', width: 36 },
  historyTeam: { flex: 1, color: COLORS.textPrimary, fontSize: 14 },

  playerPickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.bgCard, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  playerAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#080C10', fontWeight: '800', fontSize: 14 },
  playerPickName: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 14 },
  playerPickTeam: { color: COLORS.textSecondary, fontSize: 12 },

  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.bgCard, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
  rank: { color: COLORS.textMuted, fontWeight: '900', fontSize: 16, width: 30 },
  playerName: { flex: 1, color: COLORS.textPrimary, fontWeight: '600' },

  fixture: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.bgCard, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
  fixtureDate: { color: COLORS.textMuted, fontSize: 12, width: 50 },
  fixtureTeam: { color: COLORS.textPrimary, fontSize: 13 },
  fixtureScore: { color: COLORS.textMuted, fontWeight: '800', fontSize: 16, minWidth: 40, textAlign: 'center' },
});
