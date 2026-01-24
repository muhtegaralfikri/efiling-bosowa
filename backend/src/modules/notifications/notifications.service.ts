import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
import { WebSocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly webSocketGateway: WebSocketGateway,
  ) {}

  async findAllByUser(userId: string): Promise<Notification[]> {
    return this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({
      where: { userId, isRead: false },
    });
  }

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    referenceId?: string,
  ): Promise<Notification> {
    // Use TypeORM create/save (safe from SQL injection)
    const notification = this.notificationRepo.create({
      userId,
      type,
      title,
      message,
      referenceId: referenceId ?? null,
      isRead: false,
    });
    const saved = await this.notificationRepo.save(notification);

    // Send real-time notification via WebSocket
    this.webSocketGateway.sendNotificationToUser(
      userId,
      saved,
    );

    return saved;
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    await this.notificationRepo.update({ id, userId }, { isRead: true });
    return { ...notification, isRead: true };
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepo.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }
}
