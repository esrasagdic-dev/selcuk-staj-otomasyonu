import React, { useState, useEffect, useRef } from 'react';
import { UserNotification } from '../types';
import { apiRequest } from '../services/api';
import { Bell, CheckCircle2, AlertTriangle, AlertCircle, Info, Check } from 'lucide-react';

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // 15 saniyede bir otomatik yenile
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await apiRequest<{ unreadCount: number; notifications: UserNotification[] }>('/notifications');
      if (data) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // sessizce geç
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiRequest('/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'Success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
      case 'Warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
      case 'Error':
        return <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    let normalized = dateStr;
    // Eğer ISO dizesinde saat dilimi (Z veya +/-) yoksa UTC olarak algılanması için Z ekle
    if (!normalized.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(normalized)) {
      normalized = normalized + 'Z';
    }
    const createdTime = new Date(normalized).getTime();
    if (isNaN(createdTime)) return '';

    const now = Date.now();
    const diffSeconds = Math.max(0, Math.floor((now - createdTime) / 1000));

    if (diffSeconds < 60) return 'Az önce';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} dk önce`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} saat önce`;
    if (diffSeconds < 86400 * 30) return `${Math.floor(diffSeconds / 86400)} gün önce`;
    return new Date(normalized).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const formatFullDate = (dateStr: string) => {
    if (!dateStr) return '';
    let normalized = dateStr;
    if (!normalized.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(normalized)) {
      normalized = normalized + 'Z';
    }
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? '' : d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition focus:outline-none"
        title="Bildirimler"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-fadeIn font-['Montserrat',sans-serif]">
          {/* Header */}
          <div className="p-3.5 bg-[#1c458b] text-white flex items-center justify-between border-b border-[#c5a880]/30">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">Bildirimler</span>
              {unreadCount > 0 && (
                <span className="bg-[#c5a880] text-[#1c458b] text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} Yeni
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-[#c5a880] hover:text-white transition flex items-center gap-1 font-semibold"
              >
                <Check className="w-3.5 h-3.5" />
                Tümünü Okundu Say
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Henüz yeni bir bildiriminiz bulunmuyor.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                  className={`p-3.5 flex gap-3 text-left transition cursor-pointer ${
                    n.isRead ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/70 hover:bg-blue-50'
                  }`}
                >
                  {getIcon(n.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className={`text-xs truncate ${!n.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {n.title}
                      </span>
                      <span 
                        className="text-[10px] text-slate-400 whitespace-nowrap" 
                        title={formatFullDate(n.createdAt)}
                      >
                        {formatTimeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 self-center" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer: Bilgilendirme */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 px-4">
            <span className="font-medium text-slate-500">Sistem İçi Bildirim Merkezi</span>
            <span className="text-[10px] bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded">Canlı Senkronize</span>
          </div>
        </div>
      )}
    </div>
  );
};
