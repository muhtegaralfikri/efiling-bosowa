import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SignatureRequest,
  SignatureRequestStatus,
} from './signature-request.entity';
import { CreateSignatureRequestDto } from './dto/create-signature-request.dto';
import { SignDocumentDto } from './dto/sign-document.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
import { SignaturesService } from '../signatures/signatures.service';
import { Letter } from '../letters/letter.entity';
import { User } from '../users/user.entity';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import { UserRole } from '../../common/enums/role.enum';
import { UnitBisnis } from '../../common/enums/unit-bisnis.enum';

@Injectable()
export class SignatureRequestsService {
  private readonly logger = new Logger(SignatureRequestsService.name);

  constructor(
    @InjectRepository(SignatureRequest)
    private readonly requestRepo: Repository<SignatureRequest>,
    @InjectRepository(Letter)
    private readonly letterRepo: Repository<Letter>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly signaturesService: SignaturesService,
  ) {}

  private assertCanAccessLetter(
    letter: Letter,
    user: { role: UserRole; unitBisnis?: UnitBisnis | null },
  ) {
    if (user.role === UserRole.ADMIN || user.role === UserRole.MANAJEMEN)
      return;
    if (
      user.role === UserRole.USER &&
      user.unitBisnis &&
      letter.unitBisnis === user.unitBisnis
    ) {
      return;
    }
    throw new ForbiddenException('Anda tidak memiliki akses ke dokumen ini');
  }

  async findOneForUser(
    id: string,
    user: { userId: string; role: UserRole; unitBisnis?: UnitBisnis | null },
  ): Promise<SignatureRequest> {
    const request = await this.findOne(id);
    this.assertCanAccessLetter(request.letter, user);

    if (user.role === UserRole.ADMIN || user.role === UserRole.MANAJEMEN) {
      return request;
    }

    if (
      request.requestedBy === user.userId ||
      request.assignedTo === user.userId
    ) {
      return request;
    }

    throw new ForbiddenException('Anda tidak memiliki akses ke permintaan ini');
  }

  async findByLetterForUser(
    letterId: string,
    user: { role: UserRole; unitBisnis?: UnitBisnis | null },
  ): Promise<SignatureRequest[]> {
    const letter = await this.letterRepo.findOne({ where: { id: letterId } });
    if (!letter) throw new NotFoundException('Letter not found');
    this.assertCanAccessLetter(letter, user);
    return this.findByLetter(letterId);
  }

  async createForUser(
    user: { userId: string; role: UserRole; unitBisnis?: UnitBisnis | null },
    dto: CreateSignatureRequestDto,
  ): Promise<SignatureRequest[]> {
    const letter = await this.letterRepo.findOne({
      where: { id: dto.letterId },
    });
    if (!letter) throw new NotFoundException('Letter not found');
    this.assertCanAccessLetter(letter, user);
    return this.create(user.userId, dto);
  }

  async getSharedSignedPathForUser(
    letterId: string,
    user: { role: UserRole; unitBisnis?: UnitBisnis | null },
  ): Promise<string | null> {
    const letter = await this.letterRepo.findOne({ where: { id: letterId } });
    if (!letter) return null;
    this.assertCanAccessLetter(letter, user);
    return this.getSharedSignedPath(letterId);
  }

  private normalizeUploadsPath(urlOrPath: string): string {
    if (!urlOrPath) {
      throw new BadRequestException('Invalid document/signature path');
    }

    let pathname = urlOrPath;
    if (pathname.startsWith('http')) {
      try {
        pathname = new URL(pathname).pathname;
      } catch {
        // keep as-is
      }
    }

    pathname = pathname.replace(/^[\\/]+/, '');
    // Only allow files under uploads/
    if (!pathname.toLowerCase().startsWith('uploads/')) {
      throw new BadRequestException('Invalid path: must be under uploads');
    }

    return pathname;
  }

  private resolveUploadsDiskPath(urlOrPath: string): string {
    const normalized = this.normalizeUploadsPath(urlOrPath);
    const full = path.resolve(process.cwd(), normalized);
    const uploadsRoot = path.resolve(process.cwd(), 'uploads');
    if (!full.startsWith(uploadsRoot + path.sep)) {
      throw new BadRequestException('Invalid path traversal detected');
    }
    return full;
  }

  async findAll(
    userId: string,
    status?: SignatureRequestStatus,
  ): Promise<SignatureRequest[]> {
    try {
      const where: any = { requestedBy: userId };
      if (status) {
        where.status = status;
      }
      return this.requestRepo.find({
        where,
        relations: ['letter', 'assignee', 'requester'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error('findAll error', error);
      return [];
    }
  }

  async findPendingForUser(userId: string): Promise<SignatureRequest[]> {
    try {
      return this.requestRepo.find({
        where: { assignedTo: userId, status: SignatureRequestStatus.PENDING },
        relations: ['letter', 'requester'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error('findPendingForUser error', error);
      return [];
    }
  }

  async findOne(id: string): Promise<SignatureRequest> {
    const request = await this.requestRepo.findOne({
      where: { id },
      relations: ['letter', 'assignee', 'requester'],
    });
    if (!request) {
      throw new NotFoundException('Signature request not found');
    }
    return request;
  }

  async findByLetter(letterId: string): Promise<SignatureRequest[]> {
    return this.requestRepo.find({
      where: { letterId },
      relations: ['assignee', 'requester'],
      order: { createdAt: 'ASC' },
    });
  }

  async create(
    requestedBy: string,
    dto: CreateSignatureRequestDto,
  ): Promise<SignatureRequest[]> {
    const letter = await this.letterRepo.findOne({
      where: { id: dto.letterId },
    });
    if (!letter) throw new NotFoundException('Letter not found');

    const results: SignatureRequest[] = [];

    for (const assignment of dto.assignments) {
      // Use TypeORM create/save (safe from SQL injection)
      const request = this.requestRepo.create({
        letterId: dto.letterId,
        requestedBy,
        assignedTo: assignment.assignedTo,
        status: SignatureRequestStatus.PENDING,
        positionX: assignment.positionX ?? null,
        positionY: assignment.positionY ?? null,
        positionPage: assignment.positionPage ?? null,
        notes: dto.notes ?? null,
      });
      const saved = await this.requestRepo.save(request);

      // Reload with relations
      const withRelations = await this.requestRepo.findOne({
        where: { id: saved.id },
        relations: ['letter'],
      });

      if (withRelations) {
        results.push(withRelations);

        // Create notification for assignee
        try {
          await this.notificationsService.create(
            assignment.assignedTo,
            NotificationType.SIGNATURE_REQUEST,
            'Permintaan Tanda Tangan',
            `Anda diminta menandatangani dokumen "${letter.letterNumber}"`,
            saved.id,
          );
        } catch (err) {
          this.logger.error('Failed to create notification', err);
        }
      }
    }

    return results;
  }

  async sign(
    id: string,
    userId: string,
    dto: SignDocumentDto,
  ): Promise<SignatureRequest> {
    const request = await this.findOne(id);

    if (request.assignedTo !== userId) {
      throw new ForbiddenException(
        'You are not assigned to sign this document',
      );
    }

    if (request.status !== SignatureRequestStatus.PENDING) {
      throw new BadRequestException('This request is already processed');
    }

    const signature = dto.signatureId
      ? await this.signaturesService.findOne(dto.signatureId, userId)
      : await this.signaturesService.findDefaultByUser(userId);

    if (!signature) {
      throw new BadRequestException(
        'No signature found. Please upload or draw a signature first.',
      );
    }

    const posX = dto.positionX ?? request.positionX ?? 50;
    const posY = dto.positionY ?? request.positionY ?? 50;

    const documentPath = this.normalizeUploadsPath(
      request.letter.fileUrl || '',
    );

    const scale = dto.scale ?? 100;

    // Check if there's already a signed document for this letter
    const existingSignedPath = await this.getSharedSignedPath(request.letterId);
    const signedImagePath = await this.embedSignature(
      documentPath,
      signature.imagePath,
      posX,
      posY,
      request.letterId,
      scale,
      existingSignedPath, // Pass existing signed path if available
    );

    request.status = SignatureRequestStatus.SIGNED;
    request.signedAt = new Date();
    request.signedImagePath = signedImagePath;
    request.positionX = posX;
    request.positionY = posY;

    const saved = await this.requestRepo.save(request);

    // Update all other signature requests for this letter to point to the same signed document
    // Only update those that already have a signedImagePath (all signed requests)
    const otherSignedRequests = await this.requestRepo.find({
      where: {
        letterId: request.letterId,
        status: SignatureRequestStatus.SIGNED,
      },
    });

    for (const otherRequest of otherSignedRequests) {
      if (otherRequest.id !== request.id) {
        // Update other signed requests to use the same signedImagePath
        // Keep position data intact
        otherRequest.signedImagePath = signedImagePath;
        await this.requestRepo.save(otherRequest);
      }
    }

    await this.notificationsService.create(
      request.requestedBy,
      NotificationType.SIGNATURE_COMPLETED,
      'Dokumen Ditandatangani',
      `Dokumen "${request.letter.letterNumber}" telah ditandatangani`,
      saved.id,
    );

    return saved;
  }

  // Get shared signed document path for a letter
  async getSharedSignedPath(letterId: string): Promise<string | null> {
    const letter = await this.letterRepo.findOne({ where: { id: letterId } });
    if (!letter) return null;

    const outputDir = path.join(process.cwd(), 'uploads', 'signed');
    let baseName = '';
    if (letter.fileUrl) {
      try {
        baseName = path.basename(new URL(letter.fileUrl).pathname);
      } catch {
        baseName = path.basename(letter.fileUrl);
      }
    }
    const outputFilename = `signed-${letterId}-${baseName || 'document'}`;
    const outputPath = path.join(outputDir, outputFilename);

    if (fs.existsSync(outputPath)) {
      return `/uploads/signed/${outputFilename}`;
    }
    return null;
  }

  async reject(
    id: string,
    userId: string,
    notes?: string,
  ): Promise<SignatureRequest> {
    const request = await this.findOne(id);

    if (request.assignedTo !== userId) {
      throw new ForbiddenException('You are not assigned to this request');
    }

    if (request.status !== SignatureRequestStatus.PENDING) {
      throw new BadRequestException('This request is already processed');
    }

    request.status = SignatureRequestStatus.REJECTED;
    request.notes = notes ?? request.notes;

    const saved = await this.requestRepo.save(request);

    await this.notificationsService.create(
      request.requestedBy,
      NotificationType.SIGNATURE_REJECTED,
      'Permintaan Ditolak',
      `Permintaan tanda tangan untuk "${request.letter.letterNumber}" ditolak`,
      saved.id,
    );

    return saved;
  }

  async cancel(id: string, userId: string): Promise<void> {
    const request = await this.findOne(id);

    if (request.requestedBy !== userId) {
      throw new ForbiddenException('You can only cancel your own requests');
    }

    if (request.status !== SignatureRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }

    await this.requestRepo.delete(id);
  }

  private async embedSignature(
    documentPath: string,
    signaturePath: string,
    posX: number,
    posY: number,
    letterId: string,
    scale: number = 100,
    existingSignedPath?: string | null,
  ): Promise<string> {
    const docFullPath = this.resolveUploadsDiskPath(documentPath);
    const sigFullPath = this.resolveUploadsDiskPath(signaturePath);

    if (!fs.existsSync(docFullPath) || !fs.existsSync(sigFullPath)) {
      throw new BadRequestException('Document or signature file not found');
    }

    const outputDir = path.join(process.cwd(), 'uploads', 'signed');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Use fixed filename per letter so all signatures go to same document
    const outputFilename = `signed-${letterId}-${path.basename(documentPath)}`;
    const outputPath = path.join(outputDir, outputFilename);

    // Handle PDF files
    if (documentPath.toLowerCase().endsWith('.pdf')) {
      const { PDFDocument } = await import('pdf-lib');

      // Check if signed document already exists
      let pdfDoc: any;
      let pages: any;

      if (fs.existsSync(outputPath) && existingSignedPath) {
        // Load existing signed document and add new signature
        const signedPdfBuffer = fs.readFileSync(outputPath);
        pdfDoc = await PDFDocument.load(signedPdfBuffer);
        pages = pdfDoc.getPages();
        this.logger.log(
          `Adding signature to existing signed document: ${outputFilename}`,
        );
      } else {
        // Create new signed document
        const pdfBuffer = fs.readFileSync(docFullPath);
        pdfDoc = await PDFDocument.load(pdfBuffer);
        pages = pdfDoc.getPages();
        this.logger.log(`Creating new signed document: ${outputFilename}`);
      }

      const page = pages[0];
      const { width, height } = page.getSize();

      const sigPngBuffer = await sharp(sigFullPath).png().toBuffer();
      const sigImage = await pdfDoc.embedPng(sigPngBuffer);

      // Use proportional size as baseline: 25% of document width at scale 100
      // This gives a reasonable default size that can be adjusted by frontend scale
      const baseWidth = width * 0.25;
      const scaleFactor = (baseWidth / sigImage.width) * (scale / 100);
      const sigDims = sigImage.scale(scaleFactor);

      // Position: use center anchor to match frontend CSS transform: translate(-50%, -50%)
      const x = (posX / 100) * width - sigDims.width / 2;
      const y = height - (posY / 100) * height - sigDims.height / 2;

      page.drawImage(sigImage, {
        x,
        y,
        width: sigDims.width,
        height: sigDims.height,
      });

      const pdfBytes = await pdfDoc.save();
      await fsp.writeFile(outputPath, pdfBytes);

      return `/uploads/signed/${outputFilename}`;
    }

    // Handle Image files -> Convert to PDF
    let docImage;
    let docMetadata;

    // Check if there's an existing signed document to use as base
    if (fs.existsSync(outputPath) && existingSignedPath) {
      // Use the existing signed document as base
      const existingPdfPath = this.resolveUploadsDiskPath(existingSignedPath);
      const { PDFDocument } = await import('pdf-lib');
      const existingPdfBuffer = fs.readFileSync(existingPdfPath);
      const existingPdfDoc = await PDFDocument.load(existingPdfBuffer);
      const existingPages = existingPdfDoc.getPages();
      const existingPage = existingPages[0];

      // Extract the image from the existing PDF
      const existingImageWidth = existingPage.getWidth();
      const existingImageHeight = existingPage.getHeight();

      // Create a new PDF document with the existing page content
      docMetadata = { width: existingImageWidth, height: existingImageHeight };

      // For simplicity, we'll convert the PDF back to an image, add signature, then back to PDF
      // In a production environment, you might want a more efficient approach
      docImage = sharp(docFullPath); // Use original document as base
    } else {
      docImage = sharp(docFullPath);
      docMetadata = await docImage.metadata();
    }

    // Get original signature dimensions for scaling
    const sigMetadata = await sharp(sigFullPath).metadata();

    // Use proportional size as baseline: 25% of document width at scale 100
    const docWidth = docMetadata.width || 800;
    const baseWidth = docWidth * 0.25;
    const scaleFactor =
      (baseWidth / (sigMetadata.width || 200)) * (scale / 100);
    const sigWidth = Math.round((sigMetadata.width || 200) * scaleFactor);
    const sigHeight = Math.round((sigMetadata.height || 100) * scaleFactor);

    const signatureBuffer = await sharp(sigFullPath)
      .resize({ width: sigWidth, height: sigHeight, fit: 'inside' })
      .png()
      .toBuffer();

    // Position: use center anchor to match frontend CSS transform: translate(-50%, -50%)
    const x = Math.round((posX / 100) * docWidth - sigWidth / 2);
    const y = Math.round(
      (posY / 100) * (docMetadata.height || 600) - sigHeight / 2,
    );

    let finalImageBuffer;

    if (
      fs.existsSync(outputPath) &&
      existingSignedPath &&
      existingSignedPath.toLowerCase().endsWith('.pdf')
    ) {
      // If we have an existing PDF, we need to work with it directly
      const { PDFDocument } = await import('pdf-lib');
      const existingPdfPath = this.resolveUploadsDiskPath(existingSignedPath);
      const existingPdfBuffer = fs.readFileSync(existingPdfPath);
      const pdfDoc = await PDFDocument.load(existingPdfBuffer);
      const pages = pdfDoc.getPages();
      const page = pages[0];

      const sigPngBuffer = await sharp(sigFullPath).png().toBuffer();
      const sigImage = await pdfDoc.embedPng(sigPngBuffer);

      const { width, height } = page.getSize();

      // Use proportional size as baseline: 25% of document width at scale 100
      const baseWidth = width * 0.25;
      const scaleFactor = (baseWidth / sigImage.width) * (scale / 100);
      const sigDims = sigImage.scale(scaleFactor);

      // Position: use center anchor to match frontend CSS transform: translate(-50%, -50%)
      const pdfX = (posX / 100) * width - sigDims.width / 2;
      const pdfY = height - (posY / 100) * height - sigDims.height / 2;

      page.drawImage(sigImage, {
        x: pdfX,
        y: pdfY,
        width: sigDims.width,
        height: sigDims.height,
      });

      const pdfBytes = await pdfDoc.save();
      await fsp.writeFile(outputPath, pdfBytes);

      return `/uploads/signed/${outputFilename}`;
    } else {
      // Composite signature onto image
      finalImageBuffer = await docImage
        .composite([
          {
            input: signatureBuffer,
            left: x,
            top: y,
          },
        ])
        .png() // Force PNG for embedding
        .toBuffer();
    }

    // Convert to PDF
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    const imageEmbed = await pdfDoc.embedPng(finalImageBuffer);
    const page = pdfDoc.addPage([imageEmbed.width, imageEmbed.height]);

    page.drawImage(imageEmbed, {
      x: 0,
      y: 0,
      width: imageEmbed.width,
      height: imageEmbed.height,
    });

    // Save as PDF
    const pdfOutputFilename = outputFilename.replace(
      path.extname(outputFilename),
      '.pdf',
    );
    const pdfOutputPath = path.join(outputDir, pdfOutputFilename);

    const pdfBytes = await pdfDoc.save();
    await fsp.writeFile(pdfOutputPath, pdfBytes);

    return `/uploads/signed/${pdfOutputFilename}`;
  }
}
