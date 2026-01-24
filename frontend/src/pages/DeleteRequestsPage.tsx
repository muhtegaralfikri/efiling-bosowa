import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

interface DeleteRequest {
  id: string;
  letterId: string;
  letter?: { letterNumber: string };
  reason?: string;
  status: string;
  createdAt?: string;
}

interface DeleteRequestsResponse {
  data: DeleteRequest[];
  meta: {
    page: number;
    take: number;
    itemCount: number;
    pageCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

const PAGE_SIZE = 10;

export default function DeleteRequestsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [letterNumber, setLetterNumber] = useState('');
  const [reason, setReason] = useState('');
  const [requests, setRequests] = useState<DeleteRequest[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const canModerate = user?.role === 'ADMIN';

  const load = () => {
    setIsLoading(true);
    api
      .get<DeleteRequestsResponse>('/delete-requests', {
        params: { page, limit: PAGE_SIZE },
      })
      .then((res) => {
        setRequests(res.data.data);
        setTotalPages(Math.max(res.data.meta.pageCount, 1));
      })
      .catch(() => {
        toast.error('Gagal memuat requests');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const getErrorMessage = (error: unknown) => {
    const axiosError = error as AxiosError<{ message?: string } | string[]>;
    const data = axiosError.response?.data;
    if (Array.isArray(data)) return data.join(', ');
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message?: unknown }).message;
      if (typeof message === 'string') return message;
    }
    return 'Terjadi kesalahan';
  };

  useEffect(() => {
    load();
  }, [page]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/delete-requests', {
        letterNumber: letterNumber.trim(),
        reason,
      });
      toast.success('Request penghapusan dikirim');
      setLetterNumber('');
      setReason('');
      setPage(1); // Reset to first page to see the new request
      load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || 'Gagal mengirim request');
    }
  };

  const approve = (id: string) =>
    api
      .patch(`/delete-requests/${id}`, { status: 'APPROVED' })
      .then(() => {
        toast.success('Request disetujui, surat dihapus');
        queryClient.invalidateQueries({ queryKey: ['letters'] });
        load();
      })
      .catch((err: unknown) => {
        toast.error(getErrorMessage(err) || 'Gagal menyetujui');
      });
  const reject = (id: string) =>
    api
      .patch(`/delete-requests/${id}`, { status: 'REJECTED' })
      .then(() => {
        toast.success('Request ditolak');
        load();
      })
      .catch((err: unknown) => {
        toast.error(getErrorMessage(err) || 'Gagal menolak');
      });

  const goToPrev = () => setPage((prev) => Math.max(prev - 1, 1));
  const goToNext = () =>
    setPage((prev) => Math.min(prev + 1, totalPages));

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Permintaan Hapus</p>
          <h1>Ajukan atau setujui penolakan</h1>
        </div>
      </div>

      {/* Form Area */}
      <form className="form-grid" onSubmit={submit}>
        <label>
          Nomor Dokumen
          <input
            value={letterNumber}
            onChange={(e) => setLetterNumber(e.target.value)}
            placeholder="Contoh: 007/SS/MIW2018"
            required
          />
        </label>
        <label>
          Alasan
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Opsional"
          />
        </label>
        <div className="full-row" style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button type="submit" className="primary-btn">
            Kirim permintaan
          </button>
        </div>
      </form>

      {/* Visual Separator & Table Area */}
      <div style={{ marginTop: '3rem' }}>
        <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
          Riwayat Pengajuan
        </h3>
        
        <div className="table-container">
          <div className="table cols-4">
            <div
              className="table-row table-head"
              style={{ gridTemplateColumns: '0.8fr 2.5fr 1.5fr 1.2fr' }}
            >
              <span>ID</span>
              <span>Nomor Dokumen</span>
              <span>Alasan</span>
              <span>{canModerate ? 'Aksi' : 'Status'}</span>
            </div>
            {requests.length === 0 && !isLoading && (
              <div className="table-row" style={{ gridTemplateColumns: '1fr' }}>
                <span style={{ textAlign: 'center', color: '#888' }}>Belum ada request</span>
              </div>
            )}
            {requests.map((req) => (
              <div
                key={req.id}
                className="table-row"
                style={{ gridTemplateColumns: '0.8fr 2.5fr 1.5fr 1.2fr' }}
              >
                <span
                  style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                  title={req.id}
                >
                  {req.id.slice(0, 8)}...
                </span>
                <span>{req.letter?.letterNumber || req.letterId}</span>
                <span className="cell-muted">{req.reason || '-'}</span>
                
                {/* Merged Status/Action Column */}
                {canModerate && req.status === 'PENDING' ? (
                  <span className="actions table-actions">
                    <button
                      type="button"
                      className="icon-btn success"
                      onClick={() => approve(req.id)}
                      title="Setujui"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => reject(req.id)}
                      title="Tolak"
                    >
                      <X size={18} />
                    </button>
                  </span>
                ) : (
                  <span>
                    <span className={`pill pill-${req.status.toLowerCase()}`}>
                       {req.status === 'PENDING' ? 'Menunggu' : 
                        req.status === 'APPROVED' ? 'Disetujui' : 
                        req.status === 'REJECTED' ? 'Ditolak' : req.status}
                    </span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pagination Controls */}
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
            {page} / {totalPages} {isLoading && '(memuat...)'}
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
      </div>
    </section>
  );
}
