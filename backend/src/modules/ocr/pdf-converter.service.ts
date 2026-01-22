import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';

/**
 * PDF Processing Configuration
 * Optimized for 2GB VPS server
 */
const PDF_CONFIG = {
  // Scale for OCR processing (1.5x = 40% faster than 2.0x with acceptable quality)
  OCR_SCALE: 1.5,
  // Scale for preview (slightly lower for faster loading)
  PREVIEW_SCALE: 1.5,
  // Maximum pages to process (prevents memory issues with large PDFs)
  MAX_PAGES: 10,
} as const;

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
   * Optimized with lower scale and page limit for better performance.
   */
  async *iteratePageImages(
    pdfPath: string,
    opts?: { scale?: number; maxPages?: number },
  ): AsyncGenerator<Buffer> {
    // Dynamic import for pdf-to-img (ESM module)
    const { pdf } = await import('pdf-to-img');

    const scale = opts?.scale ?? PDF_CONFIG.OCR_SCALE;
    const maxPages = opts?.maxPages ?? PDF_CONFIG.MAX_PAGES;
    const document = await pdf(pdfPath, { scale });

    let pageCount = 0;
    for await (const image of document) {
      if (pageCount >= maxPages) {
        this.logger.warn(`Reached max pages limit (${maxPages}), stopping conversion`);
        break;
      }
      // pdf-to-img returns Uint8Array/Buffer depending on runtime
      yield Buffer.isBuffer(image) ? image : Buffer.from(image);
      pageCount++;
    }
  }

  /**
   * Convert PDF to images (one per page)
   * Returns array of image file paths
   * Uses pdf-to-img which is cross-platform (supports Linux)
   * Limited to MAX_PAGES to prevent memory issues
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

      // Use optimized scale and page limit
      const document = await pdf(pdfPath, {
        scale: PDF_CONFIG.OCR_SCALE
      });

      for await (const image of document) {
        // Stop at max pages to prevent memory issues
        if (pageNum > PDF_CONFIG.MAX_PAGES) {
          this.logger.warn(`PDF has more than ${PDF_CONFIG.MAX_PAGES} pages, only processing first ${PDF_CONFIG.MAX_PAGES}`);
          break;
        }

        const imagePath = path.join(outputDir, `page-${pageNum}.png`);
        await fs.writeFile(imagePath, image);
        imagePaths.push(imagePath);
        pageNum++;
      }

      this.logger.log(`Converted PDF to ${imagePaths.length} image(s) (max: ${PDF_CONFIG.MAX_PAGES}, scale: ${PDF_CONFIG.OCR_SCALE}x)`);
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
   * Optimized with lower scale for faster preview generation
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
      // Use optimized scale for preview
      const document = await pdf(pdfPath, {
        scale: PDF_CONFIG.PREVIEW_SCALE
      });

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
