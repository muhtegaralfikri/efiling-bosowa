import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageAnnotatorClient } from '@google-cloud/vision';

/**
 * Retry configuration for handling network latency
 */
const RETRY_CONFIG = {
  maxAttempts: 3,           // Maximum retry attempts
  initialDelay: 2000,       // 2 seconds initial delay
  maxDelay: 10000,          // 10 seconds max delay between retries
  timeout: 60000,           // 60 seconds timeout per request
} as const;

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate exponential backoff delay
 */
const calculateDelay = (attempt: number): number => {
  const exponentialDelay = RETRY_CONFIG.initialDelay * Math.pow(2, attempt - 1);
  return Math.min(exponentialDelay, RETRY_CONFIG.maxDelay);
};

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
          // Add timeout for handling slow responses
          apiEndpoint: 'vision.googleapis.com',
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

  /**
   * Generic OCR method with retry logic and timeout
   */
  private async executeWithRetry<T>(
    operation: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
      const attemptNum = attempt;
      try {
        this.logger.debug(`${operation} - Attempt ${attemptNum}/${RETRY_CONFIG.maxAttempts}`);

        // Add timeout to the promise
        const result = await Promise.race([
          fn(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), RETRY_CONFIG.timeout)
          ),
        ]);

        if (attemptNum > 1) {
          this.logger.log(`${operation} - Success after ${attemptNum} attempts`);
        }

        return result;
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const isTimeout = lastError.message === 'Request timeout';
        const isNetworkError = lastError.message.includes('ECONNREFUSED') ||
                              lastError.message.includes('ENOTFOUND') ||
                              lastError.message.includes('ETIMEDOUT') ||
                              lastError.message.includes('fetch failed');

        // Don't retry on certain errors
        const shouldNotRetry = lastError.message.includes('403') ||
                             lastError.message.includes('401') ||
                             lastError.message.includes('Quota exceeded') ||
                             lastError.message.includes('User rate limit exceeded');

        if (shouldNotRetry) {
          this.logger.error(`${operation} - Fatal error, no retry: ${lastError.message}`);
          throw lastError;
        }

        // Last attempt or non-retryable error
        if (attemptNum >= RETRY_CONFIG.maxAttempts) {
          this.logger.error(`${operation} - Failed after ${RETRY_CONFIG.maxAttempts} attempts: ${lastError.message}`);
          throw new Error(`${operation} failed: ${lastError.message}`);
        }

        // Calculate delay for next attempt
        const delay = calculateDelay(attemptNum);
        this.logger.warn(`${operation} - Attempt ${attemptNum} failed (${isTimeout ? 'timeout' : 'network'}), retrying in ${delay}ms...`);

        await sleep(delay);
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError || new Error('Unknown error in retry logic');
  }

  async recognizeText(filePath: string): Promise<string> {
    if (!this.client) {
      throw new Error('Google Vision API not configured');
    }

    const startTime = Date.now();

    const client = this.client;

    try {
      const [response] = await this.executeWithRetry(
        'Vision API text detection',
        async () => {
          this.logger.log(`Processing image with Google Vision: ${filePath}`);
          return await client.textDetection({
            image: { source: { filename: filePath } },
          });
        },
      );

      const detections = response.textAnnotations;

      if (!detections || detections.length === 0) {
        this.logger.warn('No text detected in image');
        return '';
      }

      // First annotation contains the full text
      const fullText = detections[0].description || '';

      const duration = Date.now() - startTime;
      this.logger.log(`Vision API extracted ${fullText.length} characters in ${duration}ms`);
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

    const startTime = Date.now();

    const client = this.client;

    try {
      const [response] = await this.executeWithRetry(
        'Vision API document text detection',
        async () => {
          this.logger.log(`Processing document with Google Vision: ${filePath}`);
          return await client.documentTextDetection({
            image: { source: { filename: filePath } },
          });
        },
      );

      const fullTextAnnotation = response.fullTextAnnotation;

      if (!fullTextAnnotation) {
        this.logger.warn('No text detected in document');
        return '';
      }

      const fullText = fullTextAnnotation.text || '';

      const duration = Date.now() - startTime;
      this.logger.log(
        `Vision API (document mode) extracted ${fullText.length} characters in ${duration}ms`,
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

    const startTime = Date.now();

    const client = this.client;

    try {
      const [response] = await this.executeWithRetry(
        'Vision API document text detection (buffer)',
        async () => {
          return await client.documentTextDetection({
            image: { content: image },
          });
        },
      );

      const fullText = response.fullTextAnnotation?.text || '';

      const duration = Date.now() - startTime;
      this.logger.debug(`Vision API buffer OCR completed in ${duration}ms`);

      return fullText;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Vision API document OCR (buffer) failed', message);
      throw error;
    }
  }

  // Async PDF OCR via GCS bucket intentionally removed (cost control).
}
