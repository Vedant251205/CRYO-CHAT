import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useSocket } from '../hooks/useSocket';
import Sidebar from '../components/Sidebar';
import MessageBubble from '../components/MessageBubble';
import EmojiPicker from 'emoji-picker-react';
import { useTheme } from '../contexts/ThemeContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function ChatPage() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, authHeaders } = useAuth();
  const { addToast } = useToast();
  const { theme } = useTheme();

  const [roomToken, setRoomToken] = useState(null);
  const [roomName, setRoomName] = useState('');
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [typingList, setTypingList] = useState([]);
  const [inputText, setInputText] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

  // ── Auto-join from URL password or session storage ──
  useEffect(() => {
    const tryJoin = async () => {
      setJoining(true);
      const stored = sessionStorage.getItem(`room_token_${roomId}`);
      if (stored) {
        setRoomToken(stored);
        setJoining(false);
        return;
      }

      const pwd = searchParams.get('pwd');
      if (!pwd) {
        setJoinError('No room password found. Please go back and enter the password.');
        setJoining(false);
        return;
      }

      try {
        const res = await axios.post(
          `${API}/api/rooms/${roomId}/join`,
          { password: pwd },
          { headers: authHeaders }
        );
        const { roomToken: rt, name } = res.data;
        sessionStorage.setItem(`room_token_${roomId}`, rt);
        setRoomToken(rt);
        setRoomName(name);
      } catch (err) {
        setJoinError(err.response?.data?.error || 'Could not join room. Check the password.');
      } finally {
        setJoining(false);
      }
    };
    tryJoin();
  }, [roomId]);

  // ── Socket callbacks ──────────────────────────────
  const handleJoined = useCallback(({ messages: msgs, participants: parts, typing, roomName: rn }) => {
    setMessages(msgs);
    setParticipants(parts);
    setTypingList(typing || []);
    if (rn) setRoomName(rn);
  }, []);

  const handleMessage = useCallback((msg) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  const handlePresence = useCallback((parts) => {
    setParticipants(parts);
  }, []);

  const handleTyping = useCallback((list) => {
    setTypingList(list.filter(u => u !== user.username));
  }, [user.username]);

  const handleError = useCallback((err) => {
    setJoinError(err.error || 'Room error.');
    addToast(err.error || 'Room error.', 'error');
  }, [addToast]);

  const handleMessageStatus = useCallback(({ messageId, status, readBy }) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status, readBy } : m));
  }, []);

  const { connected, sendMessage, startTyping, stopTyping, markAsRead } = useSocket(roomToken, {
    onJoined: handleJoined,
    onMessage: handleMessage,
    onPresence: handlePresence,
    onTyping: handleTyping,
    onError: handleError,
    onMessageStatus: handleMessageStatus,
  });

  // ── Intersection Observer to mark messages as read ──
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute('data-id');
            const message = messages.find(m => m.id === messageId);
            if (message && message.type === 'chat' && message.username !== user.username && !(message.readBy || []).includes(user.username)) {
              markAsRead(messageId);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    const messageElements = document.querySelectorAll('.message-bubble');
    messageElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [messages, markAsRead, user.username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    sendMessage(text);
    setInputText('');
    stopTyping();
    isTypingRef.current = false;
  }, [inputText, sendMessage, stopTyping]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!isTypingRef.current) {
      startTyping();
      isTypingRef.current = true;
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      stopTyping();
      isTypingRef.current = false;
    }, 2500);
  };

  const onEmojiClick = (emojiData) => {
    setInputText(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleCopyLink = async () => {
    const shareLink = `${window.location.origin}/room/${roomId}?pwd=${encodeURIComponent(searchParams.get('pwd') || '')}`;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      addToast('Link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast('Could not copy link.', 'error');
    }
  };

  if (joining) {
    return (
      <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, position:'relative', zIndex:10 }}>
        <div className="spinner" style={{ width:32, height:32, borderWidth:3 }} />
        <p style={{ color:'var(--text-secondary)' }}>Joining room…</p>
      </div>
    );
  }

  if (joinError) {
    return (
      <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:20, position:'relative', zIndex:10 }}>
        <div style={{ fontSize:'3rem' }}>🔒</div>
        <div className="glass-card" style={{ padding:'32px', maxWidth:'400px', textAlign:'center', display:'flex', flexDirection:'column', gap:16 }}>
          <h2 style={{ fontSize:'1.1rem', fontWeight:700 }}>Can&apos;t Join Room</h2>
          <p style={{ color:'var(--text-secondary)', fontSize:'0.9rem' }}>{joinError}</p>
          <button id="back-home-btn" className="btn btn-primary" onClick={() => navigate('/')}>← Back to Home</button>
        </div>
      </div>
    );
  }

  const typingText = () => {
    if (typingList.length === 0) return null;
    if (typingList.length === 1) return `${typingList[0]} is typing`;
    if (typingList.length === 2) return `${typingList[0]} and ${typingList[1]} are typing`;
    return `${typingList.length} people are typing`;
  };

  const shareLink = `${window.location.origin}/room/${roomId}?pwd=${encodeURIComponent(searchParams.get('pwd') || '')}`;

  return (
    <div className="chat-layout">
      <Sidebar
        roomId={roomId}
        roomName={roomName}
        participants={participants}
        currentUser={user}
        shareLink={shareLink}
        onCopyLink={handleCopyLink}
        copied={copied}
        onLeave={() => {
          sessionStorage.removeItem(`room_token_${roomId}`);
          navigate('/');
        }}
      />

      <div className="chat-main">
        <div className="chat-topbar">
          <div className="chat-topbar-left">
            <h1>❄️ {roomName || roomId}</h1>
            <div className={`connection-badge ${connected ? 'connected' : 'disconnected'}`}>
              <div className={connected ? 'pulse-dot' : ''} style={!connected ? { width:8, height:8, borderRadius:'50%', background:'#f87171' } : {}} />
              {connected ? 'Live' : 'Reconnecting…'}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>
              {participants.length} online
            </span>
            <button id="leave-room-btn" className="btn btn-danger" onClick={() => { sessionStorage.removeItem(`room_token_${roomId}`); navigate('/'); }}
              style={{ padding:'6px 14px' }}>
              Leave
            </button>
          </div>
        </div>

        <div className="messages-area" id="messages-area">
          {messages.length === 0 && (
            <div style={{ textAlign:'center', color:'var(--text-muted)', marginTop:'auto', padding:'40px 0' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:12 }}>💬</div>
              <p>No messages yet. Say hello!</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isOwn={msg.username === user.username}
              showAvatar={msg.type !== 'system' && (i === 0 || messages[i - 1].username !== msg.username || messages[i-1].type === 'system')}
              dataId={msg.id}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="typing-indicator">
          {typingList.length > 0 && (
            <>
              <div className="typing-dots">
                <span /><span /><span />
              </div>
              <span>{typingText()}…</span>
            </>
          )}
        </div>

        <div className="message-input-area">
          <div className="message-form" style={{ position: 'relative' }}>
            <button
              className="btn btn-ghost"
              style={{ padding: '8px', fontSize: '1.2rem', minWidth: '44px' }}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Emoji Picker"
            >
              😊
            </button>
            {showEmojiPicker && (
              <div style={{ position: 'absolute', bottom: '100%', left: 0, zIndex: 1000, marginBottom: '10px' }}>
                <EmojiPicker theme={theme} onEmojiClick={onEmojiClick} />
              </div>
            )}
            <textarea
              id="message-input"
              className="message-input"
              placeholder="Type a message…"
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={!connected}
            />
            <button
              id="send-btn"
              className="btn btn-primary send-btn"
              onClick={handleSend}
              disabled={!connected || !inputText.trim()}
              title="Send message"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
