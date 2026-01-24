import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FilesService } from '../files/files.service';
import * as fs from 'fs';
import { EditLogsService } from '../edit-logs/edit-logs.service';
import { AiExtractionService } from '../ocr/ai-extraction.service';
import { PdfConverterService } from '../ocr/pdf-converter.service';
import { VisionOcrService } from '../ocr/vision-ocr.service';
import { UserRole } from '../../common/enums/role.enum';
import { UnitBisnis } from '../../common/enums/unit-bisnis.enum';
import { CreateLetterDto } from './dto/create-letter.dto';
import { OcrPreviewDto } from './dto/ocr-preview.dto';
import { UpdateLetterDto } from './dto/update-letter.dto';
import { Letter } from './letter.entity';
import { OcrPreviewCacheService } from './ocr-preview-cache.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';

export interface AuthenticatedUser {
  userId: string;
  username?: string;
  role: UserRole;
  unitBisnis?: UnitBisnis | null;
}

@Injectable()
export class LettersService {
  private readonly logger = new Logger(LettersService.name);

  constructor(
    private readonly visionOcrService: VisionOcrService,
    private readonly pdfConverterService: PdfConverterService,
    private readonly filesService: FilesService,
    private readonly editLogsService: EditLogsService,
    private readonly aiExtractionService: AiExtractionService,
    private readonly ocrPreviewCache: OcrPreviewCacheService,
    private readonly webSocketGateway: WebSocketGateway,
    @InjectRepository(Letter)
    private readonly lettersRepo: Repository<Letter>,
  ) {}

  private assertCanAccessLetter(letter: Letter, user: AuthenticatedUser) {
    if (user.role === UserRole.ADMIN || user.role === UserRole.MANAJEMEN) {
      return;
    }

    if (user.role === UserRole.USER && user.unitBisnis) {
      if (letter.unitBisnis === user.unitBisnis) return;
    }

    throw new ForbiddenException('Anda tidak memiliki akses ke dokumen ini');
  }

  async findOneForUser(id: string, user: AuthenticatedUser) {
    const found = await this.lettersRepo.findOne({ where: { id } });
    if (!found) {
      throw new NotFoundException('Letter not found');
    }
    this.assertCanAccessLetter(found, user);
    return found;
  }

  async findOneByFileIdForUser(fileId: string, user: AuthenticatedUser) {
    const found = await this.lettersRepo.findOne({ where: { fileId } });
    if (!found) {
      throw new NotFoundException('Letter not found');
    }
    this.assertCanAccessLetter(found, user);
    return found;
  }

  async previewOcr(dto: OcrPreviewDto) {
    const method = dto.extractionMethod || 'ai';
    const cacheTtlRaw = Number(
      process.env.OCR_PREVIEW_CACHE_TTL_SECONDS ?? 10 * 60,
    );
    const cacheTtlSeconds = Number.isFinite(cacheTtlRaw)
      ? Math.max(cacheTtlRaw, 0)
      : 10 * 60;
    const cacheKey = this.ocrPreviewCache.makeKey({
      kind: 'ocrPreview',
      fileId: dto.fileId,
      method,
    });
    if (cacheTtlSeconds > 0) {
      const cached = this.ocrPreviewCache.get<unknown>(cacheKey);
      if (cached) return cached as any;
    }

    const file = await this.filesService.getFile(dto.fileId);
    const isPdf = this.pdfConverterService.isPdf(file.filePath);

    // Use Google Vision API if available, otherwise fallback to Tesseract
    let ocrRawText: string;

    const maxPagesRaw = Number(process.env.PDF_OCR_MAX_PAGES ?? 10); // Optimized: 10 instead of 25
    const maxPages = Number.isFinite(maxPagesRaw)
      ? Math.max(maxPagesRaw, 1)
      : 10;

    const pageConcurrencyRaw = Number(
      process.env.PDF_OCR_PAGE_CONCURRENCY ?? 2,
    );
    const pageConcurrency = Number.isFinite(pageConcurrencyRaw)
      ? Math.max(pageConcurrencyRaw, 1)
      : 2;

    const maxCharsRaw = Number(process.env.OCR_RAW_TEXT_MAX_CHARS ?? 20000);
    const maxChars = Number.isFinite(maxCharsRaw)
      ? Math.max(maxCharsRaw, 1000)
      : 20000;

    // If PDF, convert to images first
    if (isPdf) {
      if (!this.visionOcrService.isAvailable()) {
        throw new BadRequestException(
          'Google Vision API tidak tersedia. Pastikan GOOGLE_APPLICATION_CREDENTIALS sudah diset.',
        );
      }

      this.logger.log(
        `Detected PDF file, OCR via in-memory page images (maxPages=${maxPages}, concurrency=${pageConcurrency})...`,
      );

      const pageTexts: string[] = [];
      const inFlight = new Set<Promise<void>>();

      const schedule = (pageIndex: number, buf: Buffer) => {
        const task = (async () => {
          const pageText =
            await this.visionOcrService.recognizeDocumentBuffer(buf);
          pageTexts[pageIndex] = `--- Page ${pageIndex + 1} ---\n${pageText}`;
        })().finally(() => {
          inFlight.delete(task);
        });
        inFlight.add(task);
      };

      let pageIndex = 0;
      for await (const pageImage of this.pdfConverterService.iteratePageImages(
        file.filePath,
        { scale: 1.5 }, // Optimized scale (40% faster)
      )) {
        if (pageIndex >= maxPages) {
          throw new BadRequestException(
            `PDF terlalu banyak halaman (maksimal ${maxPages}). Mohon crop/pecah PDF sebelum upload.`,
          );
        }

        while (inFlight.size >= pageConcurrency) {
          await Promise.race(inFlight);
        }

        schedule(pageIndex, pageImage);
        pageIndex++;
      }

      await Promise.all(inFlight);

      const totalPages = pageIndex;
      this.logger.log(`✓ OCR completed: ${totalPages} pages processed (scale: 1.5x, concurrency: ${pageConcurrency})`);

      ocrRawText = pageTexts.filter(Boolean).join('\n\n');
    } else {
      // Regular image file
      if (this.visionOcrService.isAvailable()) {
        this.logger.log('Using Google Vision API for OCR');
        ocrRawText = await this.visionOcrService.recognizeDocument(
          file.filePath,
        );
      } else {
        throw new BadRequestException(
          'Google Vision API tidak tersedia. Pastikan GOOGLE_APPLICATION_CREDENTIALS sudah diset.',
        );
      }
    }

    if (ocrRawText.length > maxChars) {
      ocrRawText = ocrRawText.slice(0, maxChars) + '\n\n...[truncated]';
    }

    // If user explicitly requested AI but it's not available, throw error
    if (method === 'ai' && !this.aiExtractionService.isAvailable()) {
      throw new BadRequestException(
        'AI extraction tidak tersedia. Pastikan GROQ_API_KEY sudah diset di .env',
      );
    }

    const useAI =
      method === 'ai' ||
      (method === 'auto' && this.aiExtractionService.isAvailable());

    // Try AI extraction if requested or auto with available API
    if (useAI) {
      const aiResult =
        await this.aiExtractionService.extractFromOcrText(ocrRawText);

      // If user explicitly chose AI, always return AI result
      // If auto mode, only use AI if it found meaningful data
      const hasData =
        aiResult.letterNumber || aiResult.namaPengirim || aiResult.perihal;
      const shouldUseAiResult = method === 'ai' || hasData;

      if (shouldUseAiResult) {
        const response = {
          letterNumber: aiResult.letterNumber,
          candidates: aiResult.letterNumber ? [aiResult.letterNumber] : [],
          tanggalSurat: aiResult.tanggalSurat,
          namaPengirim: aiResult.namaPengirim,
          alamatPengirim: aiResult.alamatPengirim,
          teleponPengirim: aiResult.teleponPengirim,
          namaPenerima: aiResult.namaPenerima,
          senderConfidence: aiResult.confidence,
          senderSource: 'ai' as const,
          perihal: aiResult.perihal,
          nominalList: aiResult.nominalList,
          totalNominal: aiResult.totalNominal,
          ocrRawText,
          ocrConfidence: {
            overallScore:
              aiResult.confidence === 'high'
                ? 85
                : aiResult.confidence === 'medium'
                  ? 60
                  : 30,
            overallConfidence: aiResult.confidence,
            details: {
              letterNumber: aiResult.letterNumber ? 25 : 0,
              tanggalSurat: aiResult.tanggalSurat ? 20 : 0,
              namaPengirim: aiResult.namaPengirim ? 20 : 0,
              perihal: aiResult.perihal ? 15 : 0,
              textQuality: 15,
            },
          },
          extractionMethod: 'ai',
        };

        if (cacheTtlSeconds > 0) {
          this.ocrPreviewCache.set(cacheKey, response, cacheTtlSeconds);
        }

        return response;
      }
    }

    // Always use AI - no regex fallback
    throw new BadRequestException(
      'AI extraction failed. Pastikan GROQ_API_KEY sudah diset di .env',
    );
  }

  async create(dto: CreateLetterDto) {
    // Validate unit bisnis is provided
    if (!dto.unitBisnis) {
      throw new Error('Unit bisnis harus disediakan');
    }

    const meta = dto.fileId
      ? await this.filesService.getFile(dto.fileId)
      : null;

    const letter = this.lettersRepo.create({
      letterNumber: dto.letterNumber,
      jenisSurat: dto.jenisSurat,
      jenisDokumen: dto.jenisDokumen,
      unitBisnis: dto.unitBisnis,
      tanggalSurat: dto.tanggalSurat,
      namaPengirim: dto.namaPengirim || null,
      alamatPengirim: dto.alamatPengirim || null,
      teleponPengirim: dto.teleponPengirim || null,
      perihal: dto.perihal || null,
      totalNominal: dto.totalNominal,
      nominalList: [],
      fileId: dto.fileId,
      fileUrl: meta?.urlFull,
    });

    const saved = await this.lettersRepo.save(letter);

    // Broadcast document update via WebSocket
    this.webSocketGateway.broadcastDocumentUpdate(saved);

    return saved;
  }

  async findAll(
    keyword?: string,
    letterNumber?: string,
    namaPengirim?: string,
    perihal?: string,
    jenisDokumen?: 'SURAT' | 'INVOICE' | 'INTERNAL_MEMO' | 'PAD',
    jenisSurat?: 'MASUK' | 'KELUAR',
    unitBisnis?: string,
    tanggalMulai?: string,
    tanggalSelesai?: string,
    nominalMin?: number,
    nominalMax?: number,
    page = 1,
    limit = 10,
  ) {
    const safeLimit = Math.min(Math.max(limit ?? 10, 1), 100);
    const safePage = Math.max(page ?? 1, 1);

    // Use QueryBuilder for better OR condition support
    try {
      const queryBuilder = this.lettersRepo
        .createQueryBuilder('letter')
        .select([
          'letter.id',
          'letter.letterNumber',
          'letter.jenisSurat',
          'letter.jenisDokumen',
          'letter.unitBisnis',
          'letter.tanggalSurat',
          'letter.namaPengirim',
          'letter.perihal',
          'letter.createdAt',
        ]);

      // Apply specific filters first (use LIKE for MariaDB)
      if (letterNumber) {
        queryBuilder.andWhere('letter.letterNumber LIKE :letterNumber', {
          letterNumber: `%${letterNumber}%`,
        });
      }

      if (namaPengirim) {
        queryBuilder.andWhere('letter.namaPengirim LIKE :namaPengirim', {
          namaPengirim: `%${namaPengirim}%`,
        });
      }

      if (perihal) {
        queryBuilder.andWhere('letter.perihal LIKE :perihal', {
          perihal: `%${perihal}%`,
        });
      }

      if (jenisDokumen) {
        queryBuilder.andWhere('letter.jenisDokumen = :jenisDokumen', {
          jenisDokumen,
        });
      }

      if (jenisSurat) {
        queryBuilder.andWhere('letter.jenisSurat = :jenisSurat', {
          jenisSurat,
        });
      }

      if (unitBisnis) {
        queryBuilder.andWhere('letter.unitBisnis = :unitBisnis', {
          unitBisnis,
        });
      }

      // Date range filter
      if (tanggalMulai || tanggalSelesai) {
        if (tanggalMulai && tanggalSelesai) {
          queryBuilder.andWhere(
            'letter.tanggalSurat BETWEEN :tanggalMulai AND :tanggalSelesai',
            {
              tanggalMulai,
              tanggalSelesai,
            },
          );
        } else if (tanggalMulai) {
          queryBuilder.andWhere('letter.tanggalSurat >= :tanggalMulai', {
            tanggalMulai,
          });
        } else if (tanggalSelesai) {
          queryBuilder.andWhere('letter.tanggalSurat <= :tanggalSelesai', {
            tanggalSelesai,
          });
        }
      }

      // Nominal range filter
      if (nominalMin || nominalMax) {
        if (nominalMin && nominalMax) {
          queryBuilder.andWhere(
            'letter.totalNominal BETWEEN :nominalMin AND :nominalMax',
            {
              nominalMin,
              nominalMax,
            },
          );
        } else if (nominalMin) {
          queryBuilder.andWhere('letter.totalNominal >= :nominalMin', {
            nominalMin,
          });
        } else if (nominalMax) {
          queryBuilder.andWhere('letter.totalNominal <= :nominalMax', {
            nominalMax,
          });
        }
      }

      // Keyword search across multiple fields (use LIKE for MariaDB)
      if (keyword) {
        queryBuilder.andWhere(
          '(letter.letterNumber LIKE :keyword OR letter.namaPengirim LIKE :keyword OR letter.perihal LIKE :keyword OR letter.jenisSurat LIKE :keyword OR letter.jenisDokumen LIKE :keyword OR letter.unitBisnis LIKE :keyword)',
          { keyword: `%${keyword}%` },
        );
        this.logger.log(
          `Keyword search: "${keyword}" - searching in letterNumber, namaPengirim, perihal, jenisSurat, jenisDokumen, unitBisnis`,
        );
      }

      // Order and pagination
      const [data, total] = await queryBuilder
        .orderBy('letter.createdAt', 'DESC')
        .take(safeLimit)
        .skip((safePage - 1) * safeLimit)
        .getManyAndCount();

      this.logger.log(`Query successful: found ${total} results`);

      return {
        data,
        meta: {
          total,
          page: safePage,
          limit: safeLimit,
          pageCount: Math.ceil(total / safeLimit),
        },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Database query failed: ${message}`, stack);
      throw new InternalServerErrorException('Search query failed');
    }
  }

  async findOne(id: string) {
    const found = await this.lettersRepo.findOne({ where: { id } });
    if (!found) {
      throw new NotFoundException('Letter not found');
    }
    return found;
  }

  async updateForUser(
    id: string,
    dto: UpdateLetterDto,
    user: AuthenticatedUser,
    updatedBy?: string,
  ) {
    const existing = await this.findOneForUser(id, user);
    const before = { ...existing };
    let fileUrl = existing.fileUrl;
    if (dto.fileId) {
      const file = await this.filesService.getFile(dto.fileId);
      fileUrl = file.urlFull;
    }

    const merged = this.lettersRepo.merge(existing, dto, { fileUrl });
    const saved = await this.lettersRepo.save(merged);

    if (updatedBy) {
      const changes = Object.entries(dto).filter(([field, newValue]) => {
        const oldValue = (before as Record<string, unknown>)[field];
        return (
          this.normalizeLogValue(oldValue) !== this.normalizeLogValue(newValue)
        );
      });

      await Promise.all(
        changes.map(([field, newValue]) =>
          this.editLogsService.addLog({
            letterId: saved.id,
            field,
            oldValue: this.normalizeLogValue(
              (before as Record<string, unknown>)[field],
            ),
            newValue: this.normalizeLogValue(newValue),
            updatedBy,
          }),
        ),
      );
    }

    // Broadcast document update via WebSocket AFTER logs are saved
    this.webSocketGateway.broadcastDocumentUpdate(saved);


    return saved;
  }
  private normalizeLogValue(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '[unserializable]';
      }
    }
    if (typeof value === 'string') return value;
    if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      return String(value);
    }
    if (typeof value === 'symbol') return value.toString();
    if (typeof value === 'function') return value.name || '[function]';
    return '[unknown]';
  }

  async getFilePath(fileId: string): Promise<string> {
    const file = await this.filesService.getFile(fileId);
    return file.filePath;
  }

  async getPreviewImage(fileId: string): Promise<string> {
    const filePath = await this.getFilePath(fileId);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found on server');
    }

    if (this.pdfConverterService.isPdf(filePath)) {
      return this.pdfConverterService.convertFirstPage(filePath);
    }

    return filePath;
  }
}
