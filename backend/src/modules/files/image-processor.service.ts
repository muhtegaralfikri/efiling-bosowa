import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ImageProcessorService {
  private readonly logger = new Logger(ImageProcessorService.name);

  private readonly MAX_WIDTH = 2000;
  private readonly MAX_HEIGHT = 2000;
  private readonly JPEG_QUALITY = 85;
  private readonly PNG_COMPRESSION = 8;
  private readonly WEBP_QUALITY = 82;

  async compressImage(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();

    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return filePath;
    }

    try {
      const image = sharp(filePath);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        return filePath;
      }

      const needsResize =
        metadata.width > this.MAX_WIDTH || metadata.height > this.MAX_HEIGHT;

      let pipeline = image;

      if (needsResize) {
        pipeline = pipeline.resize(this.MAX_WIDTH, this.MAX_HEIGHT, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      const compressedPath = filePath.replace(ext, `_compressed${ext}`);

      if (ext === '.png') {
        await pipeline
          .png({ compressionLevel: this.PNG_COMPRESSION })
          .toFile(compressedPath);
      } else if (ext === '.webp') {
        await pipeline
          .webp({ quality: this.WEBP_QUALITY })
          .toFile(compressedPath);
      } else {
        await pipeline
          .jpeg({ quality: this.JPEG_QUALITY, mozjpeg: true })
          .toFile(compressedPath);
      }

      const [originalStats, compressedStats] = await Promise.all([
        fs.stat(filePath),
        fs.stat(compressedPath),
      ]);

      if (compressedStats.size < originalStats.size) {
        await fs.unlink(filePath);
        await fs.rename(compressedPath, filePath);

        const savedPercent = (
          ((originalStats.size - compressedStats.size) / originalStats.size) *
          100
        ).toFixed(1);

        this.logger.log(
          `Compressed ${path.basename(filePath)}: ${(originalStats.size / 1024).toFixed(1)}KB -> ${(compressedStats.size / 1024).toFixed(1)}KB (${savedPercent}% saved)`,
        );
      } else {
        await fs.unlink(compressedPath);
      }

      return filePath;
    } catch (error) {
      this.logger.warn(`Failed to compress ${filePath}: ${error}`);
      return filePath;
    }
  }
}
