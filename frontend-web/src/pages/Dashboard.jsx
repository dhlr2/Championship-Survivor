import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'create' | 'join'
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRooms();
    // Refresh when user returns to this tab/page
    window.addEventListener('focus', fetchRooms);
    return () => window.removeEventListener('focus', fetchRooms);
  }, []);

  async function fetchRooms() {
    try {
      const data = await api.get('/rooms');
      setRooms(data);
    } catch (e) {
      toast.error('Could not load rooms');
    } finally {
      setLoading(false);
    }
  }

  async function createRoom(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const room = await api.post('/rooms', { name: roomName });
      toast.success('Room created!');
      setModal(null);
      setRoomName('');
      navigate(`/room/${room.id}`);
    } catch (err) {
      toast.error(err.toString());
    } finally {
      setSaving(false);
    }
  }

  async function joinRoom(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api.post('/rooms/join', { code: joinCode });
      toast.success(`Joined ${data.room.name}!`);
      setModal(null);
      setJoinCode('');
      navigate(`/room/${data.room.id}`);
    } catch (err) {
      toast.error(err.toString());
    } finally {
      setSaving(false);
    }
  }

  const statusLabel = { waiting: 'Waiting', active: 'Live', finished: 'Finished' };

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={`display-font ${styles.logo}`}>CS</h1>
          <div className={styles.headerRight}>
            <div className={styles.avatar} style={{ background: user?.avatar_color }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <span className={styles.username}>{user?.username}</span>
            <button className="btn btn-ghost" onClick={logout} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* Hero stat bar */}
        <div className={styles.statBar}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{rooms.length}</span>
            <span className={styles.statLabel}>Rooms</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>{rooms.filter(r => r.status === 'active').length}</span>
            <span className={styles.statLabel}>Live Games</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>{rooms.filter(r => r.status === 'finished').length}</span>
            <span className={styles.statLabel}>Completed</span>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <h2 className={`display-font ${styles.sectionTitle}`}>YOUR ROOMS</h2>
          <div className={styles.actionBtns}>
            <button className="btn btn-ghost" onClick={() => setModal('join')}>
              🔗 Join Room
            </button>
            <button className="btn btn-primary" onClick={() => setModal('create')}>
              + Create Room
            </button>
          </div>
        </div>

        {/* Rooms grid */}
        {loading ? (
          <div className={styles.loading}>Loading your rooms...</div>
        ) : rooms.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>⚽</span>
            <p>No rooms yet. Create one or join with a code.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {rooms.map((room, i) => (
              <RoomCard key={room.id} room={room} index={i} onClick={() => navigate(`/room/${room.id}`)} />
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {modal && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button className={styles.close} onClick={() => setModal(null)}>✕</button>

            {modal === 'create' ? (
              <>
                <h3 className={`display-font ${styles.modalTitle}`}>CREATE A ROOM</h3>
                <p className={styles.modalSub}>Share the room code with friends to compete</p>
                <form onSubmit={createRoom} className={styles.modalForm}>
                  <input
                    className="input"
                    placeholder="Room name (e.g. The Lads League)"
                    value={roomName}
                    onChange={e => setRoomName(e.target.value)}
                    required
                    maxLength={50}
                    autoFocus
                  />
                  <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%' }}>
                    {saving ? 'Creating...' : 'Create Room'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h3 className={`display-font ${styles.modalTitle}`}>JOIN A ROOM</h3>
                <p className={styles.modalSub}>Enter the 6-character room code</p>
                <form onSubmit={joinRoom} className={styles.modalForm}>
                  <input
                    className="input"
                    placeholder="e.g. AB12CD"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    required
                    maxLength={8}
                    style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '1.2rem', textAlign: 'center' }}
                    autoFocus
                  />
                  <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%' }}>
                    {saving ? 'Joining...' : 'Join Room'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RoomCard({ room, index, onClick }) {
  const cardStyle = { animationDelay: `${index * 60}ms` };
  const myCards = room.my_cards || 0;

  return (
    <div className={`card ${styles.roomCard} fade-up`} style={cardStyle} onClick={onClick}>
      <div className={styles.roomTop}>
        <div>
          <h3 className={styles.roomName}>{room.name}</h3>
          <p className={styles.roomCode}>#{room.code}</p>
        </div>
        <span className={`badge badge-${room.status}`}>
          {room.status === 'active' && '🔴 '}{room.status === 'waiting' && '⏳ '}{room.status === 'finished' && '🏆 '}
          {room.status}
        </span>
      </div>

      <div className={styles.roomStats}>
        <div className={styles.roomStat}>
          <span className={styles.roomStatNum}>{room.member_count}</span>
          <span className={styles.roomStatLabel}>Players</span>
        </div>
        {room.current_gameweek && (
          <div className={styles.roomStat}>
            <span className={styles.roomStatNum}>GW{room.current_gameweek}</span>
            <span className={styles.roomStatLabel}>Gameweek</span>
          </div>
        )}
        <div className={styles.roomStat}>
          <div className={styles.myCards}>
            {Array.from({ length: 2 }).map((_, i) => (
              <span
                key={i}
                className={`${styles.miniCard} ${
                  i < myCards ? (myCards === 2 ? styles.red : styles.yellow) : styles.empty
                }`}
              />
            ))}
          </div>
          <span className={styles.roomStatLabel}>My Cards</span>
        </div>
      </div>

      <div className={styles.roomStatus}>
        {room.my_status === 'eliminated' ? (
          <span className={styles.eliminated}>🟥 Eliminated</span>
        ) : room.my_status === 'yellow_card' ? (
          <span className={styles.warning}>🟨 On a Warning</span>
        ) : (
          <span className={styles.safe}>✅ Active</span>
        )}
      </div>
    </div>
  );
}
