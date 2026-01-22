import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageAnnotatorClient } from '@google-cloud/vision';

@Injectable()
export class VisionOcrService {
  private readonly logger = new Logger(VisionOcrService.name);
  private client: ImageAnnotatorClient | null = null;
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {
    const credentialsPath = this.configService.get<string>(
      'GOOGLE_APPLICATION_CREDENTIALS',
    );

    // Only use service account credentials (more reliable)
    try {
      if (credentialsPath) {
        this.client = new ImageAnnotatorClient({
          keyFilename: credentialsPath,
        });

        this.isConfigured = true;
        this.logger.log('Google Vision API initialized with service account');
      } else {
        this.logger.error(
          'Google Vision API not configured. Set GOOGLE_APPLICATION_CREDENTIALS in .env',
        );
      }
    } catch (error) {
      this.logger.error('Failed to initialize Google Vision API', error);
    }
  }

  isAvailable(): boolean {
    return this.isConfigured && this.client !== null;
  }

  isPdfAsyncAvailable(): boolean {
    // Async PDF OCR via GCS bucket intentionally disabled (cost control).
    return false;
  }

  async recognizeText(filePath: string): Promise<string> {
    if (!this.client) {
      throw new Error('Google Vision API not configured');
    }

    try {
      this.logger.log(`Processing image with Google Vision: ${filePath}`);

      // Call Vision API for text detection
      const [result] = await this.client.textDetection({
        image: { source: { filename: filePath } },
      });

      const detections = result.textAnnotations;

      if (!detections || detections.length === 0) {
        this.logger.warn('No text detected in image');
        return '';
      }

      // First annotation contains the full text
      const fullText = detections[0].description || '';

      this.logger.log(`Vision API extracted ${fullText.length} characters`);
      return fullText;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Vision API OCR failed', message);
      throw error;
    }
  }

  async recognizeDocument(filePath: string): Promise<string> {
    if (!this.client) {
      throw new Error('Google Vision API not configured');
    }

    try {
      this.logger.log(`Processing document with Google Vision: ${filePath}`);

      // Use document text detection for better accuracy with documents
      const [result] = await this.client.documentTextDetection({
        image: { source: { filename: filePath } },
      });

      const fullTextAnnotation = result.fullTextAnnotation;

      if (!fullTextAnnotation) {
        this.logger.warn('No text detected in document');
        return '';
      }

      const fullText = fullTextAnnotation.text || '';

      this.logger.log(
        `Vision API (document mode) extracted ${fullText.length} characters`,
      );
      return fullText;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Vision API document OCR failed', message);
      throw error;
    }
  }

  async recognizeDocumentBuffer(image: Buffer): Promise<string> {
    if (!this.client) {
      throw new Error('Google Vision API not configured');
    }

    try {
      const [result] = await this.client.documentTextDetection({
        image: { content: image },
      });

      const fullText = result.fullTextAnnotation?.text || '';
      return fullText;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Vision API document OCR (buffer) failed', message);
      throw error;
    }
  }

  // Async PDF OCR via GCS bucket intentionally removed (cost control).
}
