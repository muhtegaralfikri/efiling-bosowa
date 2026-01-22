import { Injectable, Logger } from '@nestjs/common';
import { VisionOcrService } from './vision-ocr.service';
import { AiExtractionService } from './ai-extraction.service';

/**
 * Health check result interface
 */
interface HealthCheckResult {
  visionOcr: {
    available: boolean;
    latency?: number;
    error?: string;
  };
  aiExtraction: {
    available: boolean;
    latency?: number;
    error?: string;
  };
  overall: 'healthy' | 'degraded' | 'down';
  timestamp: string;
}

/**
 * Service for monitoring OCR and AI service health
 * Helps identify performance issues and API availability
 */
@Injectable()
export class OcrHealthService {
  private readonly logger = new Logger(OcrHealthService.name);

  // Track recent request times for performance monitoring
  private recentVisionLatencies: number[] = [];
  private readonly MAX_LATENCY_SAMPLES = 10;

  constructor(
    private readonly visionOcr: VisionOcrService,
    private readonly aiExtraction: AiExtractionService,
  ) {}

  /**
   * Get overall health status of OCR services
   */
  async getHealthStatus(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      visionOcr: { available: false },
      aiExtraction: { available: false },
      overall: 'down',
      timestamp: new Date().toISOString(),
    };

    // Check Vision OCR availability
    if (this.visionOcr.isAvailable()) {
      try {
        const startTime = Date.now();
        // We could do a lightweight ping, but for now we'll check if the service is configured
        // Actual latency is tracked during real requests
        const avgLatency = this.getAverageVisionLatency();

        result.visionOcr = {
          available: true,
          latency: avgLatency,
        };
      } catch (error: unknown) {
        result.visionOcr = {
          available: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    } else {
      result.visionOcr = {
        available: false,
        error: 'Google Vision API not configured',
      };
    }

    // Check AI Extraction availability
    if (this.aiExtraction.isAvailable()) {
      result.aiExtraction = {
        available: true,
      };
    } else {
      result.aiExtraction = {
        available: false,
        error: 'Groq AI not configured',
      };
    }

    // Determine overall health
    const servicesDown = [
      result.visionOcr.available,
      result.aiExtraction.available,
    ].filter(available => !available).length;

    if (servicesDown === 0) {
      result.overall = 'healthy';
    } else if (servicesDown === 1) {
      result.overall = 'degraded';
    } else {
      result.overall = 'down';
    }

    return result;
  }

  /**
   * Record Vision API latency for monitoring
   * Call this after each successful Vision API request
   */
  recordVisionLatency(latencyMs: number): void {
    this.recentVisionLatencies.push(latencyMs);

    // Keep only the last N samples
    if (this.recentVisionLatencies.length > this.MAX_LATENCY_SAMPLES) {
      this.recentVisionLatencies.shift();
    }

    // Log warning if latency is high
    if (latencyMs > 30000) {
      this.logger.warn(`Vision API latency is high: ${latencyMs}ms`);
    }
  }

  /**
   * Get average Vision API latency from recent requests
   */
  getAverageVisionLatency(): number | undefined {
    if (this.recentVisionLatencies.length === 0) {
      return undefined;
    }

    const sum = this.recentVisionLatencies.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.recentVisionLatencies.length);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const avgLatency = this.getAverageVisionLatency();
    const sampleCount = this.recentVisionLatencies.length;

    return {
      averageLatency: avgLatency,
      sampleCount,
      status: avgLatency ? (avgLatency < 10000 ? 'good' : avgLatency < 30000 ? 'acceptable' : 'slow') : 'unknown',
    };
  }

  /**
   * Reset latency tracking (useful for testing)
   */
  resetLatencyTracking(): void {
    this.recentVisionLatencies = [];
    this.logger.log('Vision API latency tracking reset');
  }
}
