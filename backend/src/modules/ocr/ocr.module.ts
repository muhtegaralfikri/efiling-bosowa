import { Module } from '@nestjs/common';
import { AiExtractionService } from './ai-extraction.service';
import { OcrHealthController } from './ocr-health.controller';
import { OcrHealthService } from './ocr-health.service';
import { PdfConverterService } from './pdf-converter.service';
import { VisionOcrService } from './vision-ocr.service';

@Module({
  controllers: [OcrHealthController],
  providers: [AiExtractionService, VisionOcrService, PdfConverterService, OcrHealthService],
  exports: [AiExtractionService, VisionOcrService, PdfConverterService, OcrHealthService],
})
export class OcrModule {}
