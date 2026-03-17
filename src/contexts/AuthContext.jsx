import { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('cryo_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('cryo_token') || null);

  const register = useCallback(async (username, password) => {
    const res = await axios.post(`${API}/api/auth/register`, { username, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('cryo_token', t);
    localStorage.setItem('cryo_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await axios.post(`${API}/api/auth/login`, { username, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('cryo_token', t);
    localStorage.setItem('cryo_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('cryo_token');
    localStorage.removeItem('cryo_user');
    setToken(null);
    setUser(null);
  }, []);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  return (
    <AuthContext.Provider value={{ user, token, authHeaders, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
