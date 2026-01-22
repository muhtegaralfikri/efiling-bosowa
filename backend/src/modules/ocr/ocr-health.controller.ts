import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OcrHealthService } from './ocr-health.service';
import type { AuthenticatedUser } from '../letters/letters.service';

/**
 * Controller for OCR service health monitoring
 * Provides endpoints to check OCR API status and performance
 */
@Controller('ocr-health')
@UseGuards(JwtAuthGuard)
export class OcrHealthController {
  constructor(private readonly healthService: OcrHealthService) {}

  /**
   * Get overall health status of OCR services
   * Returns availability of Vision API and AI Extraction, plus performance metrics
   */
  @Get()
  async getStatus() {
    const health = await this.healthService.getHealthStatus();
    const stats = this.healthService.getPerformanceStats();

    return {
      ...health,
      performance: stats,
    };
  }

  /**
   * Get performance statistics only
   * Returns average latency and sample count
   */
  @Get('performance')
  async getPerformance() {
    return this.healthService.getPerformanceStats();
  }

  /**
   * Reset latency tracking (for testing/debugging)
   * Clears the recorded latency samples
   */
  @Get('reset-stats')
  async resetStats() {
    this.healthService.resetLatencyTracking();
    return {
      message: 'Latency tracking reset successfully',
    };
  }
}
