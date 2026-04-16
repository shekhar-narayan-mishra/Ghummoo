import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications/unread-count');
      // interceptor already unwraps the { success, data } envelope → res = { count: N }
      setUnreadCount(res?.count ?? 0);
    } catch {
      // Silently ignore — user may not be logged in
    }
  }, [user]);

  useEffect(() => {
    fetchUnread();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount, fetchUnread, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
};
