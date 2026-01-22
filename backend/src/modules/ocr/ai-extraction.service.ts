import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

export interface ExtractedLetterData {
  letterNumber: string | null;
  tanggalSurat: string | null;
  namaPengirim: string | null;
  alamatPengirim: string | null;
  teleponPengirim: string | null;
  namaPenerima: string | null;
  perihal: string | null;
  totalNominal: number;
  nominalList: number[];
  confidence: 'high' | 'medium' | 'low';
}

@Injectable()
export class AiExtractionService {
  private readonly logger = new Logger(AiExtractionService.name);
  private groq: Groq | null = null;
  private provider: 'groq' | null = null;

  constructor(private readonly configService: ConfigService) {
    // Only use Groq AI (preferred and most reliable)
    const groqKey = this.configService.get<string>('GROQ_API_KEY');
    if (groqKey) {
      this.groq = new Groq({ apiKey: groqKey });
      this.provider = 'groq';
      this.logger.log('Groq AI initialized successfully');
    }

    if (!this.provider) {
      this.logger.error('Groq AI not available. Set GROQ_API_KEY in .env');
    }
  }

  isAvailable(): boolean {
    return this.provider !== null;
  }

  getProvider(): string | null {
    return this.provider;
  }

  async extractFromOcrText(ocrRawText: string): Promise<ExtractedLetterData> {
    if (!this.provider) {
      this.logger.warn('No AI provider configured, returning empty data');
      return this.emptyResult();
    }

    this.logger.log(`Starting AI extraction with ${this.provider}...`);
    const prompt = this.buildPrompt(ocrRawText);

    try {
      let response: string;

      if (this.provider === 'groq' && this.groq) {
        response = await this.callGroq(prompt);
      } else {
        throw new Error('No AI provider available');
      }

      this.logger.log('AI response received, parsing...');
      const parsed = this.parseGroqResponse(response);
      this.logger.log(
        `AI extraction complete. Found: letterNumber=${parsed.letterNumber}, perihal=${parsed.perihal}`,
      );
      return parsed;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`AI extraction failed: ${message}`);
      return this.emptyResult();
    }
  }

  private async callGroq(prompt: string): Promise<string> {
    const completion = await this.groq!.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content || '';
  }

  private buildPrompt(ocrText: string): string {
    return `Kamu adalah asisten ekstraksi data dari dokumen surat/invoice Indonesia.

Ekstrak informasi berikut dari teks OCR di bawah ini. Jawab HANYA dalam format JSON yang valid, tanpa markdown code block.

Aturan:
1. letterNumber: Nomor surat/invoice (format seperti: 001/DIR/I/2024, INV-2024-001, B-123/KEU/2024, dll). JANGAN masukkan nomor telepon.
2. tanggalSurat: Tanggal surat dalam format YYYY-MM-DD
3. namaPengirim: Nama perusahaan/instansi pengirim (biasanya di kop surat bagian atas atau tanda tangan)
4. alamatPengirim: Alamat lengkap pengirim
5. teleponPengirim: Nomor telepon pengirim (format: +62xxx atau 08xxx atau (021)xxx)
6. namaPenerima: Nama perusahaan/instansi/orang penerima surat (biasanya setelah kata "Kepada" atau "Yth." atau "Messrs")
7. perihal: Subjek/perihal surat
8. nominalList: Array angka nominal uang yang ditemukan (dalam Rupiah, angka bulat tanpa desimal)
9. totalNominal: JUMLAH AKHIR YANG HARUS DIBAYAR. Untuk disbursement account/invoice, ini adalah "Balance Need to Remit" atau "Saldo yang harus dibayar" atau "Total yang harus ditransfer" SETELAH dikurangi uang muka/advance payment. Jika tidak ada potongan, gunakan total akhir. Format: angka bulat tanpa desimal (contoh: 8815633.92 menjadi 8815634)
10. confidence: "high" jika data jelas terbaca, "medium" jika beberapa data kurang jelas, "low" jika banyak yang tidak terbaca

Jika data tidak ditemukan atau tidak jelas, isi dengan null (untuk string) atau 0/[] (untuk angka/array).

TEKS OCR:
"""
${ocrText.substring(0, 4000)}
"""

Jawab dalam format JSON saja:`;
  }

  private parseGroqResponse(response: string): ExtractedLetterData {
    try {
      let jsonStr = response.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr
          .replace(/```json?\n?/g, '')
          .replace(/```$/g, '')
          .trim();
      }

      const parsed = JSON.parse(jsonStr);

      return {
        letterNumber: this.sanitizeString(parsed.letterNumber),
        tanggalSurat: this.sanitizeDate(parsed.tanggalSurat),
        namaPengirim: this.sanitizeString(parsed.namaPengirim),
        alamatPengirim: this.sanitizeString(parsed.alamatPengirim),
        teleponPengirim: this.sanitizeString(parsed.teleponPengirim),
        namaPenerima: this.sanitizeString(parsed.namaPenerima),
        perihal: this.sanitizeString(parsed.perihal),
        totalNominal: this.sanitizeNumber(parsed.totalNominal),
        nominalList: this.sanitizeNumberArray(parsed.nominalList),
        confidence: this.sanitizeConfidence(parsed.confidence),
      };
    } catch (error) {
      this.logger.error('Failed to parse AI response', { response, error });
      return this.emptyResult();
    }
  }

  private sanitizeString(value: unknown): string | null {
    if (
      typeof value === 'string' &&
      value.trim() &&
      value.toLowerCase() !== 'null'
    ) {
      return value.trim();
    }
    return null;
  }

  private sanitizeDate(value: unknown): string | null {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    return null;
  }

  private sanitizeNumber(value: unknown): number {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const num = parseFloat(value.replace(/[^\d.-]/g, ''));
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  private sanitizeNumberArray(value: unknown): number[] {
    if (Array.isArray(value)) {
      return value.map((v) => this.sanitizeNumber(v)).filter((n) => n > 0);
    }
    return [];
  }

  private sanitizeConfidence(value: unknown): 'high' | 'medium' | 'low' {
    if (value === 'high' || value === 'medium' || value === 'low') {
      return value;
    }
    return 'low';
  }

  private emptyResult(): ExtractedLetterData {
    return {
      letterNumber: null,
      tanggalSurat: null,
      namaPengirim: null,
      alamatPengirim: null,
      teleponPengirim: null,
      namaPenerima: null,
      perihal: null,
      totalNominal: 0,
      nominalList: [],
      confidence: 'low',
    };
  }
}
