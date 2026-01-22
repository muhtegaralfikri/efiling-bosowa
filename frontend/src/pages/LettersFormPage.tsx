import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const DRAFT_KEY = 'bosowa-letter-draft';

interface LocationState {
  ocrResult?: {
    letterNumber: string | null;
    tanggalSurat: string | null;
    namaPengirim: string | null;
    alamatPengirim?: string | null;
    teleponPengirim?: string | null;
    senderConfidence?: 'high' | 'medium' | 'low';
    senderSource?: 'header' | 'signature' | 'ai' | null;
    perihal: string | null;
    totalNominal: number;
    extractionMethod?: 'ai' | 'regex';
  };
  uploadMeta?: { fileId: string }; // legacy
  originalMeta?: { fileId: string };
}

const getInitialForm = (state: LocationState, userUnitBisnis?: string) => {
  const baseForm = state.ocrResult ? {
    letterNumber: state.ocrResult.letterNumber || '',
    jenisSurat: 'MASUK',
    jenisDokumen: 'SURAT',
    unitBisnis: '', // Will be set automatically for regular users
    tanggalSurat: state.ocrResult.tanggalSurat || '',
    namaPengirim: state.ocrResult.namaPengirim || '',
    alamatPengirim: state.ocrResult.alamatPengirim || '',
    teleponPengirim: state.ocrResult.teleponPengirim || '',
    perihal: state.ocrResult.perihal || '',
    totalNominal: state.ocrResult.totalNominal || 0,
  } : null;

  const saved = localStorage.getItem(DRAFT_KEY);
  const savedForm = saved ? (() => {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  })() : null;

  const defaultForm = {
    letterNumber: '',
    jenisSurat: 'MASUK',
    jenisDokumen: 'SURAT',
    unitBisnis: '', // Will be set automatically for regular users
    tanggalSurat: '',
    namaPengirim: '',
    alamatPengirim: '',
    teleponPengirim: '',
    perihal: '',
    totalNominal: 0,
  };

  const form = baseForm || savedForm || defaultForm;

  // Auto-set unit bisnis for regular users
  if (userUnitBisnis) {
    form.unitBisnis = userUnitBisnis;
  }

  return form;
};

export default function LettersFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const state = (location.state || {}) as LocationState;

  const [form, setForm] = useState(() => getInitialForm(state, user?.unitBisnis ?? undefined));
  const senderConfidence = state.ocrResult?.senderConfidence;
  const extractionMethod = state.ocrResult?.extractionMethod;
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [hasDraft, setHasDraft] = useState(
    () => !state.ocrResult && !!localStorage.getItem(DRAFT_KEY),
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    }, 500);
    return () => clearTimeout(timeout);
  }, [form]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  };

  const isAdminOrManajemen = user && (user.role === 'ADMIN' || user.role === 'MANAJEMEN');



  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setErrors(null);
    setFieldErrors({});

    // Validate required fields
    const newFieldErrors: Record<string, string> = {};
    
    if (!form.letterNumber) {
      newFieldErrors.letterNumber = 'Nomor Dokumen wajib diisi';
    }
    if (!form.tanggalSurat) {
      newFieldErrors.tanggalSurat = 'Tanggal Dokumen wajib diisi';
    }
    if (isAdminOrManajemen && !form.unitBisnis) {
      newFieldErrors.unitBisnis = 'Unit Bisnis wajib dipilih untuk Admin/Manajemen';
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setErrors('Mohon lengkapi field yang wajib diisi.');
      toast.error('Mohon lengkapi field yang wajib diisi.');
      return;
    }
    try {
      await api.post('/letters', {
        ...form,
        totalNominal: Number(form.totalNominal),
        fileId: state.originalMeta?.fileId || state.uploadMeta?.fileId,
      });
      setMessage('Dokumen tersimpan');
      toast.success('Dokumen tersimpan');
      clearDraft();
      // Invalidate letters cache so list updates automatically
      queryClient.invalidateQueries({ queryKey: ['letters'] });
      navigate('/letters');
    } catch {
      setMessage('Gagal menyimpan dokumen');
      toast.error(
        'Gagal menyimpan dokumen. Pastikan semua field wajib terisi dan backend aktif.',
      );
    }
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Form Dokumen</p>
          <h1>Input metadata dokumen</h1>
          {extractionMethod && (
            <p className="small-note">
              Ekstraksi: {extractionMethod === 'ai' ? 'AI' : 'Regex'} 
              {extractionMethod === 'ai' && ' ✓'}
            </p>
          )}
        </div>
        <button type="button" className="ghost-btn" onClick={() => navigate(-1)}>
          Kembali
        </button>
      </div>
      {hasDraft && (
        <div className="draft-notice">
          <span>Draft tersimpan dipulihkan</span>
          <button type="button" onClick={clearDraft}>Hapus draft</button>
        </div>
      )}
      <form className="form-grid two-col" onSubmit={handleSubmit}>
        <label>
          Nomor Dokumen
          <input
            value={form.letterNumber}
            onChange={(e) => {
              setForm({ ...form, letterNumber: e.target.value });
              if (fieldErrors.letterNumber) {
                setFieldErrors({ ...fieldErrors, letterNumber: '' });
              }
            }}
            placeholder="007/SS/IV/2018"
            required
            className={fieldErrors.letterNumber ? 'error' : ''}
          />
          {fieldErrors.letterNumber && (
            <span className="field-error">{fieldErrors.letterNumber}</span>
          )}
        </label>
        <label>
          Tipe Dokumen
          <select
            value={form.jenisSurat}
            onChange={(e) => setForm({ ...form, jenisSurat: e.target.value })}
          >
            <option value="MASUK">MASUK</option>
            <option value="KELUAR">KELUAR</option>
          </select>
        </label>
        <label>
          Jenis Dokumen
          <select
            value={form.jenisDokumen}
            onChange={(e) =>
              setForm({ ...form, jenisDokumen: e.target.value })
            }
          >
            <option value="SURAT">SURAT</option>
            <option value="INVOICE">INVOICE</option>
            <option value="INTERNAL_MEMO">INTERNAL MEMO</option>
            <option value="PAD">PAD</option>
          </select>
        </label>
        {/* Only show unit bisnis field for admin/manajemen */}
        {isAdminOrManajemen && (
          <label>
            Unit Bisnis
            <select
              value={form.unitBisnis}
              onChange={(e) => {
                setForm({ ...form, unitBisnis: e.target.value });
                if (fieldErrors.unitBisnis) {
                  setFieldErrors({ ...fieldErrors, unitBisnis: '' });
                }
              }}
              required
              className={fieldErrors.unitBisnis ? 'error' : ''}
            >
              <option value="">Pilih Unit Bisnis</option>
              <option value="BOSOWA_TAXI">Bosowa Taxi</option>
              <option value="OTORENTAL_NUSANTARA">Otorental Nusantara</option>
              <option value="OTO_GARAGE_INDONESIA">Oto Garage Indonesia</option>
              <option value="MALLOMO">Mallomo</option>
              <option value="LAGALIGO_LOGISTIK">Lagaligo Logistik</option>
              <option value="PORT_MANAGEMENT">Port Management</option>
            </select>
            {fieldErrors.unitBisnis && (
              <span className="field-error">{fieldErrors.unitBisnis}</span>
            )}
          </label>
        )}
        
        {/* Show current unit bisnis info for regular users */}
        {!isAdminOrManajemen && user?.unitBisnis && (
          <div className="unit-bisnis-readonly">
            <div className="unit-bisnis-label">Unit Bisnis</div>
            <div className="unit-bisnis-value">
              {user.unitBisnis.replace('_', ' ')}
            </div>
          </div>
        )}
        <label>
          Tanggal Dokumen
          <input
            type="date"
            value={form.tanggalSurat}
            onChange={(e) => {
              setForm({ ...form, tanggalSurat: e.target.value });
              if (fieldErrors.tanggalSurat) {
                setFieldErrors({ ...fieldErrors, tanggalSurat: '' });
              }
            }}
            placeholder="2025-02-12"
            required
            className={fieldErrors.tanggalSurat ? 'error' : ''}
          />
          {fieldErrors.tanggalSurat && (
            <span className="field-error">{fieldErrors.tanggalSurat}</span>
          )}
        </label>
        <label>
          Nama Pengirim
          {senderConfidence && (
            <span
              className={`confidence-badge ${senderConfidence}`}
              title={`Confidence: ${senderConfidence}`}
            >
              {senderConfidence === 'high' ? '✓ Yakin' : senderConfidence === 'medium' ? '~ Mungkin' : '? Rendah'}
            </span>
          )}
          <input
            value={form.namaPengirim}
            onChange={(e) => setForm({ ...form, namaPengirim: e.target.value })}
            placeholder="PT Contoh Abadi"
          />
        </label>
        <label>
          Alamat Pengirim
          <input
            value={form.alamatPengirim}
            onChange={(e) =>
              setForm({ ...form, alamatPengirim: e.target.value })
            }
            placeholder="Jl. Boulevard No. 123"
          />
        </label>
        <label>
          Telepon Pengirim
          <input
            value={form.teleponPengirim}
            onChange={(e) =>
              setForm({ ...form, teleponPengirim: e.target.value })
            }
            placeholder="0812xxxxxxx"
          />
        </label>
        <label>
          Perihal
          <input
            value={form.perihal}
            onChange={(e) => setForm({ ...form, perihal: e.target.value })}
            placeholder="Penawaran"
            required
          />
        </label>
        <label>
          Total Nominal
          <input
            type="number"
            value={form.totalNominal}
            onChange={(e) =>
              setForm({ ...form, totalNominal: Number(e.target.value) })
            }
            placeholder="0"
          />
        </label>
        <div className="full-row">
          <button type="submit" className="primary-btn">
            Simpan dokumen
          </button>
          {errors && <div className="error-box">{errors}</div>}
          {message && <p>{message}</p>}
        </div>
      </form>
    </section>
  );
}
