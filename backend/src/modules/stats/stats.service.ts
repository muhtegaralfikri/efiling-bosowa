import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { stat } from 'node:fs/promises';
import { Repository } from 'typeorm';
import { EditLog } from '../edit-logs/edit-log.entity';
import { UploadedFile } from '../files/file.entity';
import { Letter } from '../letters/letter.entity';

type MonthlyStorageRow = { month: string; filePath: string | null };

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(EditLog)
    private readonly editLogsRepo: Repository<EditLog>,
    @InjectRepository(Letter)
    private readonly lettersRepo: Repository<Letter>,
  ) {}

  async getInputErrorStats() {
    type InputErrorRow = { user: string; total: string };
    const raw = await this.editLogsRepo
      .createQueryBuilder('log')
      .select('log.updatedBy', 'user')
      .addSelect('COUNT(log.id)', 'total')
      .groupBy('log.updatedBy')
      .orderBy('total', 'DESC')
      .getRawMany<InputErrorRow>();

    return raw.map((row) => ({
      user: row.user,
      total: Number(row.total) || 0,
    }));
  }

  async getMonthlyLettersStats() {
    type MonthlyRow = { month: string; masuk: string; keluar: string };
    const raw = await this.lettersRepo
      .createQueryBuilder('letter')
      .select('LEFT(letter.tanggalSurat, 7)', 'month')
      .addSelect(
        "SUM(CASE WHEN letter.jenisSurat = 'MASUK' THEN 1 ELSE 0 END)",
        'masuk',
      )
      .addSelect(
        "SUM(CASE WHEN letter.jenisSurat = 'KELUAR' THEN 1 ELSE 0 END)",
        'keluar',
      )
      .where('letter.tanggalSurat IS NOT NULL')
      .andWhere("letter.tanggalSurat != ''")
      .groupBy('month')
      .orderBy('month', 'DESC')
      .limit(12) // Limit to last 12 active months found
      .getRawMany<MonthlyRow>();

    return raw.map((row) => ({
      month: row.month,
      masuk: Number(row.masuk) || 0,
      keluar: Number(row.keluar) || 0,
    }));
  }

  private async mapWithConcurrency<T, R>(
    items: readonly T[],
    concurrency: number,
    fn: (item: T) => Promise<R>,
  ): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let index = 0;

    const workers = Array.from(
      { length: Math.max(1, Math.min(concurrency, items.length)) },
      async () => {
        while (index < items.length) {
          const current = index++;
          results[current] = await fn(items[current]);
        }
      },
    );

    await Promise.all(workers);
    return results;
  }

  private async getStorageStatsForMonths(months: string[]) {
    if (months.length === 0) {
      return {
        summary: { totalFiles: 0, totalBytes: 0, avgBytes: 0, missingFiles: 0 },
        monthly: [],
      };
    }

    const rows = await this.lettersRepo
      .createQueryBuilder('letter')
      .leftJoin(UploadedFile, 'file', 'file.id = letter.fileId')
      .select('LEFT(letter.tanggalSurat, 7)', 'month')
      .addSelect('file.filePath', 'filePath')
      .where('letter.tanggalSurat IS NOT NULL')
      .andWhere("letter.tanggalSurat != ''")
      .andWhere('letter.fileId IS NOT NULL')
      .andWhere("letter.fileId != ''")
      .andWhere('LEFT(letter.tanggalSurat, 7) IN (:...months)', { months })
      .getRawMany<MonthlyStorageRow>();

    const filePaths = Array.from(
      new Set(rows.map((r) => r.filePath).filter(Boolean)),
    ) as string[];

    const sizeByPath = new Map<string, { size: number; missing: boolean }>();
    await this.mapWithConcurrency(filePaths, 12, async (filePath) => {
      try {
        const s = await stat(filePath);
        sizeByPath.set(filePath, { size: s.size, missing: false });
      } catch {
        sizeByPath.set(filePath, { size: 0, missing: true });
      }
    });

    const monthlyAgg = new Map<
      string,
      { totalBytes: number; files: number; missingFiles: number }
    >();
    let totalBytes = 0;
    let totalFiles = 0;
    let missingFiles = 0;

    for (const row of rows) {
      const month = row.month;
      const agg = monthlyAgg.get(month) ?? {
        totalBytes: 0,
        files: 0,
        missingFiles: 0,
      };

      agg.files += 1;
      totalFiles += 1;

      if (!row.filePath) {
        agg.missingFiles += 1;
        missingFiles += 1;
        monthlyAgg.set(month, agg);
        continue;
      }

      const fileMeta = sizeByPath.get(row.filePath) ?? {
        size: 0,
        missing: true,
      };
      agg.totalBytes += fileMeta.size;
      totalBytes += fileMeta.size;

      if (fileMeta.missing) {
        agg.missingFiles += 1;
        missingFiles += 1;
      }

      monthlyAgg.set(month, agg);
    }

    const monthly = months.map((month) => {
      const agg = monthlyAgg.get(month) ?? {
        totalBytes: 0,
        files: 0,
        missingFiles: 0,
      };
      return {
        month,
        files: agg.files,
        totalBytes: agg.totalBytes,
        avgBytes: agg.files > 0 ? Math.round(agg.totalBytes / agg.files) : 0,
        missingFiles: agg.missingFiles,
      };
    });

    return {
      summary: {
        totalFiles,
        totalBytes,
        avgBytes: totalFiles > 0 ? Math.round(totalBytes / totalFiles) : 0,
        missingFiles,
      },
      monthly,
    };
  }

  async overview() {
    const monthlyLetters = await this.getMonthlyLettersStats();
    return {
      inputErrors: await this.getInputErrorStats(),
      monthlyLetters,
      storage: await this.getStorageStatsForMonths(
        monthlyLetters.map((m) => m.month),
      ),
    };
  }
}
