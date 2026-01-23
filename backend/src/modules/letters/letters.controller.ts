import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  Request,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import * as fs from 'fs';
import { join } from 'path';
import { Request as ExpressRequest } from 'express';
import { CreateLetterDto } from './dto/create-letter.dto';
import { OcrPreviewDto } from './dto/ocr-preview.dto';
import { ListLettersQueryDto } from './dto/list-letters-query.dto';
import { UpdateLetterDto } from './dto/update-letter.dto';
import { LettersService } from './letters.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from './letters.service';
import { OcrPreviewQueueService } from './ocr-preview.queue';
import type { UnitBisnis } from '../../common/enums/unit-bisnis.enum';
import { SignatureRequestsService } from '../signature-requests/signature-requests.service';

@Controller('letters')
@UseGuards(JwtAuthGuard)
export class LettersController {
  private readonly logger = new Logger(LettersController.name);

  constructor(
    private readonly lettersService: LettersService,
    private readonly ocrQueue: OcrPreviewQueueService,
    private readonly signatureRequestsService: SignatureRequestsService,
  ) {}

  @Get(':id/download-pdf')
  async downloadAsPdf(
    @Param('id') id: string,
    @Req() req: ExpressRequest & { user: AuthenticatedUser },
    @Res() res: Response,
  ) {
    const letter = await this.lettersService.findOneForUser(id, req.user);
    if (!letter || !letter.fileId) {
      res.status(404).send('Not found');
      return;
    }
    const filePath = await this.lettersService.getFilePath(letter.fileId);

    // Set headers for download
    const cleanLetterNumber = (letter.letterNumber || 'document').replace(
      /[^a-zA-Z0-9-_]/g,
      '_',
    );
    const filename = `${cleanLetterNumber}.pdf`;

    // Add CORS headers manually since we're using @Res()
    const origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Use octet-stream to bypass IDM interception (browser will handle as blob)
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    if (filePath.toLowerCase().endsWith('.pdf')) {
      createReadStream(filePath).pipe(res);
      return;
    }

    // Convert Image to PDF on the fly
    try {
      const { PDFDocument } = await import('pdf-lib');
      const sharp = await import('sharp');

      const docImage = sharp.default(filePath);
      const buffer = await docImage.png().toBuffer();

      const pdfDoc = await PDFDocument.create();
      const imageEmbed = await pdfDoc.embedPng(buffer);
      const page = pdfDoc.addPage([imageEmbed.width, imageEmbed.height]);
      page.drawImage(imageEmbed, {
        x: 0,
        y: 0,
        width: imageEmbed.width,
        height: imageEmbed.height,
      });

      const pdfBytes = await pdfDoc.save();
      res.send(Buffer.from(pdfBytes));
    } catch (e) {
      this.logger.error('PDF Conversion failed', e);
      res.status(500).send('Conversion failed');
    }
  }

  /**
   * Download signed PDF with all signatures embedded (lazy generation)
   * Using POST to bypass IDM interception
   */
  @Post(':id/signed-pdf')
  async downloadSignedPdf(
    @Param('id') id: string,
    @Req() req: ExpressRequest & { user: AuthenticatedUser },
    @Res() res: Response,
  ) {
    // Verify user has access to this letter
    const letter = await this.lettersService.findOneForUser(id, req.user);
    if (!letter) {
      res.status(404).send('Letter not found');
      return;
    }

    try {
      const { buffer, filename } =
        await this.signatureRequestsService.getOrGenerateSignedPdf(id);

      // Add CORS headers
      const origin = req.headers.origin;
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      // Set headers for download
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );

      res.send(buffer);
    } catch (e: any) {
      this.logger.error('Signed PDF generation failed', e);
      res.status(e.status || 500).send(e.message || 'Generation failed');
    }
  }

  @Post('signed-image-preview')
  async previewSignedImage(
    @Body('filename') filename: string,
    @Req() req: ExpressRequest & { user: AuthenticatedUser },
    @Res() res: Response,
  ) {
    if (!filename) {
      res.status(400).send('Filename is required');
      return;
    }

    const match = /^signed-([0-9a-fA-F-]{36})-/.exec(filename);
    if (!match) {
      res.status(400).send('Invalid filename');
      return;
    }
    await this.lettersService.findOneForUser(match[1], req.user);

    const filePath = join(process.cwd(), 'uploads', 'signed', filename);

    // Security check
    if (
      filename.includes('..') ||
      filename.includes('/') ||
      filename.includes('\\')
    ) {
      res.status(400).send('Invalid filename');
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).send('Not found');
      return;
    }

    // Obfuscate Content-Type to bypass IDM interception for PREVIEW
    // For preview we prefer octet-stream so browser doesn't hijack, but frontend handles blob.
    // Actually frontend POST handles it.
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const stream = createReadStream(filePath);
    stream.pipe(res);
  }

  @Get('signed-image-download/:filename')
  async downloadSignedImage(
    @Param('filename') filename: string,
    @Query('downloadName') downloadName: string,
    @Req() req: ExpressRequest & { user: AuthenticatedUser },
    @Res() res: Response,
  ) {
    const match = /^signed-([0-9a-fA-F-]{36})-/.exec(filename);
    if (!match) {
      res.status(400).send('Invalid filename');
      return;
    }
    await this.lettersService.findOneForUser(match[1], req.user);

    const filePath = join(process.cwd(), 'uploads', 'signed', filename);

    // Security check
    if (
      filename.includes('..') ||
      filename.includes('/') ||
      filename.includes('\\')
    ) {
      res.status(400).send('Invalid filename');
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).send('Not found');
      return;
    }

    // Add CORS headers manually since we're using @Res()
    const origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Set headers for proper download
    const finalName = downloadName || filename;
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${finalName}"`);

    const stream = createReadStream(filePath);
    stream.pipe(res);
  }

  @Get('pdf-preview/:fileId')
  async streamPdf(
    @Param('fileId') fileId: string,
    @Req() req: ExpressRequest & { user: AuthenticatedUser },
    @Res() res: Response,
  ) {
    await this.lettersService.findOneByFileIdForUser(fileId, req.user);
    const filePath = await this.lettersService.getFilePath(fileId);

    // Obfuscate Content-Type to bypass IDM interception
    // IDM monitors application/pdf, so we send as generic binary
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Stream file
    const stream = createReadStream(filePath);
    stream.pipe(res);
  }

  @Get(':id/preview-image')
  async previewImage(
    @Param('id') id: string,
    @Req() req: ExpressRequest & { user: AuthenticatedUser },
    @Res() res: Response,
  ) {
    const letter = await this.lettersService.findOneForUser(id, req.user);
    if (!letter || !letter.fileId) {
      // Return 404 or maybe a default placeholder logic?
      // For now 404
      res.status(404).send('Not found');
      return;
    }

    const imagePath = await this.lettersService.getPreviewImage(letter.fileId);

    const lower = imagePath.toLowerCase();
    const contentType = lower.endsWith('.png')
      ? 'image/png'
      : lower.endsWith('.webp')
        ? 'image/webp'
        : lower.endsWith('.gif')
          ? 'image/gif'
          : 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    const stream = createReadStream(imagePath);
    stream.pipe(res);
  }

  @Post('ocr-preview')
  ocrPreview(
    @Body() dto: OcrPreviewDto,
    @Req() req: ExpressRequest & { user: AuthenticatedUser },
    @Query('sync') sync?: string,
  ) {
    const isSync = sync === 'true';
    if (isSync) {
      return this.lettersService.previewOcr(dto);
    }
    return this.ocrQueue.enqueue(dto, req.user);
  }

  @Get('ocr-preview/:jobId')
  async getOcrPreviewJob(
    @Param('jobId') jobId: string,
    @Req() req: ExpressRequest & { user: AuthenticatedUser },
  ) {
    const job = await this.ocrQueue.getJobForUser(jobId, req.user);
    if (!job) {
      throw new NotFoundException('OCR job not found');
    }
    return OcrPreviewQueueService.toStatusResponse(job);
  }

  @Post()
  create(
    @Body() dto: CreateLetterDto,
    @Request()
    req: ExpressRequest & {
      user?: { username?: string; role?: string; unitBisnis?: UnitBisnis };
    },
  ) {
    // Auto-fill unit bisnis for regular users
    if (
      req.user?.role !== 'ADMIN' &&
      req.user?.role !== 'MANAJEMEN' &&
      req.user?.unitBisnis
    ) {
      dto.unitBisnis = req.user.unitBisnis;
    }

    return this.lettersService.create(dto);
  }

  @Get()
  findAll(
    @Query() query: ListLettersQueryDto,
    @Request()
    req: ExpressRequest & {
      user?: { username?: string; role?: string; unitBisnis?: UnitBisnis };
    },
  ) {
    // Determine unit bisnis filter based on user role
    let unitBisnisFilter = query.unitBisnis;

    // If user is not admin or manajemen, filter by their unit bisnis
    if (
      req.user?.role !== 'ADMIN' &&
      req.user?.role !== 'MANAJEMEN' &&
      req.user?.unitBisnis
    ) {
      unitBisnisFilter = req.user.unitBisnis;
    }

    return this.lettersService.findAll(
      query.keyword,
      query.letterNumber,
      query.namaPengirim,
      query.perihal,
      query.jenisDokumen,
      query.jenisSurat,
      unitBisnisFilter,
      query.tanggalMulai,
      query.tanggalSelesai,
      query.nominalMin,
      query.nominalMax,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: ExpressRequest & { user: AuthenticatedUser },
  ) {
    return this.lettersService.findOneForUser(id, req.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLetterDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ) {
    const updatedBy = req.user?.username;
    if (!req.user) {
      // Should be impossible because controller is guarded, but keep it defensive
      throw new Error('Unauthorized');
    }
    return this.lettersService.updateForUser(id, dto, req.user, updatedBy);
  }
}
