import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Signature } from './signature.entity';
import { CreateSignatureDto } from './dto/create-signature.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SignaturesService {
  constructor(
    @InjectRepository(Signature)
    private readonly signatureRepo: Repository<Signature>,
  ) {}

  async findAllByUser(userId: string): Promise<Signature[]> {
    return this.signatureRepo.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Signature> {
    const signature = await this.signatureRepo.findOne({ where: { id } });
    if (!signature) {
      throw new NotFoundException('Signature not found');
    }
    if (signature.userId !== userId) {
      throw new ForbiddenException('You can only access your own signatures');
    }
    return signature;
  }

  /**
   * Find signature by ID without user ownership check (for internal use)
   */
  async findOneById(id: string): Promise<Signature | null> {
    return this.signatureRepo.findOne({ where: { id } });
  }

  async findDefaultByUser(userId: string): Promise<Signature | null> {
    return this.signatureRepo.findOne({
      where: { userId, isDefault: true },
    });
  }

  async create(
    userId: string,
    dto: CreateSignatureDto,
    file?: Express.Multer.File,
  ): Promise<Signature> {
    let imagePath: string;

    if (file) {
      const uploadDir = path.join(process.cwd(), 'uploads', 'signatures');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const ext = this.extensionFromMime(file.mimetype) || '.bin';
      const filename = `${userId}-${Date.now()}${ext}`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, file.buffer);
      imagePath = `/uploads/signatures/${filename}`;
    } else if (dto.base64Image) {
      const uploadDir = path.join(process.cwd(), 'uploads', 'signatures');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const base64Data = dto.base64Image.replace(
        /^data:image\/\w+;base64,/,
        '',
      );
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `${userId}-${Date.now()}-drawn.png`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, buffer);
      imagePath = `/uploads/signatures/${filename}`;
    } else {
      throw new NotFoundException('No signature image provided');
    }

    if (dto.isDefault) {
      await this.signatureRepo.update({ userId }, { isDefault: false });
    }

    // Use TypeORM create/save (safe from SQL injection)
    const signature = this.signatureRepo.create({
      userId,
      imagePath,
      isDefault: dto.isDefault ?? false,
    });
    return this.signatureRepo.save(signature);
  }

  private extensionFromMime(mime: string): string | null {
    switch (mime) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/gif':
        return '.gif';
      case 'image/webp':
        return '.webp';
      default:
        return null;
    }
  }

  async setDefault(id: string, userId: string): Promise<Signature> {
    const signature = await this.findOne(id, userId);
    await this.signatureRepo.update({ userId }, { isDefault: false });
    signature.isDefault = true;
    return this.signatureRepo.save(signature);
  }

  async remove(id: string, userId: string): Promise<void> {
    const signature = await this.findOne(id, userId);
    const wasDefault = signature.isDefault;
    const safeRelative = signature.imagePath.replace(/^[\\/]+/, '');
    const filePath = path.join(process.cwd(), safeRelative);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    await this.signatureRepo.remove(signature);

    // Auto-set default if only one signature remains
    const remaining = await this.signatureRepo.find({ where: { userId } });
    if (remaining.length === 1 && (wasDefault || !remaining[0].isDefault)) {
      remaining[0].isDefault = true;
      await this.signatureRepo.save(remaining[0]);
    }
  }
}
