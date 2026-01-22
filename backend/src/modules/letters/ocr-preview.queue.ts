import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { LettersService, type AuthenticatedUser } from './letters.service';
import type { OcrPreviewDto } from './dto/ocr-preview.dto';

export interface OcrPreviewJobData {
  requestedBy: string;
  dto: OcrPreviewDto;
}

@Injectable()
export class OcrPreviewQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OcrPreviewQueueService.name);
  private connection: IORedis | null = null;
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private jobTimeoutMs = 120000;

  constructor(private readonly lettersService: LettersService) {}

  private async runWithTimeout<T>(
    ms: number,
    task: () => Promise<T>,
  ): Promise<T> {
    if (!Number.isFinite(ms) || ms <= 0) {
      return task();
    }

    let timer: NodeJS.Timeout | null = null;
    try {
      return await Promise.race([
        task(),
        new Promise<T>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error('OCR job timeout')), ms);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    const connection = redisUrl
      ? new IORedis(redisUrl, { maxRetriesPerRequest: null })
      : new IORedis({
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: Number(process.env.REDIS_PORT || 6379),
          password: process.env.REDIS_PASSWORD || undefined,
          maxRetriesPerRequest: null,
        });

    this.connection = connection;
    const timeoutRaw = Number(process.env.OCR_JOB_TIMEOUT_MS ?? 120000);
    this.jobTimeoutMs = Number.isFinite(timeoutRaw)
      ? Math.max(timeoutRaw, 1000)
      : 120000;

    this.queue = new Queue('ocr-preview', {
      connection,
      defaultJobOptions: {
        removeOnComplete: { age: 60 * 60, count: 1000 }, // 1h or 1000 jobs
        removeOnFail: { age: 6 * 60 * 60, count: 1000 }, // 6h or 1000 jobs
      },
    });

    const enabled =
      (process.env.OCR_WORKER_ENABLED ?? 'true').toLowerCase() !== 'false';
    if (!enabled) {
      this.logger.log('OCR worker disabled (OCR_WORKER_ENABLED=false)');
      return;
    }

    const concurrency = Math.max(
      Number(process.env.OCR_WORKER_CONCURRENCY || 1),
      1,
    );
    this.worker = new Worker<OcrPreviewJobData, unknown>(
      'ocr-preview',
      async (job) => {
        return this.runWithTimeout(this.jobTimeoutMs, () =>
          this.lettersService.previewOcr(job.data.dto),
        );
      },
      { connection, concurrency },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `OCR job failed id=${job?.id} fileId=${job?.data?.dto?.fileId}: ${err?.message || err}`,
      );
    });

    this.worker.on('completed', (job) => {
      this.logger.log(
        `OCR job completed id=${job.id} fileId=${job.data.dto.fileId}`,
      );
    });

    this.logger.log(`OCR worker started (concurrency=${concurrency})`);
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
    await this.connection?.quit();
  }

  async enqueue(dto: OcrPreviewDto, user: AuthenticatedUser) {
    if (!this.queue) {
      throw new Error('OCR queue not initialized');
    }
    const job = await this.queue.add('preview', {
      requestedBy: user.userId,
      dto,
    });
    return { jobId: job.id };
  }

  async getJobForUser(jobId: string, user: AuthenticatedUser) {
    if (!this.queue) {
      throw new Error('OCR queue not initialized');
    }
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return null;
    }
    const data = job.data as OcrPreviewJobData;
    if (data.requestedBy !== user.userId) {
      // Only the requester can see result (admin/manajemen can be added later if needed)
      return null;
    }
    return job;
  }

  static async toStatusResponse(job: Job<OcrPreviewJobData, unknown>) {
    const state = await job.getState();
    const base = {
      id: job.id,
      state,
      progress: job.progress,
      createdAt: job.timestamp,
    };

    if (state === 'completed') {
      return { ...base, result: job.returnvalue };
    }

    if (state === 'failed') {
      return { ...base, error: job.failedReason };
    }

    return base;
  }
}
