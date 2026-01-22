import { Module } from '@nestjs/common';
import { AiExtractionService } from './ai-extraction.service';
import { PdfConverterService } from './pdf-converter.service';
import { VisionOcrService } from './vision-ocr.service';

@Module({
  providers: [AiExtractionService, VisionOcrService, PdfConverterService],
  exports: [AiExtractionService, VisionOcrService, PdfConverterService],
})
export class OcrModule {}
