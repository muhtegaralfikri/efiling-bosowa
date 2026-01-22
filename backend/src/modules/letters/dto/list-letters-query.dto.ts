import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  IsDateString,
  IsIn,
  IsNumber,
} from 'class-validator';

export class ListLettersQueryDto {
  @IsString()
  @IsOptional()
  keyword?: string; // Search in multiple fields

  @IsString()
  @IsOptional()
  letterNumber?: string;

  @IsString()
  @IsOptional()
  namaPengirim?: string;

  @IsString()
  @IsOptional()
  perihal?: string;

  @IsIn(['SURAT', 'INVOICE', 'INTERNAL_MEMO', 'PAD'])
  @IsOptional()
  jenisDokumen?: 'SURAT' | 'INVOICE' | 'INTERNAL_MEMO' | 'PAD';

  @IsIn(['MASUK', 'KELUAR'])
  @IsOptional()
  jenisSurat?: 'MASUK' | 'KELUAR';

  @IsIn([
    'BOSOWA_TAXI',
    'OTORENTAL_NUSANTARA',
    'OTO_GARAGE_INDONESIA',
    'MALLOMO',
    'LAGALIGO_LOGISTIK',
    'PORT_MANAGEMENT',
  ])
  @IsOptional()
  unitBisnis?:
    | 'BOSOWA_TAXI'
    | 'OTORENTAL_NUSANTARA'
    | 'OTO_GARAGE_INDONESIA'
    | 'MALLOMO'
    | 'LAGALIGO_LOGISTIK'
    | 'PORT_MANAGEMENT';

  @IsDateString()
  @IsOptional()
  tanggalMulai?: string; // YYYY-MM-DD format

  @IsDateString()
  @IsOptional()
  tanggalSelesai?: string; // YYYY-MM-DD format

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  nominalMin?: number;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  nominalMax?: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}
