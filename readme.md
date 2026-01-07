# Bosowa OCR - Sistem Manajemen Dokumen Digital

## Executive Summary

**Bosowa OCR** adalah solusi digitalisasi dokumen perusahaan yang menggabungkan teknologi Optical Character Recognition (OCR) dengan sistem manajemen arsip terintegrasi. Sistem ini dikembangkan untuk mempercepat proses administrasi, mengurangi pekerjaan manual, dan menyediakan pencarian dokumen yang instan.

### Dampak Bisnis
| Aspek | Sebelum Digitalisasi | Setelah Bosowa OCR |
|-------|---------------------|--------------------|
| **Input Data** | Manual ketik 10-15 menit/dokumen | Otomatis dalam hitungan detik |
| **Pencarian Dokumen** | Cek fisik lemari arsip | Pencarian instan dengan filter |
| **Tanda Tangan** | Print → TTD → Scan | Digital signature langsung di sistem |
| **Audit Trail** | Tidak terdokumentasi | Semua perubahan tercatat otomatis |
| **Akses** | Terbatas di kantor | Akses dimanapun (web-based) |

---

## Tentang Sistem

### Apa itu Bosowa OCR?

Bosowa OCR adalah aplikasi web yang memungkinkan perusahaan untuk:

1. **Upload Dokumen** - Unggah surat/invoice dalam format PDF atau gambar
2. **Ekstraksi Otomatis** - Sistem membaca dan mengambil data dari dokumen secara otomatis
3. **Simpan & Kelola** - Semua dokumen tersimpan secara digital dan terorganisir
4. **Tanda Tangan Digital** - Proses approval dan tanda tangan tanpa kertas
5. **Pencarian Cepat** - Temukan dokumen apa saja dalam hitungan detik

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

| Data yang Diekstrak | Contoh |
|---------------------|--------|
| Nomor Surat | "001/INV/XT/2024" |
| Tanggal Dokumen | "15 Januari 2024" |
| Nama Pengirim | "PT. Bosowa Taxi" |
| Alamat & Kontak | "Jl. Pettarani No. 10, 0812-3456-7890" |
| Perihal | "Penawaran Jasa" |
| Total Nominal | "Rp 5.000.000" |

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

| Role | Deskripsi | Akses |
|------|-----------|-------|
| **Administrator** | Pengelola sistem | Akses penuh, kelola user, laporan statistik, approve hapus dokumen |
| **Manajemen** | Pimpinan unit | Lihat semua dokumen, tanda tangan digital, dashboard approval |
| **User** | Staff administrasi | Upload dokumen, lihat dokumen unitnya, request tanda tangan |

### 5. Audit Trail & Pelaporan

Setiap aktivitas tercatat untuk kebutuhan audit:

- Riwayat perubahan data (sebelum-sesudah)
- Log upload dan hapus dokumen
- History tanda tangan
- Dashboard statistik dokumen per bulan

### 6. Notifikasi Real-time

User mendapatkan notifikasi langsung untuk:
- Permintaan tanda tangan baru
- Dokumen yang sudah ditandatangani
- Update dokumen

---

## Unit Bisnis yang Didukung

Sistem mendukung multiple unit bisnis dalam satu aplikasi:

- **BOSOWA TAXI** - Operasional taksi
- **OTORENTAL NUSANTARA** - Rental mobil
- **OTO GARAGE INDONESIA** - Bengkel & service
- **MALLOMO** - Logistik
- **LAGALIGO LOGISTIK** - Jasa pengiriman
- **PORT MANAGEMENT** - Manajemen pelabuhan
- Dan lainnya sesuai kebutuhan

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
| Teknologi | Fungsi |
|-----------|--------|
| React | Framework pembuatan tampilan modern |
| Vite | Tool untuk mempercepat loading aplikasi |
| React Router | Navigasi antar halaman |
| Lucide Icons | Ikon yang modern dan konsisten |

### Backend - Sistem Server
| Teknologi | Fungsi |
|-----------|--------|
| NestJS | Framework backend yang aman dan scalable |
| TypeORM | Pengelola database |
| MySQL | Database penyimpanan data |
| Google Cloud Vision | Teknologi OCR untuk membaca teks |
| Groq AI | Kecerdasan buatan untuk ekstraksi data |
| BullMQ + Redis | Pemrosesan dokumen di background |

### Security - Keamanan
| Fitur | Keterangan |
|-------|------------|
| Enkripsi Password | Password diamankan dengan bcrypt |
| JWT Authentication | Token session yang aman |
| Role-Based Access | Akses sesuai peran user |
| Audit Logging | Semua aktivitas tercatat |
| Input Validation | Validasi data untuk mencegah error |
| Rate Limiting | Proteksi dari spam/serangan |

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
- CPU: Dual core atau lebih
- RAM: Minimal 4 GB (rekomendasi 8 GB)
- Storage: 20 GB free space

**Software:**
- Node.js 18+
- MySQL 8+
- Redis 6+ (untuk background processing)

### Langkah Instalasi

#### 1. Persiapkan Database
```sql
CREATE DATABASE db_name;
```

#### 2. Install Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit konfigurasi database di file .env
npm run seed     # Buat user default
npm run start:dev
```

#### 3. Install Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Edit URL backend di file .env
npm run dev
```

#### 4. Akses Aplikasi
Buka browser: `http://localhost:5173`

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

API documentation tersedia secara otomatis melalui Swagger:

```
Development: http://localhost:3000/docs
Production: https://your-domain.com/docs
```

---

## Dashboard Statistik

Administrator memiliki akses ke dashboard dengan informasi:

- Total dokumen per unit bisnis
- Grafik dokumen per bulan
- Statistik koreksi data (indikasi kualitas OCR)
- User activity logs
- Storage usage

---

## Keamanan & Compliance

### Data Protection
- Password di-hash menggunakan bcrypt
- Data transmisi menggunakan HTTPS (production)
- Validasi input di sisi client dan server
- SQL injection prevention dengan parameterized queries

### Access Control
- Role-based access control (RBAC)
- Unit bisnis isolation
- Session management dengan JWT
- Audit trail untuk semua aktivitas

### Backup & Recovery
- Database backup otomatis
- File cleanup untuk orphan files
- Restore capabilities

---

## Troubleshooting

### Masalah Umum

| Masalah | Solusi |
|---------|--------|
| Login gagal | Pastikan username dan password benar. Cek apakah server backend berjalan. |
| OCR gagal | Pastikan file dapat dibaca. Format yang disarankan: PDF dengan resolusi baik. |
| Tanda tangan tidak muncul | Pastikan file PDF tidak corrupt. Cek posisi koordinat tanda tangan. |
| Aplikasi lambat | Cek koneksi internet dan performa server. Restart Redis jika perlu. |

---

## Lisensi

Proprietary - Bosowa Bandar Group

---

## Credits

**Project Owner**
- Bosowa Bandar Group

**Development Team**
- Backend: NestJS Team
- Frontend: React Team

**Technologies Used**
- Google Cloud Vision API
- Groq AI
- NestJS Framework
- React Framework
- MySQL Database

---

**Last Updated:** Januari 2026
**Version:** 3.0
**Status:** Production Ready
