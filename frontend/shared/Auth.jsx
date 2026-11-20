import React, { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, readSession, saveSession } from './api';
const AuthContext = createContext();
export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);
  useEffect(() => {
    const sync = () => setSession(readSession());
    window.addEventListener('novara-auth', sync);
    return () => window.removeEventListener('novara-auth', sync);
  }, []);
  const login = async (values, register = false) => {
    const { data } = await api.post(register ? '/auth/register' : '/auth/login', values);
    saveSession(data);
    return data.user;
  };
  const logout = async () => {
    try {
      if (session?.refreshToken) await api.post('/auth/logout', { refreshToken: session.refreshToken });
    } finally {
      saveSession(null);
    }
  };
  return (
    <AuthContext.Provider
      value={{
        user: session?.user,
        login,
        logout,
        updateUser: (user) => saveSession({ ...readSession(), user }),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
export function Protected({ children, roles }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role))
    return (
      <div className="empty">
        <h1>Access restricted</h1>
        <p>Your role does not have access to this page.</p>
        <a href="/">Return home</a>
      </div>
    );
  return children;
}
