import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function HomePage() {
  const { user, authHeaders, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [createForm, setCreateForm] = useState({ name: '', password: '' });
  const [joinForm, setJoinForm] = useState({ roomId: '', password: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [joinError, setJoinError] = useState('');

  const handleCreate = async e => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    try {
      const res = await axios.post(
        `${API}/api/rooms`,
        { name: createForm.name.trim() || undefined, password: createForm.password },
        { headers: authHeaders }
      );
      const { roomId, roomToken } = res.data;
      // Store room token keyed by roomId
      sessionStorage.setItem(`room_token_${roomId}`, roomToken);
      addToast('Room created! Share the link with friends 🔗', 'success');
      // Navigate with raw password in URL for sharing (never stored server-side plain)
      navigate(`/room/${roomId}?pwd=${encodeURIComponent(createForm.password)}`);
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create room.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoin = async e => {
    e.preventDefault();
    setJoinLoading(true);
    setJoinError('');
    const roomId = joinForm.roomId.trim();
    try {
      const res = await axios.post(
        `${API}/api/rooms/${roomId}/join`,
        { password: joinForm.password },
        { headers: authHeaders }
      );
      const { roomToken } = res.data;
      sessionStorage.setItem(`room_token_${roomId}`, roomToken);
      navigate(`/room/${roomId}`);
    } catch (err) {
      setJoinError(err.response?.data?.error || 'Failed to join room.');
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div className="home-page">
      {/* User bar */}
      <div style={{ position: 'absolute', top: 20, right: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Signed in as <strong style={{ color: 'var(--text-primary)' }}>{user.username}</strong>
        </span>
        <button id="logout-btn" className="btn btn-ghost" onClick={logout} style={{ padding: '6px 14px' }}>
          Sign Out
        </button>
      </div>

      {/* Logo */}
      <div className="home-header">
        <span style={{ fontSize: '2.5rem' }}>❄️</span>
        <h1>CryoChat</h1>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 920 }}>
        {/* Create Room */}
        <div className="glass-card home-card">
          <h2>
            <span style={{ fontSize: '1.2rem' }}>✦</span>
            Create a Room
          </h2>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="input-group">
              <label className="input-label" htmlFor="room-name">Room Name (optional)</label>
              <input
                id="room-name"
                className="input"
                placeholder="My Secret Room"
                value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="room-pwd">Room Password</label>
              <input
                id="room-pwd"
                className="input"
                type="password"
                placeholder="At least 4 characters"
                value={createForm.password}
                onChange={e => { setCreateForm(f => ({ ...f, password: e.target.value })); setCreateError(''); }}
                required
              />
            </div>
            {createError && <div className="alert alert-error">{createError}</div>}
            <button id="create-room-btn" className="btn btn-primary" type="submit" disabled={createLoading}>
              {createLoading ? <span className="spinner" /> : '✦'}
              {createLoading ? 'Creating…' : 'Create & Enter Room'}
            </button>
          </form>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            A shareable link with the room ID and password will be generated. Share it with anyone you want to invite.
          </p>
        </div>

        {/* Join Room */}
        <div className="glass-card home-card">
          <h2>
            <span style={{ fontSize: '1.2rem' }}>→</span>
            Join a Room
          </h2>
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="input-group">
              <label className="input-label" htmlFor="join-room-id">Room ID</label>
              <input
                id="join-room-id"
                className="input"
                placeholder="8-char room ID"
                value={joinForm.roomId}
                onChange={e => { setJoinForm(f => ({ ...f, roomId: e.target.value })); setJoinError(''); }}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="join-room-pwd">Room Password</label>
              <input
                id="join-room-pwd"
                className="input"
                type="password"
                placeholder="Enter room password"
                value={joinForm.password}
                onChange={e => { setJoinForm(f => ({ ...f, password: e.target.value })); setJoinError(''); }}
                required
              />
            </div>
            {joinError && <div className="alert alert-error">{joinError}</div>}
            <button id="join-room-btn" className="btn btn-primary" type="submit" disabled={joinLoading}>
              {joinLoading ? <span className="spinner" /> : '→'}
              {joinLoading ? 'Joining…' : 'Join Room'}
            </button>
          </form>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Got a shareable link? Just paste it in your browser — the password will auto-fill from the URL.
          </p>
        </div>
      </div>
    </div>
  );
}
