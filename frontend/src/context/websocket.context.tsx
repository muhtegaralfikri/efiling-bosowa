import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { wsService } from '../services/websocket.service';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
  connect: (userId: number | string) => void;
  disconnect: () => void;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined,
);

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [, setUserId] = useState<number | string | null>(null);

  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
      wsService.connect(user.id);
    } else {
      setUserId(null);
      wsService.disconnect();
    }
  }, [user]);

  const connect = (newUserId: number | string) => {
    setUserId(newUserId);
    wsService.connect(newUserId);
  };

  const disconnect = () => {
    setUserId(null);
    wsService.disconnect();
  };

  return (
    <WebSocketContext.Provider
      value={{
        connect,
        disconnect,
        isConnected: wsService.isConnected(),
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
