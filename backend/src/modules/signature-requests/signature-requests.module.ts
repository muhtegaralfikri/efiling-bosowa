import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SignatureRequest } from './signature-request.entity';
import { SignatureRequestsService } from './signature-requests.service';
import { SignatureRequestsController } from './signature-requests.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { SignaturesModule } from '../signatures/signatures.module';
import { Letter } from '../letters/letter.entity';
import { User } from '../users/user.entity';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SignatureRequest, Letter, User]),
    NotificationsModule,
    SignaturesModule,
    WebSocketModule,
  ],
  controllers: [SignatureRequestsController],
  providers: [SignatureRequestsService],
  exports: [SignatureRequestsService],
})
export class SignatureRequestsModule {}
