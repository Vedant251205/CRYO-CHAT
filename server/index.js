require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'cryo_chat_dev_secret_change_in_prod';
const ROOM_JWT_SECRET = process.env.ROOM_JWT_SECRET || 'cryo_room_dev_secret_change_in_prod';
const PORT = process.env.PORT || 4000;

// ─────────────────────────────────────────────
// In-Memory Data Store
// ─────────────────────────────────────────────
const users = new Map();  // username -> { passwordHash, avatarColor, createdAt }
const rooms = new Map();  // roomId   -> { passwordHash, createdBy, createdAt, messages[] }
// Presence: tracked via Socket.IO room membership + socketMeta map
const socketMeta = new Map(); // socketId -> { username, avatarColor, roomId }
const typingSets = new Map(); // roomId -> Set<username>

// ─────────────────────────────────────────────
// Utility Helpers
// ─────────────────────────────────────────────
function generateAvatarColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 60%)`;
}

function signUserToken(username) {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyUserToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function signRoomToken(username, roomId) {
  return jwt.sign({ username, roomId }, ROOM_JWT_SECRET, { expiresIn: '24h' });
}

function verifyRoomToken(token) {
  return jwt.verify(token, ROOM_JWT_SECRET);
}

function getParticipants(roomId) {
  const result = [];
  for (const [, meta] of socketMeta) {
    if (meta.roomId === roomId) {
      result.push({ username: meta.username, avatarColor: meta.avatarColor });
    }
  }
  // Deduplicate by username (user may have multiple tabs)
  const seen = new Set();
  return result.filter(p => {
    if (seen.has(p.username)) return false;
    seen.add(p.username);
    return true;
  });
}

function getTypingList(roomId) {
  const set = typingSets.get(roomId);
  return set ? [...set] : [];
}

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    req.user = verifyUserToken(authHeader.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later.' },
});

// ─────────────────────────────────────────────
// HTTP Routes: Authentication
// ─────────────────────────────────────────────
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'Username must be 3–20 alphanumeric characters or underscores.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  if (users.has(username.toLowerCase())) {
    return res.status(409).json({ error: 'Username already taken.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const avatarColor = generateAvatarColor();
  users.set(username.toLowerCase(), { username, passwordHash, avatarColor, createdAt: Date.now() });

  const token = signUserToken(username);
  res.status(201).json({ token, user: { username, avatarColor } });
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = users.get(username.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid username or password.' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid username or password.' });

  const token = signUserToken(user.username);
  res.json({ token, user: { username: user.username, avatarColor: user.avatarColor } });
});

// ─────────────────────────────────────────────
// HTTP Routes: Rooms
// ─────────────────────────────────────────────
app.post('/api/rooms', requireAuth, async (req, res) => {
  const { password, name } = req.body;
  if (!password) return res.status(400).json({ error: 'Room password is required.' });
  if (password.length < 4) return res.status(400).json({ error: 'Room password must be at least 4 characters.' });

  const roomId = nanoid(8);
  const passwordHash = await bcrypt.hash(password, 10);
  rooms.set(roomId, {
    roomId,
    name: name || `Room ${roomId}`,
    passwordHash,
    createdBy: req.user.username,
    createdAt: Date.now(),
    messages: [],
  });

  const roomToken = signRoomToken(req.user.username, roomId);
  res.status(201).json({ roomId, name: rooms.get(roomId).name, roomToken });
});

app.post('/api/rooms/:roomId/join', requireAuth, async (req, res) => {
  const { roomId } = req.params;
  const { password } = req.body;

  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found.' });
  if (!password) return res.status(400).json({ error: 'Room password is required.' });

  const valid = await bcrypt.compare(password, room.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Incorrect room password.' });

  const roomToken = signRoomToken(req.user.username, roomId);
  res.json({ roomToken, name: room.name, roomId });
});

app.get('/api/rooms/:roomId/info', requireAuth, (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found.' });
  res.json({ roomId, name: room.name, createdBy: room.createdBy, createdAt: room.createdAt });
});

// ─────────────────────────────────────────────
// Socket.IO — Real-Time Layer
// ─────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // ── room:join ─────────────────────────────
  socket.on('room:join', (payload) => {
    try {
      const { roomToken } = payload || {};
      if (!roomToken) return socket.emit('room:error', { error: 'Missing room token.' });

      const decoded = verifyRoomToken(roomToken);
      const { username, roomId } = decoded;

      const room = rooms.get(roomId);
      if (!room) return socket.emit('room:error', { error: 'Room not found.' });

      const user = users.get(username.toLowerCase());
      const avatarColor = user ? user.avatarColor : generateAvatarColor();

      // Leave any previous room this socket was in
      const prevMeta = socketMeta.get(socket.id);
      if (prevMeta && prevMeta.roomId !== roomId) {
        socket.leave(prevMeta.roomId);
        _removeFromTyping(prevMeta.roomId, prevMeta.username);
        _broadcastPresence(prevMeta.roomId);
      }

      socket.join(roomId);
      socketMeta.set(socket.id, { username, avatarColor, roomId });

      // Send history + participants to this socket
      socket.emit('room:joined', {
        messages: room.messages.slice(-100),
        participants: getParticipants(roomId),
        typing: getTypingList(roomId),
        roomName: room.name,
      });

      // Broadcast updated presence to everyone in room
      _broadcastPresence(roomId);

      // System message that user joined
      _broadcastSystem(roomId, `${username} joined the room`, socket.id);

      console.log(`[Socket] ${username} joined room ${roomId}`);
    } catch (err) {
      socket.emit('room:error', { error: 'Invalid or expired room token.' });
    }
  });

  // ── message:send ─────────────────────────
  socket.on('message:send', ({ text }) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    if (!text || typeof text !== 'string') return;

    const trimmed = text.trim().slice(0, 2000);
    if (!trimmed) return;

    // Stop typing on send
    _removeFromTyping(meta.roomId, meta.username);
    _broadcastTyping(meta.roomId);

    const msg = {
      id: nanoid(10),
      roomId: meta.roomId,
      username: meta.username,
      avatarColor: meta.avatarColor,
      text: trimmed,
      timestamp: Date.now(),
      type: 'chat',
      status: 'sent', // Initial status
      readBy: [],     // Who has read it
    };

    const room = rooms.get(meta.roomId);
    if (room) {
      room.messages.push(msg);
      if (room.messages.length > 200) room.messages.shift();
    }

    io.to(meta.roomId).emit('message:new', msg);
  });

  // ── typing:start ─────────────────────────
  socket.on('typing:start', () => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    if (!typingSets.has(meta.roomId)) typingSets.set(meta.roomId, new Set());
    typingSets.get(meta.roomId).add(meta.username);
    _broadcastTyping(meta.roomId);

    // Auto-clear typing after 4s
    clearTimeout(socket._typingTimeout);
    socket._typingTimeout = setTimeout(() => {
      _removeFromTyping(meta.roomId, meta.username);
      _broadcastTyping(meta.roomId);
    }, 4000);
  });

  // ── typing:stop ──────────────────────────
  socket.on('typing:stop', () => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    clearTimeout(socket._typingTimeout);
    _removeFromTyping(meta.roomId, meta.username);
    _broadcastTyping(meta.roomId);
  });

  // ── message:read ──────────────────────────
  socket.on('message:read', ({ messageId }) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;

    const room = rooms.get(meta.roomId);
    if (!room) return;

    const msg = room.messages.find(m => m.id === messageId);
    if (msg && !msg.readBy.includes(meta.username)) {
      msg.readBy.push(meta.username);
      msg.status = 'read';
      io.to(meta.roomId).emit('message:status', { messageId, status: 'read', readBy: msg.readBy });
    }
  });

  // ── disconnect ───────────────────────────
  socket.on('disconnect', () => {
    const meta = socketMeta.get(socket.id);
    if (meta) {
      _removeFromTyping(meta.roomId, meta.username);
      socketMeta.delete(socket.id);
      _broadcastPresence(meta.roomId);
      _broadcastTyping(meta.roomId);
      _broadcastSystem(meta.roomId, `${meta.username} left the room`);
      console.log(`[Socket] ${meta.username} disconnected from ${meta.roomId}`);
    }
  });

  // ── Internal helpers ─────────────────────
  function _broadcastPresence(roomId) {
    io.to(roomId).emit('presence:update', getParticipants(roomId));
  }

  function _broadcastTyping(roomId) {
    io.to(roomId).emit('typing:update', getTypingList(roomId));
  }

  function _broadcastSystem(roomId, text, excludeSocket) {
    const msg = {
      id: nanoid(10),
      roomId,
      username: 'System',
      avatarColor: '#888',
      text,
      timestamp: Date.now(),
      type: 'system',
    };
    const room = rooms.get(roomId);
    if (room) {
      room.messages.push(msg);
      if (room.messages.length > 200) room.messages.shift();
    }
    if (excludeSocket) {
      socket.to(roomId).emit('message:new', msg);
    } else {
      io.to(roomId).emit('message:new', msg);
    }
  }

  function _removeFromTyping(roomId, username) {
    const set = typingSets.get(roomId);
    if (set) set.delete(username);
  }
});

server.listen(PORT, () => {
  console.log(`🚀 CryoChat server running on http://localhost:${PORT}`);
});
