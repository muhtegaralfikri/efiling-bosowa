import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  connect(userId: number | string) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(`${WS_URL}/ws`, {
      query: { userId },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      // Connection established
    });

    this.socket.on('disconnect', () => {
      // Connection closed
    });

    this.socket.on('notification', (data) => {
      this.emit('notification', data);
    });

    this.socket.on('signature:request', (data) => {
      this.emit('signature:request', data);
    });

    this.socket.on('signature:status', (data) => {
      this.emit('signature:status', data);
    });

    this.socket.on('document:update', (data) => {
      this.emit('document:update', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: (data: any) => void) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  emitEvent(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const wsService = new WebSocketService();
