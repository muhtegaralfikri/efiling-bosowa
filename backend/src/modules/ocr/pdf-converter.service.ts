import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';

@Injectable()
export class PdfConverterService {
  private readonly logger = new Logger(PdfConverterService.name);

  /**
   * Check if a file is a PDF based on extension
   */
  isPdf(filePath: string): boolean {
    return filePath.toLowerCase().endsWith('.pdf');
  }

  /**
   * Iterate PDF pages as image buffers (no temp files).
   * Uses pdf-to-img which returns an async iterator of page images.
   */
  async *iteratePageImages(
    pdfPath: string,
    opts?: { scale?: number },
  ): AsyncGenerator<Buffer> {
    // Dynamic import for pdf-to-img (ESM module)
    const { pdf } = await import('pdf-to-img');

    const scale = opts?.scale ?? 2.0;
    const document = await pdf(pdfPath, { scale });

    for await (const image of document) {
      // pdf-to-img returns Uint8Array/Buffer depending on runtime
      yield Buffer.isBuffer(image) ? image : Buffer.from(image);
    }
  }

  /**
   * Convert PDF to images (one per page)
   * Returns array of image file paths
   * Uses pdf-to-img which is cross-platform (supports Linux)
   */
  async convertToImages(pdfPath: string): Promise<string[]> {
    // Dynamic import for pdf-to-img (ESM module)
    const { pdf } = await import('pdf-to-img');

    const pdfDir = path.dirname(pdfPath);
    const pdfName = path.basename(pdfPath, '.pdf');
    const outputDir = path.join(pdfDir, `${pdfName}_pages`);

    // Create output directory
    if (!existsSync(outputDir)) {
      await fs.mkdir(outputDir, { recursive: true });
    }

    try {
      const imagePaths: string[] = [];
      let pageNum = 1;

      // pdf-to-img returns an async iterator of page images
      const document = await pdf(pdfPath, { scale: 2.0 });

      for await (const image of document) {
        const imagePath = path.join(outputDir, `page-${pageNum}.png`);
        await fs.writeFile(imagePath, image);
        imagePaths.push(imagePath);
        pageNum++;
      }

      this.logger.log(`Converted PDF to ${imagePaths.length} image(s)`);
      return imagePaths;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('PDF conversion failed', message);
      throw new Error(`PDF conversion failed: ${message}`);
    }
  }

  /**
   * Convert first page of PDF to image
   * Returns path to the generated image
   */
  async convertFirstPage(pdfPath: string): Promise<string> {
    const { pdf } = await import('pdf-to-img');

    const pdfDir = path.dirname(pdfPath);
    const pdfName = path.basename(pdfPath, '.pdf');
    const outputDir = path.join(pdfDir, `${pdfName}_preview`);

    if (!existsSync(outputDir)) {
      await fs.mkdir(outputDir, { recursive: true });
    }

    try {
      const document = await pdf(pdfPath, { scale: 1.5 });

      // Get only the first page
      for await (const image of document) {
        const imagePath = path.join(outputDir, 'preview-1.png');
        await fs.writeFile(imagePath, image);
        return imagePath;
      }

      throw new Error('Preview generation failed: No pages found in PDF');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('PDF preview generation failed', message);
      throw error;
    }
  }

  /**
   * Clean up converted images after OCR
   */
  async cleanupImages(imagePaths: string[]): Promise<void> {
    for (const imagePath of imagePaths) {
      try {
        await fs.unlink(imagePath);
      } catch {
        // Ignore cleanup errors
      }
    }

    // Try to remove the directory if empty
    if (imagePaths.length > 0) {
      const dir = path.dirname(imagePaths[0]);
      try {
        await fs.rmdir(dir);
      } catch {
        // Directory not empty or other error, ignore
      }
    }
  }
}
