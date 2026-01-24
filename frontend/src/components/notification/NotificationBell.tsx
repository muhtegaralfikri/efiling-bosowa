import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, FileSignature, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../../api/signatures';
import { wsService } from '../../services/websocket.service';
import { toast } from 'sonner';

export default function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 30000,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    enabled: isOpen,
  });

  const markReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  // Listen for WebSocket notifications
  useEffect(() => {
    const handleNotification = (notification: any) => {
      // Invalidate queries to fetch latest notifications
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });

      // Show toast notification
      toast(notification.title || 'Notifikasi Baru', {
        description: notification.message || '',
        duration: 5000,
      });
    };

    const handleSignatureRequest = (_request: any) => {
      // Refresh pending signatures if on that page
      queryClient.invalidateQueries({ queryKey: ['signature-requests'] });
    };

    const handleSignatureStatus = (_data: any) => {
      // Refresh signature requests when status changes
      queryClient.invalidateQueries({ queryKey: ['signature-requests'] });
      queryClient.invalidateQueries({ queryKey: ['letters'] });
    };

    const handleDocumentUpdate = (_document: any) => {
      // Refresh letters when document is updated
      queryClient.invalidateQueries({ queryKey: ['letters'] });
    };

    // Subscribe to WebSocket events
    wsService.on('notification', handleNotification);
    wsService.on('signature:request', handleSignatureRequest);
    wsService.on('signature:status', handleSignatureStatus);
    wsService.on('document:update', handleDocumentUpdate);

    return () => {
      wsService.off('notification', handleNotification);
      wsService.off('signature:request', handleSignatureRequest);
      wsService.off('signature:status', handleSignatureStatus);
      wsService.off('document:update', handleDocumentUpdate);
    };
  }, [queryClient]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // Close dropdown on scroll (fix mobile issue)
    const handleScroll = () => {
      if (isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll);
    };
  }, [isOpen]);

  const handleNotificationClick = (notif: (typeof notifications)[0]) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }
    if (notif.type === 'SIGNATURE_REQUEST' && notif.referenceId) {
      navigate('/pending-signatures');
    }
    setIsOpen(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'SIGNATURE_REQUEST':
        return <FileSignature size={16} className="notif-icon request" />;
      case 'SIGNATURE_COMPLETED':
        return <Check size={16} className="notif-icon success" />;
      case 'SIGNATURE_REJECTED':
        return <X size={16} className="notif-icon danger" />;
      default:
        return <Bell size={16} />;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    if (days < 7) return `${days} hari lalu`;
    return date.toLocaleDateString('id-ID');
  };

  const shortenMiddle = (text: string, maxLen = 36) => {
    const raw = (text || '').trim();
    if (raw.length <= maxLen) return raw;
    const head = Math.max(Math.min(12, Math.floor(maxLen / 2)), 6);
    const tail = Math.max(Math.min(10, maxLen - head - 1), 6);
    return `${raw.slice(0, head)}…${raw.slice(-tail)}`;
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button className={`bell-button ${isOpen ? 'active' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        <Bell size={20} />
        {unreadCount > 0 && <span className="badge-count animate-bounce">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="dropdown-header">
            <div>
              <span className="dropdown-title">Notifikasi</span>
              {unreadCount > 0 && <span className="dropdown-subtitle">{unreadCount} baru</span>}
            </div>
            {notifications.some((n) => !n.isRead) && (
              <button className="mark-all-btn" onClick={() => markAllMutation.mutate()}>
                Tandai dibaca
              </button>
            )}
          </div>
          <div className="dropdown-body">
            {notifications.length === 0 ? (
              <div className="empty-state">
                <Bell size={32} className="empty-icon" />
                <p>Tidak ada notifikasi baru</p>
                <span>Kami akan memberi tahu Anda jika ada update penting.</span>
              </div>
            ) : (
              notifications.slice(0, 10).map((notif) => (
                <div
                  key={notif.id}
                  className={`notif-item ${notif.isRead ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="notif-icon-wrapper">
                    {getIcon(notif.type)}
                  </div>
                  <div className="notif-content">
                    <p className="notif-title">{shortenMiddle(notif.title, 44)}</p>
                    <p className="notif-message">{shortenMiddle(notif.message, 64)}</p>
                    <span className="notif-time">{formatTime(notif.createdAt)}</span>
                  </div>
                  {!notif.isRead && <div className="unread-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        .notification-bell {
          position: relative;
          font-family: 'Sora', sans-serif;
        }

        /* Bell Button with Pulse */
        .bell-button {
          position: relative;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
          padding: 0.6rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: rgba(255, 255, 255, 0.8);
        }

        .bell-button:hover, .bell-button.active {
          background: rgba(255, 255, 255, 0.15);
          color: #fff;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .badge-count {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444; /* Red-500 */
          color: white;
          font-size: 0.6rem;
          font-weight: 700;
          padding: 0.15rem 0.4rem;
          border-radius: 9999px;
          min-width: 1.25rem;
          text-align: center;
          border: 2px solid var(--sidebar-bg); /* Match sidebar to create cutout effect */
          box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
        }

        .animate-bounce {
          animation: bounce 1s infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        /* Glassmorphism Dropdown */
        .notification-dropdown {
          position: absolute;
          top: calc(100% + 12px);
          left: 0; /* Align left for sidebar context */
          width: 360px;
          background: rgba(15, 23, 42, 0.85); /* Slate-900 with opacity */
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          box-shadow: 
            0 10px 40px -10px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.05) inset;
          z-index: 1000;
          overflow: hidden;
          animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          transform-origin: top left;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: scale(0.95) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
        }

        .dropdown-title {
          font-weight: 700;
          font-size: 1rem;
          color: #fff;
          display: block;
        }

        .dropdown-subtitle {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 500;
        }

        .mark-all-btn {
          background: transparent;
          border: none;
          color: var(--accent-primary);
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          transition: background 0.2s;
        }

        .mark-all-btn:hover {
          background: rgba(56, 189, 248, 0.1); /* Sky-400 opacity */
        }

        .dropdown-body {
          max-height: 400px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
        }

        .dropdown-body::-webkit-scrollbar {
          width: 4px;
        }
        
        .dropdown-body::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }

        /* Notification Items */
        .notif-item {
          display: flex;
          gap: 1rem;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .notif-item:last-child {
          border-bottom: none;
        }

        .notif-item:hover {
          background: rgba(255, 255, 255, 0.05); /* Subtle white overlay */
        }

        .notif-item.unread {
          background: rgba(var(--accent-primary-rgb, 59, 130, 246), 0.08); /* Blue tint */
        }
        
        .notif-item.unread:hover {
          background: rgba(var(--accent-primary-rgb, 59, 130, 246), 0.12);
        }

        .notif-icon-wrapper {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .notif-icon { width: 18px; height: 18px; }
        .notif-icon.request { color: #60a5fa; } /* Blue-400 */
        .notif-icon.success { color: #4ade80; } /* Green-400 */
        .notif-icon.danger { color: #f87171; } /* Red-400 */

        .notif-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .notif-title {
          font-weight: 600;
          font-size: 0.9rem;
          color: #f1f5f9; /* Slate-100 */
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .notif-message {
          font-size: 0.8rem;
          color: #94a3b8; /* Slate-400 */
          margin: 0;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          white-space: normal;
        }

        .notif-time {
          font-size: 0.7rem;
          color: #64748b; /* Slate-500 */
          margin-top: 0.2rem;
        }

        .unread-dot {
          position: absolute;
          top: 1.25rem;
          right: 1.25rem;
          width: 8px;
          height: 8px;
          background: #3b82f6;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
        }

        /* Empty State */
        .empty-state {
          padding: 3rem 1.5rem;
          text-align: center;
          color: rgba(255, 255, 255, 0.4);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .empty-icon {
          margin-bottom: 0.5rem;
          opacity: 0.3;
        }

        .empty-state p {
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
        }

        .empty-state span {
          font-size: 0.75rem;
          max-width: 200px;
          line-height: 1.4;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .notification-dropdown {
            position: fixed;
            top: 70px;
            left: 1rem;
            right: 1rem;
            width: auto;
            max-width: none;
            max-height: 60vh;
            background: rgba(15, 23, 42, 0.95); /* More opacity for mobile readability */
          }
          
          .bell-button {
            color: var(--text-primary);
            background: transparent;
            border: none;
          }
          
          .bell-button:hover, .bell-button.active {
            background: var(--bg-hover);
            color: var(--accent-primary);
          }
          
          .dropdown-body {
            max-height: calc(60vh - 70px);
          }
        }
      `}</style>
    </div>
  );
}
