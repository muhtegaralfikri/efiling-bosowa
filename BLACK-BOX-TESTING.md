# Black Box Testing - Bosowa OCR System

## 1. Pendahuluan

Dokumen ini berisi panduan lengkap untuk Black Box Testing pada sistem Bosowa OCR. Black Box Testing adalah metode pengujian perangkat lunak yang fungsionalitas aplikasi diuji tanpa melihat kode internal atau struktur sistem.

### 1.1 Tujuan Pengujian

- Memastikan semua fitur berfungsi sesuai dengan kebutuhan pengguna
- Mendeteksi bug dan error yang tidak terlihat saat development
- Memvalidasi user experience dan flow aplikasi
- Memastikan sistem aman dan handal

### 1.2 Lingkup Pengujian

Aplikasi yang diuji mencakup:
- **Backend**: NestJS API (Port 3001)
- **Frontend**: React SPA (Port 5173)
- **Database**: PostgreSQL

---

## 2. Test Environment Setup

### 2.1 Persyaratan Sistem

| Komponen | Minimum | Recommended |
|----------|---------|-------------|
| OS | Windows 10+, macOS 12+, Ubuntu 20.04+ | Windows 11, macOS 14+, Ubuntu 22.04+ |
| RAM | 4 GB | 8 GB+ |
| Browser | Chrome 90+, Firefox 88+, Edge 90+ | Chrome 120+, Firefox 120+ |
| Screen Resolution | 1366x768 | 1920x1080+ |

### 2.2 Persiapan Test Environment

#### Step 1: Clone Repository
```bash
git clone https://github.com/your-repo/bosowa-ocr.git
cd bosowa-ocr
```

#### Step 2: Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

#### Step 3: Setup Database
```bash
# Pastikan PostgreSQL sudah terinstall
# Buat database baru
psql -U postgres
CREATE DATABASE bosowa_ocr;
\q

# Run migration
cd backend
npm run add-indexes
```

#### Step 4: Konfigurasi Environment

**Backend (.env)**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/bosowa_ocr"
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
UPLOAD_DIR=./uploads
OCR_TESSERACT_PATH=/usr/bin/tesseract
OPENAI_API_KEY=your-openai-key
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=Bosowa OCR
```

#### Step 5: Start Application
```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

#### Step 6: Access Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api (jika swagger diaktifkan)

---

## 3. Test Data Preparation

### 3.1 Sample Dokumen untuk Upload

Siapkan dokumen sample berikut:

| Jenis Dokumen | Format | Ukuran | Purpose |
|--------------|--------|--------|---------|
| Surat Biasa | PDF | 100-500 KB | Test upload normal |
| Surat Foto | JPG/PNG | 500KB - 2MB | Test OCR dari gambar |
| Invoice | PDF | 200KB - 1MB | Test ekstraksi nominal |
| Surat Panjang | PDF | 1-3 MB | Test dokumen besar |
| Korup File | PDF/JPG | - | Test error handling |
| File Non-Dokumen | EXE/TXT | - | Test validasi file |

### 3.2 Test Users

Buat akun test berikut:

| Username | Role | Unit Bisnis | Password |
|----------|------|-------------|----------|
| admin_test | ADMIN | - | Admin123! |
| manajemen_test | MANAJEMEN | - | Manajemen123! |
| taxi_test | USER | BOSOWA_TAXI | User123! |
| otorental_test | USER | OTORENTAL_NUSANTARA | User123! |
| garage_test | USER | OTO_GARAGE_INDONESIA | User123! |

---

## 4. Modul Authentication

### 4.1 TC-001: Login Berhasil

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-001 |
| **Scenario** | User berhasil login dengan kredensial valid |
| **Priority** | Critical |

**Test Steps:**

1. Buka browser dan akses `http://localhost:5173`
2. Masukkan username: `admin_test`
3. Masukkan password: `Admin123!`
4. Klik tombol "Masuk"

**Expected Result:**
- User diarahkan ke halaman Dashboard
- Toast message "Login berhasil" muncul
- Menu navigasi muncul sesuai role
- Username tampil di header

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 4.2 TC-002: Login Gagal - Password Salah

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-002 |
| **Scenario** | User gagal login dengan password salah |
| **Priority** | Critical |

**Test Steps:**

1. Buka halaman login
2. Masukkan username: `admin_test`
3. Masukkan password: `wrongpassword`
4. Klik tombol "Masuk"

**Expected Result:**
- Error message muncul: "Username atau password salah"
- User tetap di halaman login
- Password field ter-reset

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 4.3 TC-003: Login Gagal - Username Tidak Ada

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-003 |
| **Scenario** | Login dengan username tidak terdaftar |
| **Priority** | High |

**Test Steps:**

1. Buka halaman login
2. Masukkan username: `nonexistent_user`
3. Masukkan password sembarang
4. Klik tombol "Masuk"

**Expected Result:**
- Error message muncul
- User tetap di halaman login

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 4.4 TC-004: Validasi Input Kosong

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-004 |
| **Scenario** | Login dengan field kosong |
| **Priority** | Medium |

**Test Steps:**

1. Buka halaman login
2. Biarkan username kosong
3. Klik tombol "Masuk"

**Expected Result:**
- Validasi HTML5 berfungsi (required attribute)
- Tidak bisa submit form

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 4.5 TC-005: Logout Berhasil

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-005 |
| **Scenario** | User berhasil logout |
| **Priority** | High |

**Test Steps:**

1. Login sebagai user manapun
2. Klik tombol logout di header
3. Konfirmasi logout jika ada

**Expected Result:**
- User diarahkan ke halaman login
- Token dihapus dari localStorage
- Tidak bisa akses halaman protected langsung

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 4.6 TC-006: Token Expired

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-006 |
| **Scenario** | Akses halaman dengan token expired |
| **Priority** | High |

**Test Steps:**

1. Login sebagai user
2. Ubah JWT token di localStorage menjadi invalid
3. Refresh halaman atau navigasi ke halaman lain
4. Atau tunggu sampai token expired (sesuai config)

**Expected Result:**
- User di-redirect ke halaman login
- Pesan error sesuai muncul

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

## 5. Modul Upload & OCR

### 5.1 TC-007: Upload Dokumen PDF Berhasil

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-007 |
| **Scenario** | Upload file PDF surat berhasil |
| **Priority** | Critical |

**Test Steps:**

1. Login sebagai user manapun
2. Navigasi ke halaman Upload
3. Pilih file PDF surat (max 5MB)
4. Klik tombol "Upload"
5. Tunggu proses OCR selesai

**Expected Result:**
- Progress bar muncul dan berjalan
- Setelah selesai, hasil OCR muncul:
  - Nomor Surat terdeteksi
  - Tanggal Surat terdeteksi
  - Nama Pengirim terdeteksi
  - Perihal terdeteksi
  - Total Nominal (jika ada) terdeteksi
- Confidence badge muncul untuk pengirim
- Tombol "Simpan Dokumen" aktif
- Preview gambar dokumen muncul

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 5.2 TC-008: Upload Gambar (JPG/PNG) Berhasil

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-008 |
| **Scenario** | Upload file gambar surat berhasil |
| **Priority** | Critical |

**Test Steps:**

1. Login sebagai user manapun
2. Navigasi ke halaman Upload
3. Pilih file gambar surat (JPG/PNG)
4. Klik tombol "Upload"
5. Tunggu proses OCR selesai

**Expected Result:**
- Gambar berhasil diupload
- OCR berjalan dan mengekstrak data
- Hasil ekstraksi muncul

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 5.3 TC-009: Upload File Terlalu Besar

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-009 |
| **Scenario** | Upload file melebihi batas ukuran |
| **Priority** | High |

**Test Steps:**

1. Login sebagai user manapun
2. Navigasi ke halaman Upload
3. Pilih file lebih dari 5MB
4. Coba upload

**Expected Result:**
- Error message: "File terlalu besar. Maksimal 5MB"
- Upload tidak diproses

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 5.4 TC-010: Upload File Format Tidak Didukung

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-010 |
| **Scenario** | Upload file format tidak didukung |
| **Priority** | High |

**Test Steps:**

1. Login sebagai user manapun
2. Navigasi ke halaman Upload
3. Pilih file .txt, .exe, atau format lain
4. Coba upload

**Expected Result:**
- Validasi mencegah upload
- Error message muncul
- Upload tidak diproses

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 5.5 TC-011: Upload Dokumen Kosong

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-011 |
| **Scenario** | Upload file kosong atau korup |
| **Priority** | Medium |

**Test Steps:**

1. Login sebagai user manapun
2. Navigasi ke halaman Upload
3. Pilih file kosong (0 bytes) atau korup
4. Coba upload

**Expected Result:**
- Error handling berfungsi
- Pesan error yang jelas
- Aplikasi tidak crash

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 5.6 TC-012: OCR Queue Status

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-012 |
| **Scenario** | Mengecek status OCR dalam antrian |
| **Priority** | Medium |

**Test Steps:**

1. Upload dokumen
2. Perhatikan status OCR (pending, processing, completed, failed)
3. Coba upload beberapa dokumen berurutan

**Expected Result:**
- Setiap upload memiliki job ID unik
- Status dapat di-track melalui polling
- Multiple uploads di-queue dengan benar

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

## 6. Modul Letters Form

### 6.1 TC-013: Simpan Dokumen Baru Berhasil

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-013 |
| **Scenario** | Menyimpan dokumen baru setelah OCR |
| **Priority** | Critical |

**Test Steps:**

1. Upload dokumen dan tunggu OCR selesai
2. Di halaman form, isi field yang kosong jika perlu
3. Pilih Tipe Dokumen (MASUK/KELUAR)
4. Pilih Jenis Dokumen (SURAT/INVOICE/INTERNAL_MEMO/PAD)
5. (Jika Admin/Manajemen) Pilih Unit Bisnis
6. Klik "Simpan dokumen"

**Expected Result:**
- Toast: "Dokumen tersimpan"
- Redirect ke halaman Daftar Dokumen
- Dokumen baru muncul di daftar (paling atas)
- Query cache ter-invalidate dengan benar

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 6.2 TC-014: Validasi Field Wajib

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-014 |
| **Scenario** | Coba simpan dengan field wajib kosong |
| **Priority** | High |

**Test Steps:**

1. Upload dokumen dan lanjut ke form
2. Kosongkan field wajib:
   - Nomor Dokumen
   - Tanggal Dokumen
   - Unit Bisnis (untuk Admin/Manajemen)
3. Klik "Simpan dokumen"

**Expected Result:**
- Error message: "Mohon lengkapi field yang wajib diisi"
- Field yang kosong ditandai dengan error
- Form tidak tersubmit
- Field error muncul di bawah input

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 6.3 TC-015: Auto-Set Unit Bisnis untuk User Regular

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-015 |
| **Scenario** | Unit bisnis otomatis ter-set untuk user non-admin |
| **Priority** | High |

**Test Steps:**

1. Login sebagai user regular (contoh: taxi_test)
2. Upload dokumen
3. Cek field Unit Bisnis di form

**Expected Result:**
- Field Unit Bisnis tidak bisa di-edit
- Nilai otomatis terisi sesuai user (BOSOWA_TAXI)
- Tampil sebagai read-only label

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 6.4 TC-016: Admin Bisa Pilih Unit Bisnis

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-016 |
| **Scenario** | Admin dapat memilih unit bisnis |
| **Priority** | High |

**Test Steps:**

1. Login sebagai admin
2. Upload dokumen
3. Cek field Unit Bisnis di form

**Expected Result:**
- Dropdown Unit Bisnis tersedia
- Semua opsi unit bisnis muncul:
  - Bosowa Taxi
  - Otorental Nusantara
  - Oto Garage Indonesia
  - Mallomo
  - Lagaligo Logistik
  - Port Management
- Bisa memilih dan mengubah nilai

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 6.5 TC-017: Draft Auto-Save

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-017 |
| **Scenario** | Form menyimpan draft otomatis |
| **Priority** | Medium |

**Test Steps:**

1. Upload dokumen dan lanjut ke form
2. Isi beberapa field
3. Tutup tab browser tanpa simpan
4. Buka lagi halaman form

**Expected Result:**
- Notifikasi "Draft tersimpan dipulihkan" muncul
- Field terisi kembali dengan data draft
- Tombol "Hapus draft" tersedia
- Setelah simpan berhasil, draft terhapus

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 6.6 TC-018: Edit Dokumen

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-018 |
| **Scenario** | Mengedit data dokumen yang sudah ada |
| **Priority** | Critical |

**Test Steps:**

1. Buka daftar dokumen
2. Klik dokumen yang akan diedit
3. Di halaman detail, klik "Edit"
4. Ubah beberapa field
5. Klik "Simpan Perubahan"

**Expected Result:**
- Data berhasil diupdate
- Redirect ke halaman detail
- Perubahan terlihat di detail
- Audit log tercatat

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

## 7. Modul Letters List

### 7.1 TC-019: Tampilan Daftar Dokumen

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-019 |
| **Scenario** | Menampilkan daftar dokumen dengan benar |
| **Priority** | Critical |

**Test Steps:**

1. Login sebagai user manapun
2. Navigasi ke halaman Daftar Dokumen

**Expected Result:**
- Dokumen muncul dalam tabel/grid
- Kolom yang ditampilkan:
  - Nomor Dokumen
  - Tanggal
  - Pengirim
  - Perihal
  - Jenis Dokumen
  - Nominal
  - Aksi (View, Edit, Delete)
- Pagination muncul jika data banyak
- Loading state muncul saat fetching

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 7.2 TC-020: Pencarian Dokumen

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-020 |
| **Scenario** | Mencari dokumen berdasarkan keyword |
| **Priority** | High |

**Test Steps:**

1. Buka halaman Daftar Dokumen
2. Ketik keyword di search bar
3. Tunggu debounce selesai

**Expected Result:**
- Hasil pencarian muncul real-time (setelah debounce)
- Mencari di:
  - Nomor Dokumen
  - Nama Pengirim
  - Perihal
- Hasil kosong jika tidak ditemukan

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 7.3 TC-021: Filter Dokumen

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-021 |
| **Scenario** | Filter dokumen berdasarkan kriteria |
| **Priority** | High |

**Test Steps:**

1. Buka halaman Daftar Dokumen
2. Klik tombol Filter
3. Set filter:
   - Jenis Dokumen: INVOICE
   - Tipe Dokumen: MASUK
   - Unit Bisnis: BOSOWA_TAXI
   - Rentang Tanggal
   - Rentang Nominal
4. Klik "Terapkan"

**Expected Result:**
- Dokumen yang muncul sesuai filter
- Filter badge muncul
- Bisa hapus filter satu per satu atau "Reset Semua"
- URL berubah sesuai parameter filter

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 7.4 TC-022: Pagination

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-022 |
| **Scenario** | Navigasi halaman pada daftar dokumen |
| **Priority** | Medium |

**Test Steps:**

1. Pastikan ada banyak data (lebih dari 10)
2. Buka halaman Daftar Dokumen
3. Klik halaman 2, 3, dst
4. Klik Next/Previous

**Expected Result:**
- Setiap halaman menampilkan data yang berbeda
- Tombol Next/Previous aktif/non-aktif sesuai kondisi
- Info "Menampilkan X-Y dari Z total" muncul
- URL berubah (?page=2)

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 7.3 TC-023: Filter Unit Bisnis (Role-Based)

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-023 |
| **Scenario** | User regular hanya melihat dokumen unit bisnisnya |
| **Priority** | Critical |

**Test Steps:**

1. Login sebagai user regular (taxi_test)
2. Buka halaman Daftar Dokumen
3. Cek semua dokumen yang muncul

**Expected Result:**
- SEMUA dokumen yang muncul memiliki Unit Bisnis: BOSOWA_TAXI
- Tidak bisa melihat dokumen unit bisnis lain
- Filter Unit Bisnis tidak tersedia

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 7.4 TC-024: Sorting Dokumen

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-024 |
| **Scenario** | Mengurutkan dokumen berdasarkan kolom |
| **Priority** | Medium |

**Test Steps:**

1. Buka halaman Daftar Dokumen
2. Klik header kolom "Tanggal"
3. Klik lagi untuk reverse sort

**Expected Result:**
- Data terurut ascending saat klik pertama
- Data terurut descending saat klik kedua
- Icon sort muncul di header kolom

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

## 8. Modul Letter Detail

### 8.1 TC-025: View Detail Dokumen

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-025 |
| **Scenario** | Melihat detail dokumen lengkap |
| **Priority** | Critical |

**Test Steps:**

1. Buka daftar dokumen
2. Klik salah satu dokumen

**Expected Result:**
- Halaman detail menampilkan:
  - Metadata lengkap (Nomor, Tanggal, Pengirim, dll)
  - Preview dokumen (PDF/Gambar)
  - Tombol aksi (Edit, Download, Request Signature)
  - Info kreator dan tanggal create
  - Audit log jika ada perubahan
- Loading state saat fetching

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 8.2 TC-026: Download Dokumen

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-026 |
| **Scenario** | Mendownload file dokumen asli |
| **Priority** | High |

**Test Steps:**

1. Buka detail dokumen
2. Klik tombol "Download"
3. Cek file yang ter-download

**Expected Result:**
- File ter-download dengan nama yang benar
- File bisa dibuka
- Konten file sama dengan aslinya
- Jika gambar, otomatis dikonversi ke PDF

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 8.3 TC-027: Preview PDF di Browser

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-027 |
| **Scenario** | Preview PDF dokumen di browser |
| **Priority** | Medium |

**Test Steps:**

1. Buka detail dokumen bertipe PDF
2. Lihat preview dokumen

**Expected Result:**
- PDF dirender dengan benar di preview
- Bisa scroll halaman
- Bisa zoom in/out
- Tidak ter-download otomatis (IDM issue handled)

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 8.4 TC-028: Delete Dokumen

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-028 |
| **Scenario** | Menghapus dokumen |
| **Priority** | Critical |

**Test Steps:**

1. Buka detail dokumen
2. Klik tombol "Hapus"
3. Konfirmasi hapus

**Expected Result:**
- Confirmation dialog muncul
- Setelah konfirmasi, dokumen terhapus
- Redirect ke daftar dokumen
- Dokumen tidak muncul lagi di daftar
- File fisik terhapus dari server

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 8.5 TC-029: View Edit History

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-029 |
| **Scenario** | Melihat history perubahan dokumen |
| **Priority** | Medium |

**Test Steps:**

1. Edit dokumen (ubah beberapa field)
2. Buka detail dokumen yang sudah diedit
3. Cari section audit log atau history

**Expected Result:**
- Audit log menampilkan:
  - Field apa yang diubah
  - Nilai lama vs baru
  - Siapa yang mengubah
  - Kapan perubahan terjadi

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

## 9. Modul Digital Signature

### 9.1 TC-030: Upload Signature

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-030 |
| **Scenario** | Upload gambar tanda tangan |
| **Priority** | High |

**Test Steps:**

1. Login sebagai user manapun
2. Navigasi ke Settings > Signature
3. Klik "Upload Signature"
4. Pilih file gambar tanda tangan (PNG transparan disarankan)
5. Beri nama untuk signature
6. Set sebagai default jika diinginkan
7. Klik "Simpan"

**Expected Result:**
- Upload berhasil
- Signature muncul di daftar
- Preview gambar tampil
- Badge "Default" muncul jika di-set sebagai default
- Validasi: max 2MB, format PNG/JPG/WebP

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 9.2 TC-031: Draw Signature

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-031 |
| **Scenario** | Menggambar tanda tangan dengan canvas |
| **Priority** | High |

**Test Steps:**

1. Navigasi ke Settings > Signature
2. Klik "Draw Signature"
3. Gambar tanda tangan di canvas
4. Beri nama
5. Klik "Simpan"

**Expected Result:**
- Canvas responsive dan bisa digambar
- Ada tombol Clear untuk menggambar ulang
- Hasil gambar tersimpan sebagai PNG
- Signature muncul di daftar

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 9.3 TC-032: Set Default Signature

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-032 |
| **Scenario** | Mengubah signature default |
| **Priority** | Medium |

**Test Steps:**

1. Buat beberapa signature
2. Set salah satu sebagai default
3. Set signature lain sebagai default

**Expected Result:**
- Hanya satu signature yang menjadi default
- Badge "Default" berpindah
- Signature default otomatis dipilih saat request signature

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 9.4 TC-033: Delete Signature

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-033 |
| **Scenario** | Menghapus signature |
| **Priority** | Medium |

**Test Steps:**

1. Buat signature
2. Klik hapus pada signature tersebut
3. Konfirmasi

**Expected Result:**
- Signature terhapus dari daftar
- Tidak bisa digunakan untuk request baru
- Jika signature default dihapus, signature lain jadi default

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 9.5 TC-034: Request Signature

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-034 |
| **Scenario** | Membuat request tanda tangan untuk dokumen |
| **Priority** | Critical |

**Test Steps:**

1. Buka detail dokumen
2. Klik "Request Signature"
3. Pilih user yang akan diminta tanda tangan
4. Tambahkan notes jika perlu
5. Pilih signature yang akan digunakan (default terpilih)
6. Klik "Kirim Request"

**Expected Result:**
- Modal request signature muncul
- Bisa pilih multiple user
- Notification terkirim ke user yang dituju
- Status request: PENDING
- Request muncul di dashboard penerima

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 9.6 TC-035: Approve Signature Request

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-035 |
| **Scenario** | Menyetujui request tanda tangan |
| **Priority** | Critical |

**Test Steps:**

1. Login sebagai user yang menerima request
2. Buka "Pending Signatures" dari dashboard
3. Klik request yang akan di-approve
4. Review dokumen
5. Pilih signature yang akan digunakan
6. Klik "Sign"

**Expected Result:**
- Dokumen ditandatangani dengan signature user
- Status berubah: APPROVED
- Dokumen PDF baru dibuat dengan signature
- Notification terkirim ke requestor
- Dokumen signed tersimpan di folder khusus

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 9.7 TC-036: Reject Signature Request

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-036 |
| **Scenario** | Menolak request tanda tangan |
| **Priority** | High |

**Test Steps:**

1. Login sebagai user yang menerima request
2. Buka "Pending Signatures"
3. Klik request yang akan ditolak
4. Isi alasan penolakan (notes)
5. Klik "Reject"

**Expected Result:**
- Status berubah: REJECTED
- Alasan penolakan tersimpan
- Notification terkirim ke requestor
- Dokumen tidak ditandatangani

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 9.8 TC-039: View Signed Document

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-039 |
| **Scenario** | Melihat dokumen yang sudah ditandatangani |
| **Priority** | High |

**Test Steps:**

1. Buka dokumen yang sudah ditandatangani
2. Cek preview dokumen

**Expected Result:**
- Preview menampilkan dokumen dengan signature
- Signature muncul di posisi yang benar
- Info status signed muncul
- Download menghasilkan PDF dengan signature

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

## 10. Modul User Management

### 10.1 TC-040: Create User (Admin Only)

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-040 |
| **Scenario** | Admin membuat user baru |
| **Priority** | Critical |

**Test Steps:**

1. Login sebagai admin
2. Navigasi ke Settings > Users
3. Klik "Tambah User"
4. Isi form:
   - Username (unique)
   - Password (min 8 karakter, ada huruf & angka)
   - Role (USER/MANAJEMEN/ADMIN)
   - Unit Bisnis (jika role USER)
5. Klik "Simpan"

**Expected Result:**
- User berhasil dibuat
- Muncul di daftar user
- Password ter-hash (bukan plaintext)
- User bisa login dengan kredensial baru

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 10.2 TC-041: Edit User

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-041 |
| **Scenario** | Admin mengedit data user |
| **Priority** | High |

**Test Steps:**

1. Login sebagai admin
2. Buka Settings > Users
3. Klik edit pada user tertentu
4. Ubah role atau unit bisnis
5. Klik "Simpan"

**Expected Result:**
- Data user berhasil diupdate
- Perubahan berlaku setelah user re-login

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 10.3 TC-043: Delete User

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-043 |
| **Scenario** | Admin menghapus user |
| **Priority** | High |

**Test Steps:**

1. Login sebagai admin
2. Buka Settings > Users
3. Klik hapus pada user (bukan diri sendiri)
4. Konfirmasi

**Expected Result:**
- User terhapus
- Tidak bisa login lagi
- Dokumen yang dibuat user tetap ada (soft delete user atau reassign)

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 10.4 TC-044: Non-Admin Tidak Akses User Management

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-044 |
| **Scenario** | User regular tidak bisa akses manajemen user |
| **Priority** | Critical |

**Test Steps:**

1. Login sebagai user regular
2. Coba akses langsung: `/settings/users`
3. Atau cek menu navigasi

**Expected Result:**
- Menu Users tidak muncul di navigasi
- Akses langsung di-redirect atau error 403

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

## 11. Modul Statistics & Dashboard

### 11.1 TC-045: View Dashboard

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-045 |
| **Scenario** | Melihat dashboard dengan statistik |
| **Priority** | High |

**Test Steps:**

1. Login sebagai user manapun
2. Buka halaman Dashboard

**Expected Result:**
- Statistik muncul:
  - Total surat masuk
  - Total surat keluar
  - Total nominal (jika ada role akses)
  - Dokumen terbaru
  - Pending signature requests
- Filter tanggal tersedia
- Data sesuai unit bisnis (untuk user regular)

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 11.2 TC-046: Filter Date Range di Stats

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-046 |
| **Scenario** | Filter statistik berdasarkan rentang tanggal |
| **Priority** | Medium |

**Test Steps:**

1. Buka halaman Dashboard
2. Set filter tanggal (contoh: bulan ini)
3. Klik "Terapkan"

**Expected Result:**
- Statistik berubah sesuai filter
- Hanya menghitung dokumen dalam rentang tanggal

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 11.3 TC-047: Stats Role-Based Access

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-047 |
| **Scenario** | User regular hanya lihat stats unit bisnisnya |
| **Priority** | High |

**Test Steps:**

1. Login sebagai user regular (taxi_test)
2. Buka halaman Dashboard
3. Cek statistik yang muncul

**Expected Result:**
- Statistik hanya untuk dokumen BOSOWA_TAXI
- Tidak bisa melihat statistik unit bisnis lain
- Total nominal mungkin tidak muncul (tergantung role setting)

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

## 12. Modul Notifications

### 12.1 TC-048: Receive Notification

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-048 |
| **Scenario** | Menerima notifikasi |
| **Priority** | Medium |

**Test Steps:**

1. Login sebagai user A
2. User lain membuat signature request untuk user A
3. User A refresh halaman atau cek notification

**Expected Result:**
- Bell icon di header menunjukkan unread count
- Notification list muncul saat klik bell
- Preview notification muncul
- Tipe notifikasi: Signature Request, Document Created, dll

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 12.2 TC-049: Mark as Read

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-049 |
| **Scenario** | Menandai notifikasi sebagai sudah dibaca |
| **Priority** | Low |

**Test Steps:**

1. Buka daftar notifikasi
2. Klik salah satu notifikasi
3. Cek perubahan status

**Expected Result:**
- Notifikasi ditandai sebagai read
- Unread count berkurang
- Notifikasi read visualnya berbeda

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 12.3 TC-050: Mark All as Read

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-050 |
| **Scenario** | Menandai semua notifikasi sebagai dibaca |
| **Priority** | Low |

**Test Steps:**

1. Buka daftar notifikasi
2. Klik "Tandai Semua Dibaca"

**Expected Result:**
- Semua notifikasi jadi read
- Unread count menjadi 0
- Bell icon tanpa badge

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

## 13. Security Testing

### 13.1 TC-051: SQL Injection Prevention

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-051 |
| **Scenario** | Mencegah SQL injection di input field |
| **Priority** | Critical |

**Test Steps:**

1. Di form dokumen, masukkan di field pencarian:
   - `' OR '1'='1`
   - `'; DROP TABLE letters; --`
   - `<script>alert('xss')</script>`
2. Submit form

**Expected Result:**
- Input diperlakukan sebagai string literal
- Tidak ada error SQL
- Hasil pencarian kosong atau valid
- Tidak ada data yang bocor

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 13.2 TC-052: XSS Prevention

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-052 |
| **Scenario** | Mencegah XSS di input field |
| **Priority** | Critical |

**Test Steps:**

1. Di field perihal atau nama pengirim, masukkan:
   - `<script>alert('xss')</script>`
   - `<img src=x onerror=alert('xss')>`
2. Simpan dokumen
3. Buka dokumen tersebut

**Expected Result:**
- Input disanitized atau di-escape
- Script tidak dieksekusi
- Data tampil sebagai teks biasa

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 13.3 TC-053: Unauthorized Access Prevention

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-053 |
| **Scenario** | Mencegah akses tanpa token |
| **Priority** | Critical |

**Test Steps:**

1. Login untuk dapat token
2. Buka DevTools > Application > Local Storage
3. Hapus token
4. Coba navigasi ke halaman protected
5. Atau coba call API langsung tanpa header Authorization

**Expected Result:**
- Redirect ke halaman login
- API return 401 Unauthorized
- Tidak bisa akses data tanpa auth

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 13.4 TC-054: Cross-Unit Bisnis Access Prevention

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-054 |
| **Scenario** | User tidak bisa akses dokumen unit bisnis lain |
| **Priority** | Critical |

**Test Steps:**

1. Login sebagai user BOSOWA_TAXI
2. Coba akses langsung URL dokumen dari unit bisnis lain:
   - `/letters/{id-of-other-unit-document}`
3. Atau coba API call langsung

**Expected Result:**
- Return 403 Forbidden atau 404 Not Found
- Pesan error jelas
- Tidak ada data bocor

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 13.5 TC-055: File Upload Security

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-055 |
| **Scenario** | Mencegah upload file berbahaya |
| **Priority** | Critical |

**Test Steps:**

1. Coba upload file berbahaya:
   - `.exe` dengan ekstensi `pdf.exe`
   - Script file
   - File dengan path traversal di nama

**Expected Result:**
- Validasi mencegah upload
- File extension dicek thoroughly
- Filename disanitized
- Tidak ada overwrite file sistem

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

## 14. Performance Testing

### 14.1 TC-056: Load Time - Dashboard

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-056 |
| **Scenario** | Dashboard load dalam waktu acceptable |
| **Priority** | Medium |

**Test Steps:**

1. Buka DevTools > Network tab
2. Clear cache
3. Navigate ke Dashboard
4. Catat waktu load

**Expected Result:**
- Initial load: < 3 detik
- Subsequent load: < 1 detik (dengan cache)
- Tidak ada blocking request

**Actual Result:** (Isi saat testing)
```
Load time: _____ detik
```

**Status:** Pass / Fail

---

### 14.2 TC-057: Load Time - Documents List

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-057 |
| **Scenario** | Daftar dokumen load cepat |
| **Priority** | Medium |

**Test Steps:**

1. Buka DevTools > Network tab
2. Navigate ke Letters List
3. Catat waktu response API `/letters`
4. Catat waktu render total

**Expected Result:**
- API response: < 500ms (100 data)
- Total render: < 2 detik

**Actual Result:** (Isi saat testing)
```
API response: _____ ms
Total render: _____ detik
```

**Status:** Pass / Fail

---

### 14.3 TC-058: OCR Processing Time

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-058 |
| **Scenario** | OCR selesai dalam waktu reasonable |
| **Priority** | High |

**Test Steps:**

1. Upload dokumen PDF normal (2-3 halaman)
2. Catat waktu mulai dan selesai OCR
3. Ulangi untuk 5 dokumen berbeda

**Expected Result:**
- Sync mode: < 10 detik
- Async mode: Selesai dalam < 30 detik
- Status update real-time

**Actual Result:** (Isi saat testing)
```
Dokumen 1: _____ detik
Dokumen 2: _____ detik
Dokumen 3: _____ detik
Dokumen 4: _____ detik
Dokumen 5: _____ detik
Rata-rata: _____ detik
```

**Status:** Pass / Fail

---

### 14.4 TC-059: Pagination Performance

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-059 |
| **Scenario** | Perpindahan halaman cepat |
| **Priority** | Medium |

**Test Steps:**

1. Buat minimal 50 dokumen
2. Buka daftar dokumen
3. Klik halaman 1, 2, 3, 4, 5
4. Catat waktu per halaman

**Expected Result:**
- Setiap halaman: < 1 detik
- Tidak ada lag saat klik
- React Query cache bekerja

**Actual Result:** (Isi saat testing)
```
Halaman 1: _____ ms
Halaman 2: _____ ms
Halaman 3: _____ ms
```

**Status:** Pass / Fail

---

## 15. Browser Compatibility Testing

### 15.1 TC-060: Chrome Browser

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-060 |
| **Scenario** | Aplikasi berfungsi normal di Chrome |
| **Priority** | High |

**Test Steps:**

1. Buka aplikasi di Chrome (latest version)
2. Test critical flows:
   - Login
   - Upload & OCR
   - View documents
   - Signature
3. Cek console untuk error

**Expected Result:**
- Semua fitur berfungsi
- Tidak ada console error
- UI sesuai design

**Actual Result:** (Isi saat testing)
```
Chrome Version: _____
Console Errors: _____
```

**Status:** Pass / Fail

---

### 15.2 TC-061: Firefox Browser

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-061 |
| **Scenario** | Aplikasi berfungsi normal di Firefox |
| **Priority** | High |

**Test Steps:**

1. Buka aplikasi di Firefox (latest version)
2. Test critical flows
3. Cek console

**Expected Result:**
- Semua fitur berfungsi
- Tidak ada console error
- UI konsisten

**Actual Result:** (Isi saat testing)
```
Firefox Version: _____
Issues found: _____
```

**Status:** Pass / Fail

---

### 15.3 TC-062: Edge Browser

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-062 |
| **Scenario** | Aplikasi berfungsi normal di Edge |
| **Priority** | Medium |

**Test Steps:**

1. Buka aplikasi di Edge (latest version)
2. Test critical flows
3. Cek console

**Expected Result:**
- Semua fitur berfungsi
- Tidak ada issue

**Actual Result:** (Isi saat testing)
```
Edge Version: _____
Issues found: _____
```

**Status:** Pass / Fail

---

## 16. Mobile Responsiveness Testing

### 16.1 TC-063: Mobile View (375px - iPhone SE)

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-063 |
| **Scenario** | Tampilan mobile di iPhone SE |
| **Priority** | High |

**Test Steps:**

1. Buka DevTools > Device Toolbar
2. Pilih iPhone SE (375x667)
3. Test critical pages:
   - Login
   - Dashboard
   - Documents List
   - Document Detail

**Expected Result:**
- Layout responsive
- Hamburger menu untuk navigasi
- Tabel berubah jadi card atau scrollable
- Input masih mudah di-touch

**Actual Result:** (Isi saat testing)
```
Issues found: _____
```

**Status:** Pass / Fail

---

### 16.2 TC-064: Tablet View (768px - iPad)

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-064 |
| **Scenario** | Tampilan tablet di iPad |
| **Priority** | Medium |

**Test Steps:**

1. Set viewport ke 768px width
2. Test semua halaman utama

**Expected Result:**
- Layout menyesuaikan
- Sidebar mungkin collapse
- Content readable

**Actual Result:** (Isi saat testing)
```
Issues found: _____
```

**Status:** Pass / Fail

---

## 17. Error Handling Testing

### 17.1 TC-065: Backend Error Handling

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-065 |
| **Scenario** | Backend error ditangani dengan baik |
| **Priority** | High |

**Test Steps:**

1. Matikan backend server
2. Coba lakukan action di frontend
3. Nyalakan backend lagi

**Expected Result:**
- Error message user-friendly muncul
- Toast/Notification jelas
- Aplikasi tidak crash
- Bisa retry setelah backend up

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 17.2 TC-066: Network Error Handling

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-066 |
| **Scenario** | Network error ditangani |
| **Priority** | High |

**Test Steps:**

1. Buka DevTools > Network tab
2. Set throttling ke "Offline"
3. Coba lakukan action
4. Set kembali ke "Online"

**Expected Result:**
- Error network terdeteksi
- Pesan jelas: "Periksa koneksi internet"
- Tidak ada infinite loading

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

### 17.3 TC-067: 404 Page

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-067 |
| **Scenario** | Halaman 404 untuk route tidak ditemukan |
| **Priority** | Medium |

**Test Steps:**

1. Akses URL tidak valid: `/random-not-found-page`

**Expected Result:**
- Halaman 404 kustom muncul
- Pesan jelas
- Tombol kembali ke home/dashboard

**Actual Result:** (Isi saat testing)
```
_________________________________________
```

**Status:** Pass / Fail

---

## 18. Bug Report Template

Jika menemukan bug, gunakan template berikut:

```markdown
### Bug Report: [Judul Bug Singkat]

**Severity:** Critical / High / Medium / Low

**Test Case ID:** TC-XXX

**Environment:**
- OS: [Windows/macOS/Linux + Version]
- Browser: [Chrome/Firefox/Edge + Version]
- Screen Resolution: [1920x1080, dll]

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Result:**
[Describe what should happen]

**Actual Result:**
[Describe what actually happened]

**Screenshots/Videos:**
[Attach if applicable]

**Console Errors:**
[Paste console errors if any]

**Additional Notes:**
[Any other relevant information]
```

---

## 19. Test Execution Summary

### 19.1 Test Coverage

| Modul | Total TC | Executed | Passed | Failed | Pass Rate |
|-------|----------|----------|--------|--------|-----------|
| Authentication | 6 | | | | |
| Upload & OCR | 6 | | | | |
| Letters Form | 6 | | | | |
| Letters List | 6 | | | | |
| Letter Detail | 5 | | | | |
| Digital Signature | 7 | | | | |
| User Management | 5 | | | | |
| Statistics | 3 | | | | |
| Notifications | 3 | | | | |
| Security | 5 | | | | |
| Performance | 4 | | | | |
| Browser Compatibility | 3 | | | | |
| Mobile Responsiveness | 2 | | | | |
| Error Handling | 3 | | | | |
| **TOTAL** | **67** | | | | |

### 19.2 Testing Checklist

- [ ] Test environment setup selesai
- [ ] Test data prepared (users, documents)
- [ ] All test cases executed
- [ ] All bugs documented
- [ ] Screenshots untuk critical flows diambil
- [ ] Performance metrics dicatat
- [ ] Browser compatibility dicek
- [ ] Mobile responsiveness dicek
- [ ] Security testing dilakukan
- [ ] Test report final dibuat

---

## 20. Sign-off

**Tester Name:** ___________________

**Test Date:** ___________________

**Test Environment:** [Local / Staging / Production]

**Overall Result:** [ ] Pass [ ] Fail [ ] Pass with Minor Issues

**Notes:**
```
_________________________________________
_________________________________________
_________________________________________
```

**Approved By:** ___________________ **Date:** ___________________

---

## Appendix: Test Data Examples

### Sample Letter Data for Manual Entry

```json
{
  "letterNumber": "007/SS/IV/2018",
  "jenisSurat": "MASUK",
  "jenisDokumen": "SURAT",
  "unitBisnis": "BOSOWA_TAXI",
  "tanggalSurat": "2018-04-15",
  "namaPengirim": "PT Contoh Abadi",
  "alamatPengirim": "Jl. Boulevard No. 123",
  "teleponPengirim": "08123456789",
  "perihal": "Penawaran Kerjasama",
  "totalNominal": 5000000
}
```

### Sample OCR Result

```json
{
  "letterNumber": "123/INV/X/2024",
  "tanggalSurat": "2024-10-15",
  "namaPengirim": "PT Vendor Jaya",
  "alamatPengirim": "Jl. Sudirman No. 456",
  "teleponPengirim": "08198765432",
  "perihal": "Invoice Service Oktober 2024",
  "totalNominal": 15000000,
  "senderConfidence": "high",
  "senderSource": "header",
  "extractionMethod": "ai"
}
```

---

*Dokumen ini versi 1.0 - Terakhir diupdate: 22 Januari 2026*
