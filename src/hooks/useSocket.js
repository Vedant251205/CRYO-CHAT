import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export function useSocket(roomToken, { onMessage, onPresence, onTyping, onError, onJoined, onMessageStatus }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!roomToken) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('room:join', { roomToken });
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on('room:joined', (data) => onJoined?.(data));
    socket.on('message:new',  (msg)  => onMessage?.(msg));
    socket.on('presence:update', (participants) => onPresence?.(participants));
    socket.on('typing:update',   (typingList)   => onTyping?.(typingList));
    socket.on('room:error',      (err)          => onError?.(err));
    socket.on('message:status',  (data)         => onMessageStatus?.(data));

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomToken]);

  const sendMessage = useCallback((text) => {
    socketRef.current?.emit('message:send', { text });
  }, []);

  const startTyping = useCallback(() => {
    socketRef.current?.emit('typing:start');
  }, []);

  const stopTyping = useCallback(() => {
    socketRef.current?.emit('typing:stop');
  }, []);

  const markAsRead = useCallback((messageId) => {
    socketRef.current?.emit('message:read', { messageId });
  }, []);

  return { connected, sendMessage, startTyping, stopTyping, markAsRead };
}
