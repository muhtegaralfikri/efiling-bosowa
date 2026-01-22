import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../api/client';
import type { Letter, PaginatedResponse } from '../api/types';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZE = 10;

// Define base columns
const allColumns = [
  { key: 'unitBisnis', label: 'Unit Bisnis' },
  { key: 'letterNumber', label: 'Nomor Dokumen' },
  { key: 'jenisSurat', label: 'Jenis Dokumen' },
  { key: 'jenisDokumen', label: 'Kategori' },
  { key: 'tanggalSurat', label: 'Tanggal' },
  { key: 'namaPengirim', label: 'Pengirim' },
  { key: 'perihal', label: 'Perihal' },
] as const;

type Column = typeof allColumns[number];

export default function LettersListPage() {
  const { user } = useAuth();
  
  // Filter columns based on user role
  const columns = useMemo(() => {
    if (user?.role === 'ADMIN' || user?.role === 'MANAJEMEN') {
      return allColumns; // Show all columns including unit bisnis
    } else {
      // Remove unit bisnis column for regular users
      return allColumns.filter(col => col.key !== 'unitBisnis');
    }
  }, [user]);

  // Dynamic grid template based on column count
  const gridTemplateColumns = useMemo(() => {
    if (user?.role === 'ADMIN' || user?.role === 'MANAJEMEN') {
      return '1.5fr 2fr 1fr 1fr 1.2fr 2fr 2.5fr'; // 7 columns with unit bisnis
    } else {
      return '2fr 1fr 1fr 1.2fr 2fr 2.5fr'; // 6 columns without unit bisnis
    }
  }, [user]);

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState({
    namaPengirim: '',
    perihal: '',
    jenisDokumen: '',
    jenisSurat: '',
    unitBisnis: '',
    tanggalMulai: '',
    tanggalSelesai: '',
    nominalMin: '',
    nominalMax: ''
  });

  // Debounce search input to avoid spamming API on every keystroke
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);

    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const getCellValue = (
    letter: Letter,
    key: Column['key'],
  ) => {
    switch (key) {
      case 'unitBisnis':
        return letter.unitBisnis?.replaceAll('_', ' ') || '-';
      case 'letterNumber':
        return letter.letterNumber;
      case 'jenisSurat':
        return letter.jenisSurat;
      case 'jenisDokumen':
        return letter.jenisDokumen;
      case 'tanggalSurat':
        return letter.tanggalSurat;
      case 'namaPengirim':
        return letter.namaPengirim || '-';
      case 'perihal':
        return letter.perihal || '-';
      default:
        return '';
    }
  };

  const { data, isLoading, isFetching } = useQuery<PaginatedResponse<Letter>>(
    {
      queryKey: ['letters', { search, page, ...filters }],
      queryFn: async (): Promise<PaginatedResponse<Letter>> => {
        try {
          const params: Record<string, string | number> = {
            page,
            limit: PAGE_SIZE,
          };
          
          // Add search parameters
          if (search) params.keyword = search;
          if (filters.namaPengirim) params.namaPengirim = filters.namaPengirim;
          if (filters.perihal) params.perihal = filters.perihal;
          if (filters.jenisDokumen) params.jenisDokumen = filters.jenisDokumen;
          if (filters.jenisSurat) params.jenisSurat = filters.jenisSurat;
          if (filters.unitBisnis) params.unitBisnis = filters.unitBisnis;
          if (filters.tanggalMulai) params.tanggalMulai = filters.tanggalMulai;
          if (filters.tanggalSelesai) params.tanggalSelesai = filters.tanggalSelesai;
          if (filters.nominalMin) params.nominalMin = filters.nominalMin;
          if (filters.nominalMax) params.nominalMax = filters.nominalMax;

          const res = await api.get('/letters', { params });
          return res.data as PaginatedResponse<Letter>;
        } catch (err) {
          toast.error('Gagal memuat daftar dokumen');
          throw err;
        }
      },
      retry: 1,
    },
  );

  const letters = data?.data ?? [];
  const totalPages = Math.max(data?.meta.pageCount ?? 1, 1);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      namaPengirim: '',
      perihal: '',
      jenisDokumen: '',
      jenisSurat: '',
      unitBisnis: '',
      tanggalMulai: '',
      tanggalSelesai: '',
      nominalMin: '',
      nominalMax: ''
    });
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const goToPrev = () => setPage((prev) => Math.max(prev - 1, 1));
  const goToNext = () =>
    setPage((prev) => Math.min(prev + 1, totalPages || prev + 1));

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Daftar</p>
          <h1>Dokumen</h1>
        </div>
        <div className="actions">
          <input
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Cari semua field"
            className="search-input"
          />
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="ghost-btn"
          >
            {showAdvanced ? 'Sembunyikan Filter' : 'Filter Lanjutan'}
          </button>
          <Link to="/letters/new" className="primary-btn">
            Tambah Dokumen
          </Link>
        </div>
      </div>
      
      {/* Advanced Filters */}
      {showAdvanced && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Filter</p>
              <h1>Filter Lanjutan</h1>
              <p className="small-note">Cari berdasarkan kriteria spesifik</p>
            </div>
            <button 
              type="button" 
              className="ghost-btn" 
              onClick={handleResetFilters}
            >
              Reset Filter
            </button>
          </div>
          
          <div className="form-grid two-col">
            <label>
              Nama Pengirim
              <input
                value={filters.namaPengirim}
                onChange={(e) => handleFilterChange('namaPengirim', e.target.value)}
                placeholder="PT Contoh Abadi"
              />
            </label>
            
            <label>
              Perihal
              <input
                value={filters.perihal}
                onChange={(e) => handleFilterChange('perihal', e.target.value)}
                placeholder="Pembayaran invoice"
              />
            </label>
            
            <label>
              Jenis Dokumen
              <select
                value={filters.jenisDokumen}
                onChange={(e) => handleFilterChange('jenisDokumen', e.target.value)}
              >
                <option value="">Semua</option>
                <option value="SURAT">SURAT</option>
                <option value="INVOICE">INVOICE</option>
                <option value="INTERNAL_MEMO">INTERNAL MEMO</option>
                <option value="PAD">PAD</option>
              </select>
            </label>
            
            <label>
              Jenis Dokumen
              <select
                value={filters.jenisSurat}
                onChange={(e) => handleFilterChange('jenisSurat', e.target.value)}
              >
                <option value="">Semua</option>
                <option value="MASUK">MASUK</option>
                <option value="KELUAR">KELUAR</option>
              </select>
            </label>
            
            {/* Unit Bisnis Filter - Only for Admin and Manajemen */}
            {(user?.role === 'ADMIN' || user?.role === 'MANAJEMEN') && (
              <label>
                Unit Bisnis
                <select
                  value={filters.unitBisnis}
                  onChange={(e) => handleFilterChange('unitBisnis', e.target.value)}
                >
                  <option value="">Semua</option>
                  <option value="BOSOWA_TAXI">Bosowa Taxi</option>
                  <option value="OTORENTAL_NUSANTARA">Otorental Nusantara</option>
                  <option value="OTO_GARAGE_INDONESIA">Oto Garage Indonesia</option>
                  <option value="MALLOMO">Mallomo</option>
                  <option value="LAGALIGO_LOGISTIK">Lagaligo Logistik</option>
                  <option value="PORT_MANAGEMENT">Port Management</option>
                </select>
              </label>
            )}
            
            <label>
              Tanggal Mulai
              <input
                type="date"
                value={filters.tanggalMulai}
                onChange={(e) => handleFilterChange('tanggalMulai', e.target.value)}
              />
            </label>
            
            <label>
              Tanggal Selesai
              <input
                type="date"
                value={filters.tanggalSelesai}
                onChange={(e) => handleFilterChange('tanggalSelesai', e.target.value)}
              />
            </label>
            
            <label>
              Nominal Minimum
              <input
                type="number"
                value={filters.nominalMin}
                onChange={(e) => handleFilterChange('nominalMin', e.target.value)}
                placeholder="0"
              />
            </label>
            
            <label>
              Nominal Maksimum
              <input
                type="number"
                value={filters.nominalMax}
                onChange={(e) => handleFilterChange('nominalMax', e.target.value)}
                placeholder="999999999"
              />
            </label>
          </div>
        </section>
      )}
      
      <div className="table-container">
        <div className="table">
          <div 
            className="table-row table-head"
            style={{ gridTemplateColumns }}
          >
            {columns.map((col) => (
              <span key={col.key}>{col.label}</span>
            ))}
          </div>
          {isLoading && (
            <>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton-row">
                  {columns.map((col) => (
                    <div key={col.key} className="skeleton skeleton-cell" />
                  ))}
                </div>
              ))}
            </>
          )}
          {!isLoading && letters.length === 0 && (
            <div className="table-row table-message">
              <span>Tidak ada dokumen</span>
            </div>
          )}
          {letters.map((letter: Letter) => (
            <Link
              key={letter.id}
              to={`/letters/${letter.id}`}
              className="table-row table-body-row"
              style={{ gridTemplateColumns }}
            >
              {columns.map((col) => (
                <div key={col.key} className="table-cell" style={{ minWidth: 0 }}>
                  <span className="cell-label">{col.label}</span>
                  <span className={`cell-value ${(col.key === 'perihal' || col.key === 'namaPengirim' || col.key === 'letterNumber' || col.key === 'unitBisnis') ? 'truncate' : ''}`}>
                    {getCellValue(letter, col.key)}
                  </span>
                </div>
              ))}
            </Link>
          ))}
        </div>
      </div>
      <div className="actions pagination-actions" style={{ marginTop: '1rem', gap: '0.75rem' }}>
        <button
          type="button"
          className="ghost-btn"
          onClick={goToPrev}
          disabled={page <= 1}
        >
          <ChevronLeft size={18} />
        </button>
        <span>
{page} / {totalPages} {isFetching && '(memuat...)'}
        </span>
        <button
          type="button"
          className="ghost-btn"
          onClick={goToNext}
          disabled={page >= totalPages}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}
