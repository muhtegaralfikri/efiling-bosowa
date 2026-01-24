import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../api/client';
import { wsService } from '../services/websocket.service';

interface EditLog {
  id: string;
  letterId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  updatedBy: string;
  createdAt: string;
  letter?: {
    letterNumber: string;
  };
}

interface PaginatedResponse {
  data: EditLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pageCount: number;
  };
}

const PAGE_SIZE = 20;

export default function AuditLogPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery<PaginatedResponse>({
    queryKey: ['audit-logs', page],
    queryFn: async () => {
      try {
        const res = await api.get('/edit-logs', {
          params: { page, limit: PAGE_SIZE },
        });
        return res.data;
      } catch {
        toast.error('Gagal memuat audit log');
        throw new Error('Failed to load');
      }
    },
  });

  const queryClient = useQueryClient();

  // Listen for WebSocket document updates
  useEffect(() => {
    const handleDocumentUpdate = () => {
      // Refresh audit logs list when a document is created or updated
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    };

    wsService.on('document:update', handleDocumentUpdate);

    return () => {
      wsService.off('document:update', handleDocumentUpdate);
    };
  }, [queryClient]);

  const logs = data?.data ?? [];
  const totalPages = data?.meta.pageCount ?? 1;

  const formatValue = (value: string | null) => {
    if (value === null || value === '') return '-';
    if (value.length > 50) return value.substring(0, 50) + '...';
    return value;
  };

  const formatDate = (dateStr: string) => {
    // Parse the date string directly - let JavaScript handle UTC properly
    const date = new Date(dateStr);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      letterNumber: 'Nomor Dokumen',
      tanggalSurat: 'Tanggal Dokumen',
      namaPengirim: 'Nama Pengirim',
      alamatPengirim: 'Alamat Pengirim',
      teleponPengirim: 'Telepon Pengirim',
      perihal: 'Perihal',
      totalNominal: 'Total Nominal',
      jenisSurat: 'Tipe Dokumen',
      jenisDokumen: 'Jenis Dokumen',
    };
    return labels[field] || field;
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">History</p>
          <h1>Audit Log</h1>
          <p>Riwayat perubahan data dokumen</p>
        </div>
      </div>

      <div className="table-container">
        <div className="table audit-table">
          <div className="table-row table-head">
            <span>Waktu</span>
            <span>User</span>
            <span>Dokumen</span>
            <span>Field</span>
            <span>Sebelum</span>
            <span>Sesudah</span>
          </div>
          {isLoading && (
            <div className="table-row table-message">
              <span>Memuat...</span>
            </div>
          )}
          {!isLoading && logs.length === 0 && (
            <div className="table-row table-message">
              <span>Tidak ada log</span>
            </div>
          )}
          {logs.map((log) => (
            <div key={log.id} className="table-row table-body-row">
              <div className="table-cell">
                <span className="cell-label">Waktu</span>
                <span className="cell-value">{formatDate(log.createdAt)}</span>
              </div>
              <div className="table-cell">
                <span className="cell-label">User</span>
                <span className="cell-value user-badge">{log.updatedBy}</span>
              </div>
              <div className="table-cell">
                <span className="cell-label">Dokumen</span>
                <Link to={`/letters/${log.letterId}`} className="cell-value link">
                  {log.letter?.letterNumber || log.letterId.substring(0, 8)}
                </Link>
              </div>
              <div className="table-cell">
                <span className="cell-label">Field</span>
                <span className="cell-value field-name">{getFieldLabel(log.field)}</span>
              </div>
              <div className="table-cell">
                <span className="cell-label">Sebelum</span>
                <span className="cell-value old-value">{formatValue(log.oldValue)}</span>
              </div>
              <div className="table-cell">
                <span className="cell-label">Sesudah</span>
                <span className="cell-value new-value">{formatValue(log.newValue)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="actions pagination-actions" style={{ marginTop: '1rem', gap: '0.75rem' }}>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
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
          onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
          disabled={page >= totalPages}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}
