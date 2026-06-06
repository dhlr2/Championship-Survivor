import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import styles from './Room.module.css';

export default function RoomPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

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
  const [tab, setTab] = useState('pick'); // 'pick' | 'players' | 'fixtures'

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
    } catch (e) {
      toast.error('Could not load room');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function startGame() {
    try {
      await api.post(`/rooms/${id}/start`);
      toast.success('Game started! Picks are open.');
      load();
    } catch (err) { toast.error(err.toString()); }
  }

  async function nextWeek() {
    try {
      await api.post(`/rooms/${id}/next-week`);
      toast.success('Advanced to next gameweek!');
      load();
    } catch (err) { toast.error(err.toString()); }
  }

  async function endGame() {
    if (!window.confirm('Are you sure you want to end the game? This cannot be undone.')) return;
    try {
      await api.post(`/rooms/${id}/end`);
      toast.success('Game ended!');
      load();
    } catch (err) { toast.error(err.toString()); }
  }

  async function resolveWeek() {
    setResolving(true);
    try {
      const result = await api.post(`/picks/room/${id}/resolve`, { gameweekId: gw.id });
      if (result.winner) {
        toast.success('🏆 We have a winner!');
      } else if (result.resolved === 0) {
        toast('No finished matches to resolve yet', { icon: '⏳' });
      } else {
        toast.success(`Resolved ${result.resolved} picks!`);
      }
      load();
    } catch (err) { toast.error(err.toString()); }
    setResolving(false);
  }

  async function makePick(team) {
    if (!gw) return;
    setPicking(team.id);
    try {
      await api.post(`/picks/room/${id}`, { teamId: team.id, gameweekId: gw.id });
      toast.success(`Picked ${team.name}! ⚽`);
      load();
    } catch (err) { toast.error(err.toString()); }
    setPicking(false);
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate('/dashboard')}>← Back</button>
        <div className={styles.headerCenter}>
          <h1 className={`display-font ${styles.roomName}`}>{room?.name}</h1>
          <div className={styles.headerMeta}>
            <span className={`badge badge-${room?.status}`}>{room?.status}</span>
            <span className={styles.code}>#{room?.code}</span>
            {gw && <span className={styles.gwBadge}>Gameweek {gw.week_number}</span>}
          </div>
        </div>
        <div className={styles.headerRight}>
          <MyCardsBadge membership={myMembership} />
        </div>
      </header>

      {/* Winner banner */}
      {winner && (
        <div className={styles.winnerBanner}>
          <span className={styles.winnerTrophy}>🏆</span>
          <div>
            <div className={`display-font ${styles.winnerTitle}`}>LAST MAN STANDING</div>
            <div className={styles.winnerName}>{winner.username} wins the game!</div>
          </div>
          <span className={styles.winnerTrophy}>🏆</span>
        </div>
      )}

      {/* Creator controls */}
      {isCreator && (
        <div className={styles.creatorBar}>
          <span className={styles.creatorLabel}>👑 Creator Controls</span>
          {room.status === 'waiting' && (
            <button className="btn btn-primary" onClick={startGame}>
              🚀 Start Game
            </button>
          )}
          {room.status !== 'finished' && (
            <button className="btn btn-danger" onClick={endGame} style={{marginLeft:'auto'}}>
              🏁 End Game
            </button>
          )}
          {room.status === 'active' && gw && (
            <>
              <button className="btn btn-ghost" onClick={resolveWeek} disabled={resolving}>
                {resolving ? 'Resolving...' : '⚡ Resolve Results'}
              </button>
              <button className="btn btn-ghost" onClick={nextWeek}>
                ⏭ Next Gameweek
              </button>
            </>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        {['pick', 'players', 'fixtures'].map(t => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.active : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'pick' && '⚽ '}
            {t === 'players' && '👥 '}
            {t === 'fixtures' && '📅 '}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <main className={styles.main}>
        {tab === 'pick' && (
          <PickTab
            gw={gw}
            pickData={pickData}
            myMembership={myMembership}
            roomStatus={room?.status}
            onPick={makePick}
            picking={picking}
            allPicks={allPicks}
          />
        )}
        {tab === 'players' && (
          <PlayersTab members={members} currentUserId={user?.id} />
        )}
        {tab === 'fixtures' && (
          <FixturesTab fixtures={pickData?.fixtures || []} />
        )}
      </main>
    </div>
  );
}

// ─── TAB: PICK ──────────────────────────────────────────────────────────────
function PickTab({ gw, pickData, myMembership, roomStatus, onPick, picking, allPicks }) {
  if (roomStatus === 'waiting') {
    return (
      <div className={styles.centeredMsg}>
        <span className={styles.bigEmoji}>⏳</span>
        <p>Waiting for the creator to start the game.</p>
      </div>
    );
  }
  if (roomStatus === 'finished') {
    return (
      <div className={styles.centeredMsg}>
        <span className={styles.bigEmoji}>🏁</span>
        <p>This game has finished.</p>
      </div>
    );
  }
  const isEliminated = myMembership?.status === 'eliminated';
  if (!gw) return null;

  const currentPick = pickData?.currentPick;
  const used = pickData?.usedTeams || [];
  const available = pickData?.availableTeams || [];

  return (
    <div className={styles.pickContainer}>
      {/* Eliminated banner */}
      {isEliminated && (
        <div className={styles.eliminatedBanner}>
          <span>🟥</span>
          <span>You have been eliminated. You can still watch the game but cannot make picks.</span>
        </div>
      )}

      {/* Current pick this week */}
      <section className={styles.section}>
        <h2 className={`display-font ${styles.sectionTitle}`}>
          THIS WEEK — GW{gw.week_number}
        </h2>
        {currentPick ? (
          <div className={styles.currentPick}>
            <div className={styles.pickedBadge}>✅ Pick Made</div>
            <TeamPill team={currentPick} result={currentPick.result} large />
            {currentPick.result && (
              <ResultChip result={currentPick.result} />
            )}
          </div>
        ) : !isEliminated ? (
          <p className={styles.hint}>Choose your team for this gameweek below.</p>
        ) : null}
      </section>

      {/* This week's picks by others */}
      {allPicks.length > 0 && (
        <section className={styles.section}>
          <h2 className={`display-font ${styles.sectionTitle}`}>ALL PICKS THIS WEEK</h2>
          <div className={styles.allPicksGrid}>
            {allPicks.map(p => (
              <div key={p.id} className={styles.playerPick}>
                <div className={styles.playerPickAvatar} style={{ background: p.avatar_color }}>
                  {p.username[0].toUpperCase()}
                </div>
                <div className={styles.playerPickInfo}>
                  <span className={styles.playerPickName}>{p.username}</span>
                  <span className={styles.playerPickTeam}>{p.team_name}</span>
                </div>
                {p.result && <ResultChip result={p.result} small />}
                <CardIndicator cards={p.cards} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Team picker */}
      {!currentPick && !isEliminated && (
        <section className={styles.section}>
          <h2 className={`display-font ${styles.sectionTitle}`}>
            AVAILABLE TEAMS ({available.length})
          </h2>
          <div className={styles.teamGrid}>
            {available.map(team => (
              <TeamPickCard
                key={team.id}
                team={team}
                onPick={onPick}
                loading={picking === team.id}
                disabled={!!picking}
              />
            ))}
          </div>
          {available.length === 0 && (
            <p className={styles.hint}>You've used all available teams! 🎯</p>
          )}
        </section>
      )}

      {/* Used teams history */}
      {used.length > 0 && (
        <section className={styles.section}>
          <h2 className={`display-font ${styles.sectionTitle}`}>YOUR HISTORY</h2>
          <div className={styles.historyList}>
            {used.map(t => (
              <div key={t.team_id} className={styles.historyItem}>
                <span className={styles.historyGw}>GW{t.week_number}</span>
                {t.team_crest && (
                  <img src={t.team_crest} alt="" className={styles.crestSmall} />
                )}
                <span className={styles.historyTeam}>{t.team_name}</span>
                {t.result && <ResultChip result={t.result} small />}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── TAB: PLAYERS ──────────────────────────────────────────────────────────
function PlayersTab({ members, currentUserId }) {
  const sorted = [...members].sort((a, b) => a.cards - b.cards);
  return (
    <div className={styles.playersList}>
      {sorted.map((m, i) => (
        <div key={m.user_id} className={`${styles.playerRow} ${m.status === 'eliminated' ? styles.playerEliminated : ''}`}>
          <span className={styles.rank}>#{i + 1}</span>
          <div className={styles.playerAvatar} style={{ background: m.avatar_color }}>
            {m.username[0].toUpperCase()}
          </div>
          <span className={styles.playerName}>
            {m.username}{m.user_id === currentUserId && ' (you)'}
          </span>
          <div className={styles.playerStatus}>
            {m.status === 'eliminated' && <span className={styles.redText}>Eliminated</span>}
            {m.status === 'yellow_card' && <span className={styles.yellowText}>⚠ Warning</span>}
            {m.status === 'active' && <span className={styles.greenText}>Active</span>}
          </div>
          <div className={styles.cardSlots}>
            {[0, 1].map(i => (
              <div key={i} className={`${styles.cardSlot} ${
                i < m.cards ? (m.cards >= 2 ? styles.cardRed : styles.cardYellow) : ''
              }`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── TAB: FIXTURES ──────────────────────────────────────────────────────────
function FixturesTab({ fixtures }) {
  if (!fixtures.length) return (
    <div className={styles.centeredMsg}>
      <span className={styles.bigEmoji}>📅</span>
      <p>Fixtures will appear once the gameweek starts.</p>
    </div>
  );

  return (
    <div className={styles.fixtureList}>
      {fixtures.map(f => {
        const date = new Date(f.match_date);
        const done = f.status === 'FINISHED';
        return (
          <div key={f.external_id} className={`${styles.fixture} ${done ? styles.fixtureDone : ''}`}>
            <div className={styles.fixtureDate}>
              {date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              <span className={styles.fixtureTime}>
                {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className={styles.fixtureTeams}>
              <span className={styles.fixtureTeam}>{f.home_team}</span>
              <div className={styles.fixtureScore}>
                {done
                  ? <span className={styles.scoreResult}>{f.home_score} – {f.away_score}</span>
                  : <span className={styles.scoreVs}>vs</span>
                }
              </div>
              <span className={`${styles.fixtureTeam} ${styles.right}`}>{f.away_team}</span>
            </div>
            <div className={styles.fixtureStatus}>
              <span className={done ? styles.statusDone : styles.statusScheduled}>
                {done ? 'FT' : f.status === 'IN_PLAY' ? '🔴 LIVE' : '—'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── SMALL COMPONENTS ───────────────────────────────────────────────────────
function TeamPickCard({ team, onPick, loading, disabled }) {
  return (
    <button
      className={styles.teamCard}
      onClick={() => onPick(team)}
      disabled={disabled}
    >
      {team.crest_url ? (
        <img src={team.crest_url} alt={team.name} className={styles.crest} />
      ) : (
        <div className={styles.crestFallback}>{team.tla || team.name[0]}</div>
      )}
      <span className={styles.teamName}>{team.name}</span>
      {loading && <span className={styles.pickingSpinner}>⚽</span>}
    </button>
  );
}

function TeamPill({ team, result, large }) {
  return (
    <div className={`${styles.teamPill} ${large ? styles.teamPillLarge : ''}`}>
      {team.team_crest && <img src={team.team_crest} alt="" className={styles.crestTiny} />}
      <span>{team.team_name || team.name}</span>
    </div>
  );
}

function ResultChip({ result, small }) {
  const map = { win: { label: 'WIN', cls: styles.win }, draw: { label: 'DRAW', cls: styles.draw }, loss: { label: 'LOSS', cls: styles.loss } };
  const r = map[result];
  if (!r) return null;
  return <span className={`${styles.resultChip} ${r.cls} ${small ? styles.small : ''}`}>{r.label}</span>;
}

function CardIndicator({ cards }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[0, 1].map(i => (
        <div
          key={i}
          style={{
            width: 8, height: 12, borderRadius: 2,
            background: i < cards ? (cards >= 2 ? 'var(--red)' : 'var(--yellow)') : 'rgba(255,255,255,0.1)'
          }}
        />
      ))}
    </div>
  );
}

function MyCardsBadge({ membership }) {
  if (!membership) return null;
  return (
    <div className={styles.myBadge}>
      <CardIndicator cards={membership.cards} />
      <span className={styles.myBadgeLabel}>
        {membership.status === 'eliminated' ? '🟥 Out' : membership.status === 'yellow_card' ? '⚠️ Warning' : '✅ Safe'}
      </span>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
      Loading room...
    </div>
  );
}
