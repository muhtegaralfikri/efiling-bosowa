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
      <button className="bell-button" onClick={() => setIsOpen(!isOpen)}>
        <Bell size={20} />
        {unreadCount > 0 && <span className="badge-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <div 
          className="notification-dropdown"
          style={{
            opacity: 1,
            transform: 'translateY(0)',
          }}
        >
          <div className="dropdown-header">
            <span>Notifikasi</span>
            {notifications.some((n) => !n.isRead) && (
              <button className="mark-all-btn" onClick={() => markAllMutation.mutate()}>
                Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="dropdown-body">
            {notifications.length === 0 ? (
              <p className="empty-notif">Tidak ada notifikasi</p>
            ) : (
              notifications.slice(0, 10).map((notif) => (
                <div
                  key={notif.id}
                  className={`notif-item ${notif.isRead ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  {getIcon(notif.type)}
                  <div className="notif-content">
                    <p className="notif-title" title={notif.title}>
                      {shortenMiddle(notif.title, 44)}
                    </p>
                    <p className="notif-message" title={notif.message}>
                      {shortenMiddle(notif.message, 64)}
                    </p>
                    <span className="notif-time">{formatTime(notif.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        .notification-bell {
          position: relative;
        }
        .bell-button {
          position: relative;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
          color: white;
        }
        .bell-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .badge-count {
          position: absolute;
          top: 0;
          right: 0;
          background: #ef4444;
          color: white;
          font-size: 0.65rem;
          font-weight: bold;
          padding: 0.1rem 0.35rem;
          border-radius: 9999px;
          min-width: 1.1rem;
          text-align: center;
        }
        .notification-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          width: 320px;
          max-height: 400px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          box-shadow: var(--shadow-panel);
          z-index: 1000;
          overflow: hidden;
        }
        @media (max-width: 768px) {
          .notification-dropdown {
            position: fixed;
            top: 60px;
            bottom: auto;
            left: 1rem;
            right: 1rem;
            width: auto;
            max-height: 60vh;
            z-index: 1000;
            /* Add smooth transition for better UX */
            transition: opacity 0.15s ease-in-out, transform 0.15s ease-in-out;
          }
          .dropdown-body {
            max-height: calc(60vh - 50px);
            /* Improve mobile scroll */
            -webkit-overflow-scrolling: touch;
            overscroll-behavior: contain;
          }
        }
        .dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border-color);
          font-weight: 600;
          color: var(--text-primary);
        }
        .mark-all-btn {
          background: transparent;
          border: none;
          color: var(--accent-primary);
          cursor: pointer;
          font-size: 0.75rem;
        }
        .dropdown-body {
          max-height: 320px;
          overflow-y: auto;
        }
        .empty-notif {
          padding: 2rem;
          text-align: center;
          color: var(--text-secondary);
        }
        .notif-item {
          display: flex;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border-light);
          cursor: pointer;
          transition: background 0.2s;
        }
        .notif-item:hover {
          background: var(--bg-hover);
        }
        .notif-item.unread {
          background: var(--accent-light);
        }
        .notif-icon {
          flex-shrink: 0;
          margin-top: 0.2rem;
        }
        .notif-icon.request { color: var(--accent-primary); }
        .notif-icon.success { color: #22c55e; }
        .notif-icon.danger { color: #ef4444; }
        .notif-content {
          flex: 1;
          min-width: 0;
        }
        .notif-title {
          font-weight: 600;
          font-size: 0.875rem;
          margin: 0;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .notif-message {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin: 0.25rem 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .notif-time {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
