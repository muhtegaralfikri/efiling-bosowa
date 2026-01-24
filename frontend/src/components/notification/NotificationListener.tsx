import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { wsService } from '../../services/websocket.service';

const processedIds = new Set<string>();

export default function NotificationListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleNotification = (notification: any) => {
      // DEBUG: Log incoming notification to console
      console.log('Incoming WebSocket Notification:', notification);

      // Deduplicate: Prefer ID. If no ID, use Type + RefID. 
      // Strip timestamp from key if it varies slightly between duplicate emissions
      const dedupKey = notification.id 
        ? `id-${notification.id}` 
        : `ref-${notification.type}-${notification.referenceId}`;

      console.log('Dedup Key:', dedupKey, 'Seen?', processedIds.has(dedupKey));

      if (processedIds.has(dedupKey)) {
        return; // Ignore duplicate
      }

      processedIds.add(dedupKey);
      setTimeout(() => {
        processedIds.delete(dedupKey);
      }, 5000); // Increased to 5 seconds to be safe against slow retries

      // Invalidate queries to fetch latest notifications
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });

      // Show toast notification with better formatting
      const message = notification.message || '';
      const docMatch = message.match(/"([^"]+)"/);
      
      toast(notification.title || 'Notifikasi Baru', {
        description: docMatch ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <span style={{ opacity: 0.9 }}>{message.replace(docMatch[0], '')}</span>
            <span style={{ 
              fontWeight: 600, 
              color: 'var(--accent-primary)', 
              background: 'rgba(var(--accent-primary-rgb), 0.1)', 
              padding: '6px 10px', 
              borderRadius: '8px', 
              width: 'fit-content',
              fontSize: '0.85rem',
              border: '1px solid rgba(var(--accent-primary-rgb), 0.2)'
            }}>
              {docMatch[1]}
            </span>
          </div>
        ) : (
          message
        ),
        duration: 5000,
        className: 'rich-toast',
      });
    };

    const handleSignatureRequest = (_request: any) => {
      // Refresh pending signatures if on that page
      queryClient.invalidateQueries({ queryKey: ['signature-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-signatures'] });
    };

    const handleSignatureStatus = (_data: any) => {
      // Refresh signature requests when status changes
      queryClient.invalidateQueries({ queryKey: ['signature-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-signatures'] });
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

  return null; // This component renders nothing
}
