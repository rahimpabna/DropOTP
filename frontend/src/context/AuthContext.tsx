import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { API } from '../api';
import { io, Socket } from 'socket.io-client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  socket: Socket | null;
  isImpersonating: boolean;
  login: (identifier: string, pass: string) => Promise<void>;
  register: (email: string, username: string, pass: string) => Promise<void>;
  logout: () => void;
  returnToAdmin: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    // Check URL parameters for impersonation token on mount
    const params = new URLSearchParams(window.location.search);
    const impersonateToken = params.get('impersonate_token');
    const adminReturnToken = params.get('admin_return');

    if (impersonateToken) {
      if (adminReturnToken) {
        localStorage.setItem('impersonated_from_admin', adminReturnToken);
      }
      localStorage.setItem('token', impersonateToken);
      // Clean query string from browser bar without refresh
      window.history.replaceState({}, document.title, window.location.pathname);
      return impersonateToken;
    }
    return localStorage.getItem('token');
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isImpersonating, setIsImpersonating] = useState<boolean>(
    () => !!localStorage.getItem('impersonated_from_admin')
  );

  const refreshMe = async () => {
    try {
      const res = await API.get('/auth/me');
      setUser(res.data);
    } catch (err) {
      console.warn('Failed to fetch profile. Token may be expired.');
      logout();
    }
  };

  useEffect(() => {
    setIsImpersonating(!!localStorage.getItem('impersonated_from_admin'));
    if (token) {
      refreshMe().finally(() => setLoading(false));

      // Connect WebSocket
      const newSocket = io(window.location.origin, {
        auth: { token },
      });

      newSocket.on('connect', () => {
        console.log('[Socket] Connected to realtime server');
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (identifier: string, pass: string) => {
    const res = await API.post('/auth/login', { identifier, password: pass });
    const { token: receivedToken, user: receivedUser } = res.data;
    localStorage.setItem('token', receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
    await refreshMe();
  };

  const register = async (email: string, username: string, pass: string) => {
    const res = await API.post('/auth/register', { email, username, password: pass });
    const { token: receivedToken, user: receivedUser } = res.data;
    localStorage.setItem('token', receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
    await refreshMe();
  };

  const returnToAdmin = () => {
    const adminToken = localStorage.getItem('impersonated_from_admin');
    if (adminToken) {
      localStorage.removeItem('impersonated_from_admin');
      localStorage.setItem('token', adminToken);
      setToken(adminToken);
      setIsImpersonating(false);
      window.location.href = '/#admin';
    }
  };

  const logout = () => {
    const adminToken = localStorage.getItem('impersonated_from_admin');
    if (adminToken) {
      // If logging out while impersonating, safely return back to admin panel
      returnToAdmin();
      return;
    }

    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    if (socket) socket.disconnect();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        token,
        socket,
        isImpersonating,
        login,
        register,
        logout,
        returnToAdmin,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
