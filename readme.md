# Bosowa OCR - Sistem Manajemen Dokumen Digital

## Executive Summary

**Bosowa OCR** adalah solusi digitalisasi dokumen perusahaan yang menggabungkan teknologi Optical Character Recognition (OCR) dengan sistem manajemen arsip terintegrasi. Sistem ini dikembangkan untuk mempercepat proses administrasi. mengurangi pekerjaan manual, dan menyediakan pencarian dokumen yang instan.

### Dampak Bisnis

| Aspek                 | Sebelum Digitalisasi             | Setelah Bosowa OCR                   |
| --------------------- | -------------------------------- | ------------------------------------ |
| **Input Data**        | Manual ketik 10-15 menit/dokumen | Otomatis dalam hitungan detik        |
| **Pencarian Dokumen** | Cek fisik lemari arsip           | Pencarian instan dengan filter       |
| **Tanda Tangan**      | Print → TTD → Scan               | Digital signature langsung di sistem |
| **Audit Trail**       | Tidak terdokumentasi             | Semua perubahan tercatat otomatis    |
| **Akses**             | Terbatas di kantor               | Akses dimanapun (web-based)          |

---

## Tentang Sistem

### Apa itu Bosowa OCR?

Bosowa OCR adalah aplikasi web yang memungkinkan perusahaan untuk:

1. **Upload Dokumen** - Unggah surat/invoice dalam format PDF atau gambar
2. **Ekstraksi Otomatis** - Sistem membaca dan mengambil data dari dokumen secara otomatis
3. **Simpan & Kelola** - Semua dokumen tersimpan secara digital dan terorganisir
4. **Tanda Tangan Digital** - Proses approval dan tanda tangan tanpa kertas.
5. **Pencarian Cepat** - Temukan dokumen apa saja dalam hitungan detik.

### Mengapa Dibutuhkan?

Proses administrasi konvensional memiliki beberapa tantangan:

- Data entry manual yang memakan waktu
- Risiko kesalahan ketik (human error)
- Dokumen fisik mudah hilang/rusak
- Pencarian dokumen sulit dan lambat
- Proses tanda tangan memerlukan cetak dan scan

Bosowa OCR hadir untuk menyelesaikan seluruh permasalahan tersebut.

---

## Fitur Utama

### 1. OCR Cerdas - Data Entry Otomatis

Sistem menggunakan teknologi AI untuk membaca dokumen dan mengambil informasi penting secara otomatis:

| Data yang Diekstrak | Contoh                                 |
| ------------------- | -------------------------------------- |
| Nomor Surat         | "001/INV/XT/2024"                      |
| Tanggal Dokumen     | "15 Januari 2024"                      |
| Nama Pengirim       | "PT. Bosowa Taxi"                      |
| Alamat & Kontak     | "Jl. Pettarani No. 10, 0812-3456-7890" |
| Perihal             | "Penawaran Jasa"                       |
| Total Nominal       | "Rp 5.000.000"                         |

**Keuntungan:** Tidak perlu ketik manual. User cukup upload dan sistem akan mengisi data otomatis.

### 2. Manajemen Dokumen Terpusat

Semua dokumen perusahaan tersimpan dalam satu sistem terintegrasi:

- **Multi-format Support** - PDF, JPG, PNG
- **Drag & Drop Upload** - Upload dokumen dengan mudah
- **Camera Integration** - Foto langsung dari HP/kamera
- **Organisasi Otomatis** - Dokumen dikelompokkan berdasarkan:
  - Jenis (Surat Masuk / Surat Keluar)
  - Kategori (Surat / Invoice / Memo / PAD)
  - Unit Bisnis
  - Tanggal

### 3. Tanda Tangan Digital

Sistem menyediakan fitur tanda tangan digital untuk mempercepat proses approval:

- Request tanda tangan langsung dari sistem
- Posisi tanda tangan dapat diatur (koordinat X, Y, halaman)
- Tanda tangan otomatis tertempel di dokumen PDF
- History tanda tangan terdokumentasi lengkap

### 4. Role-Based Access Control

Akses pengguna dikelola berdasarkan peran:

| Role              | Deskripsi          | Akses                                                              |
| ----------------- | ------------------ | ------------------------------------------------------------------ |
| **Administrator** | Pengelola sistem   | Akses penuh, kelola user, laporan statistik, approve hapus dokumen |
| **Manajemen**     | Pimpinan unit      | Lihat semua dokumen, tanda tangan digital, dashboard approval      |
| **User**          | Staff administrasi | Upload dokumen, lihat dokumen unitnya, request tanda tangan        |

### 5. Audit Trail & Pelaporan

Setiap aktivitas tercatat untuk kebutuhan audit:

- Riwayat perubahan data (sebelum-sesudah)
- Log upload dan hapus dokumen
- History tanda tangan
- Dashboard statistik dokumen per bulan

### 6. Notifikasi Real-time (WebSocket)

Sistem menggunakan WebSocket untuk notifikasi real-time:

**Fitur Notifikasi:**

- Permintaan tanda tangan baru untuk Manajemen
- Status approval untuk request delete dokumen
- Update status dokumen yang ditandatangani
- Notifikasi sistem penting

**Implementasi:**

- Menggunakan Socket.io 4.8.3
- Terintegrasi dengan Redis untuk multi-instance support
- Notifikasi muncul sebagai toast dengan Sonner library di frontend
- Koneksi otomatis reconnect jika putus.

---

## Unit Bisnis yang Didukung

Sistem mendukung multiple unit bisnis dalam satu aplikasi. Unit bisnis yang tersedia dapat dikonfigurasi melalui database dan kode enum:

**Unit bisnis default:**

- **BOSOWA TAXI** - Operasional taksi
- **OTORENTAL NUSANTARA** - Rental mobil
- **OTO GARAGE INDONESIA** - Bengkel & service
- **MALLOMO** - Logistik
- **LAGALIGO LOGISTIK** - Jasa pengiriman
- **PORT MANAGEMENT** - Manajemen pelabuhan

**Manajemen unit bisnis:**

- User hanya dapat melihat dokumen dari unit bisnisnya (kecuali ADMIN dan MANAJEMEN)
- Filter dokumen berdasarkan unit bisnis
- Statistik terpisah per unit bisnis

---

## Fitur Teknis Tambahan

### Lazy Loading & Performance

- React Router dengan lazy loading untuk semua page components
- Code splitting otomatis dengan Vite
- Image optimization dengan Sharp library
- Gzip compression untuk semua HTTP responses
- LRU cache untuk data yang sering diakses

### Error Handling & Validation

- Global error handler di backend
- Input validation dengan class-validator
- Custom error responses yang konsisten
- Error boundary di React untuk prevent crashing
- Auto-retry untuk database connection failures

### Security Features

- CSRF protection
- XSS prevention dengan input sanitization
- Rate limiting dengan 3 tier (short/medium/long)
- Helmet security headers
- CORS configuration dengan allowed origins
- SQL injection prevention dengan TypeORM
- Password hashing dengan bcrypt

### Caching Strategy

- LRU cache untuk query yang sering
- OCR preview cache dengan TTL
- React Query caching untuk API responses
- Redis caching untuk session management

---

## Alur Kerja Sistem

### Proses Upload Dokumen

```
1. User Login → Pilih Menu Upload
                    ↓
2. Pilih File (PDF/Gambar) atau Foto Dokumen
                    ↓
3. Sistem Proses OCR → Ekstrak Data Otomatis
                    ↓
4. User Review → Edit (jika perlu) → Simpan
                    ↓
5. Dokumen Tersimpan di Database
```

### Proses Tanda Tangan Digital

```
1. User Request Tanda Tangan → Pilih Manajemen
                                    ↓
2. Sistem Kirim Notifikasi ke Manajemen
                                    ↓
3. Manajemen Buka Dashboard → Lihat Request
                                    ↓
4. Manajemen Review → Set Posisi TTD → Approve
                                    ↓
5. TTD Otomatis Tertempel di PDF → Dokumen Siap
```

---

## Teknologi (Overview)

### Frontend - Antarmuka Pengguna

| Teknologi                    | Fungsi                                      |
| ---------------------------- | ------------------------------------------- |
| React 19.2.1                 | Framework pembuatan tampilan modern         |
| Vite 7.2.4                   | Tool untuk mempercepat loading aplikasi     |
| React Router 7.1.3           | Navigasi antar halaman dengan lazy loading  |
| Lucide React 0.555.0         | Ikon yang modern dan konsisten              |
| Axios 1.7.9                  | HTTP client untuk komunikasi dengan backend |
| TanStack React Query 5.90.11 | Manajemen state dan caching API requests    |
| Sonner 2.0.7                 | Notifikasi toast yang modern                |
| Socket.io Client 4.8.3       | Real-time notifications                     |

### Backend - Sistem Server

| Teknologi                            | Fungsi                                        |
| ------------------------------------ | --------------------------------------------- |
| NestJS 11.0.1                        | Framework backend yang aman dan scalable      |
| TypeORM 0.3.20                       | Pengelola database dengan MySQL driver        |
| MySQL 2 3.11.3                       | Database penyimpanan data                     |
| Google Cloud Vision 5.3.4            | Teknologi OCR untuk membaca teks dari dokumen |
| Groq SDK 0.37.0                      | AI untuk ekstraksi data dari hasil OCR        |
| BullMQ 5.66.1 + ioredis 5.8.2        | Pemrosesan dokumen di background dengan Redis |
| PDF-lib 1.17.1 + pdf-to-img 4.1.0    | Manipulasi dan konversi PDF                   |
| Sharp 0.34.5                         | Image processing                              |
| Passport 0.7.0 + Passport JWT 4.0.1  | Authentication dan authorization              |
| NestJS Swagger 11.2.3                | API documentation (development only)          |
| NestJS Throttler 6.5.0               | Rate limiting protection                      |
| Winston 3.18.3 + nest-winston 1.10.2 | Logging sistem                                |
| Helmet 8.1.0                         | Security headers                              |
| Compression 1.8.1                    | Gzip compression                              |
| Socket.io 4.8.3                      | WebSocket untuk real-time notifications       |

### Security - Keamanan

| Fitur                    | Keterangan                                                               |
| ------------------------ | ------------------------------------------------------------------------ |
| Enkripsi Password        | Password diamankan dengan bcrypt 5.1.1                                   |
| JWT Authentication       | Token session yang aman dengan @nestjs/jwt                               |
| Role-Based Access        | Akses sesuai peran user (ADMIN, MANAJEMEN, USER)                         |
| Audit Logging            | Semua aktivitas tercatat dengan edit-logs module                         |
| Input Validation         | Validasi data dengan class-validator 0.14.1                              |
| Rate Limiting            | Proteksi dari spam/serangan dengan 3 tier throttling (short/medium/long) |
| CORS Protection          | Konfigurasi CORS dengan allowed origins dari env                         |
| Security Headers         | Protection dengan Helmet untuk security headers                          |
| SQL Injection Prevention | Parameterized queries dengan TypeORM                                     |
| Data Encryption          | Validasi input dan sanitization data                                     |

---

## Keunggulan Sistem

### 1. Efisiensi Waktu

- Input data otomatis menghemat waktu hingga 80%
- Pencarian dokumen instan
- Tanda tangan tanpa proses cetak-scan

### 2. Akurasi Data

- Mengurangi human error dalam entry data
- Validasi otomatis sebelum simpan
- Riwayat perubahan terdokumentasi

### 3. Penghematan Biaya

- Mengurangi penggunaan kertas
- Mengurangi biaya penyimpanan fisik
- Mengurangi biaya pengiriman dokumen

### 4. Akses Mudah

- Web-based, bisa diakses dari mana saja
- Mendukung desktop dan mobile
- Multi-user dengan role berbeda

### 5. Keamanan Terjamin

- Enkripsi data
- Kontrol akses berbasis peran
- Audit trail lengkap

---

## Instalasi & Penggunaan

### Persyaratan Sistem

**Hardware:**

- CPU: Dual core atau lebih (optimal: Quad core)
- RAM: Minimal 4 GB (rekomendasi 8 GB)
- Storage: 20 GB free space

**Software:**

- Node.js 18+ (teruji dengan Node.js 20+)
- MySQL 8+
- Redis 6+ (untuk background processing dengan BullMQ)

### Langkah Instalasi

#### 1. Persiapkan Database

```sql
CREATE DATABASE letterdb;
-- Atau nama database sesuai konfigurasi di .env
```

#### 2. Install Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit konfigurasi database, JWT_SECRET, dan API keys di file .env
npm run seed     # Buat user default (admin, manajemen)
npm run start:dev # Development mode
```

#### 3. Install Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edit URL backend di file .env
npm run dev
```

#### 4. Production Deployment (PM2)

```bash
# Di direktori backend
npm run build
pm2 start ecosystem.config.js  # Konfigurasi PM2 untuk production
pm2 logs
pm2 status
```

#### 5. Akses Aplikasi

- Frontend API: `http://localhost:5173`
- Backend API: `http://localhost:3000`
- API Documentation (dev): `http://localhost:3000/docs`

### Environment Variables Penting

**Backend (.env):**

```env
NODE_ENV=
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
JWT_SECRET=
FRONTEND_URL=

# Google Cloud Vision API
GOOGLE_APPLICATION_CREDENTIALS=

# Groq AI untuk ekstraksi data
GROQ_API_KEY=

# Redis untuk background processing
REDIS_URL=redis://localhost:6379
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# OCR Worker Configuration
OCR_WORKER_ENABLED=true
OCR_WORKER_CONCURRENCY=1
```

**Frontend (.env):**

```env
VITE_API_URL=http://localhost:3000/api/v1
```

---

## Struktur Organisasi Data

### Jenis Surat

- **SURAT MASUK** - Dokumen yang diterima dari eksternal
- **SURAT KELUAR** - Dokumen yang dikirim ke eksternal

### Kategori Dokumen

- **SURAT** - Surat biasa
- **INVOICE** - Invoice/faktur/tagihan
- **INTERNAL MEMO** - Memo internal
- **PAD** - Dokumen jenis lain

---

## API Documentation

API documentation tersedia secara otomatis melalui Swagger (hanya di development mode):

```
Development: http://localhost:3000/docs
Production: Swagger disabled untuk keamanan
```

API menggunakan RESTful architecture dengan versioning `/api/v1`.

---

## Dashboard Statistik

Administrator memiliki akses ke dashboard dengan informasi:

- Total dokumen
- Grafik dokumen per bulan
- Statistik koreksi data (indikasi kualitas OCR)
- Storage usage

### Akses Per Role

| Halaman            | ADMIN | MANAJEMEN | USER              |
| ------------------ | ----- | --------- | ----------------- |
| Upload Dokumen     | ✓     | ✓         | ✓                 |
| Daftar Surat       | ✓     | ✓         | ✓                 |
| Detail Surat       | ✓     | ✓         | ✓ (hanya unitnya) |
| Form Surat Baru    | ✓     | ✓         | ✓                 |
| Request Delete     | ✓     | ✓         | ✓                 |
| Stats Dashboard    | ✓     | ✗         | ✗                 |
| User Management    | ✓     | ✗         | ✗                 |
| Audit Log          | ✓     | ✗         | ✗                 |
| Pending Signatures | ✗     | ✓         | ✗                 |
| Signature Settings | ✗     | ✓         | ✗                 |

---

## Modul Backend

Sistem backend terdiri dari modul-modul berikut:

| Modul                  | Deskripsi                                             |
| ---------------------- | ----------------------------------------------------- |
| **auth**               | Authentication dan authorization dengan JWT           |
| **users**              | Manajemen user (ADMIN hanya)                          |
| **files**              | Upload dan manajemen file (PDF, gambar)               |
| **ocr**                | OCR processing dengan Google Cloud Vision dan Groq AI |
| **letters**            | CRUD data surat/invoice                               |
| **delete-requests**    | Request hapus dokumen dengan approval system (ADMIN)  |
| **edit-logs**          | Audit trail untuk perubahan data                      |
| **signatures**         | Manajemen tanda tangan digital                        |
| **signature-requests** | Request tanda tangan dengan approval workflow         |
| **notifications**      | Sistem notifikasi                                     |
| **websocket**          | Real-time notifications via WebSocket                 |
| **stats**              | Statistik dan dashboard (ADMIN)                       |
| **cache**              | Caching dengan LRU cache                              |

---

## Fitur Approval System

### Delete Request Approval

- User dapat request penghapusan dokumen dengan alasan
- Administrator harus menyetujui sebelum dokumen benar-benar dihapus
- Semua request dan approval tercatat di audit log
- Fitur ini mencegah penghapusan yang tidak disengaja

### Signature Request Workflow

- User request tanda tangan pada dokumen
- Manajemen menerima notifikasi via WebSocket
- Manajemen review dokumen dan atur posisi tanda tangan
- Tanda tangan otomatis tertempel pada PDF
- History tanda tangan terdokumentasi

---

## Struktur Proyek

```
bosowa-ocr/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/              # Authentication & authorization
│   │   │   ├── users/             # User management
│   │   │   ├── files/             # File upload & management
│   │   │   ├── ocr/               # OCR processing
│   │   │   ├── letters/           # Letters/invoice CRUD
│   │   │   ├── delete-requests/   # Delete approval system
│   │   │   ├── edit-logs/         # Audit trail
│   │   │   ├── signatures/        # Digital signature management
│   │   │   ├── signature-requests/ # Signature requests
│   │   │   ├── notifications/     # Notification system
│   │   │   ├── websocket/        # WebSocket integration
│   │   │   ├── stats/            # Statistics dashboard
│   │   │   └── cache/            # LRU cache implementation
│   │   ├── common/
│   │   │   ├── decorators/       # Custom decorators
│   │   │   ├── guards/            # Route guards
│   │   │   ├── enums/             # Enum types
│   │   │   └── logger/            # Winston logger
│   │   ├── scripts/               # Utility scripts
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── scripts/                  # Database maintenance scripts
│   ├── uploads/                  # Uploaded files directory
│   ├── logs/                     # Application logs
│   ├── .env.example
│   ├── package.json
│   └── ecosystem.config.js       # PM2 configuration
├── frontend/
│   ├── src/
│   │   ├── api/                  # API client services
│   │   ├── assets/               # Static assets
│   │   ├── components/           # Reusable components
│   │   ├── context/              # React contexts (Auth, WebSocket)
│   │   ├── pages/                # Page components
│   │   │   ├── LoginPage.tsx
│   │   │   ├── UploadPage.tsx
│   │   │   ├── LettersListPage.tsx
│   │   │   ├── LetterDetailPage.tsx
│   │   │   ├── LettersFormPage.tsx
│   │   │   ├── DeleteRequestsPage.tsx
│   │   │   ├── StatsPage.tsx
│   │   │   ├── UsersPage.tsx
│   │   │   ├── AuditLogPage.tsx
│   │   │   ├── SignatureSettingsPage.tsx
│   │   │   ├── PendingSignaturesPage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   ├── services/             # Business logic services
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── .env
│   ├── package.json
│   └── vite.config.ts
├── readme.md
└── .gitignore
```

---

## Lisensi

Proprietary - Bosowa Bandar Group

---

## Credits

**Project Owner**

- Bosowa Bandar Group

**Development Team**

- Backend: NestJS + TypeScript
- Frontend: React 19 + Vite + TypeScript

**Technologies Used**

- Google Cloud Vision API 5.3.4
- Groq SDK 0.37.0 (AI Extraction)
- NestJS Framework 11.0.1
- React Framework 19.2.1
- Vite 7.2.4
- MySQL Database 8+
- Redis 6+ (BullMQ)

---

**Last Updated:** Januari 2026
**Version:** 3.0
**Status:** Production Ready
**Branch:** v10
