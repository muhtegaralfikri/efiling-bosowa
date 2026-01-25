import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WSGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/ws',
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string | number, Socket> = new Map();

  handleConnection(client: Socket) {
    const userId = this.getUserIdFromSocket(client);
    if (userId) {
      this.connectedUsers.set(userId, client);
      client.join(`user:${userId}`);

    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.getUserIdFromSocket(client);
    if (userId) {
      this.connectedUsers.delete(userId);
      client.leave(`user:${userId}`);

    }
  }

  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { userId: string | number }) {
    client.join(`user:${data.userId}`);
    this.connectedUsers.set(data.userId, client);
  }

  @SubscribeMessage('leave')
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { userId: string | number }) {
    client.leave(`user:${data.userId}`);
    this.connectedUsers.delete(data.userId);
  }

  private getUserIdFromSocket(client: Socket): number | string | null {
    const userId = client.handshake.query.userId;
    // Return as string if it looks like UUID, otherwise try parse int (backward compatibility)
    if (userId && typeof userId === 'string' && userId.length > 10) {
      return userId;
    }
    return userId ? parseInt(userId as string) : null;
  }

  sendNotificationToUser(userId: number | string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  broadcastDocumentUpdate(document: any) {
    this.server.emit('document:update', document);
  }

  broadcastSignatureRequest(request: any) {
    this.server.emit('signature:request', request);
  }

  broadcastSignatureStatus(requestId: number, status: string) {
    this.server.emit('signature:status', { requestId, status });
  }
}
