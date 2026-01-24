import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeleteRequestsController } from './delete-requests.controller';
import { DeleteRequestsService } from './delete-requests.service';
import { DeleteRequest } from './delete-request.entity';
import { Letter } from '../letters/letter.entity';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [TypeOrmModule.forFeature([DeleteRequest, Letter]), WebSocketModule],
  controllers: [DeleteRequestsController],
  providers: [DeleteRequestsService, RolesGuard],
  exports: [DeleteRequestsService],
})
export class DeleteRequestsModule {}
