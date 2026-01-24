import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesModule } from '../files/files.module';
import { EditLogsModule } from '../edit-logs/edit-logs.module';
import { OcrModule } from '../ocr/ocr.module';
import { SignatureRequestsModule } from '../signature-requests/signature-requests.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { LettersController } from './letters.controller';
import { LettersService } from './letters.service';
import { Letter } from './letter.entity';
import { OcrPreviewQueueService } from './ocr-preview.queue';
import { OcrPreviewCacheService } from './ocr-preview-cache.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Letter]),
    OcrModule,
    FilesModule,
    EditLogsModule,
    forwardRef(() => SignatureRequestsModule),
    WebSocketModule,
  ],
  controllers: [LettersController],
  providers: [LettersService, OcrPreviewQueueService, OcrPreviewCacheService],
  exports: [LettersService],
})
export class LettersModule {}

