import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Send, Search, Check, FileSignature, ArrowRight, ArrowLeft } from 'lucide-react';
import { createSignatureRequest, getManajemenUsers, type SignatureAssignment } from '../../api/signatures';
import type { User } from '../../api/types';

interface SignatureRequestModalProps {
  letterId: string;
  letterNumber: string;
  onClose: () => void;
}

export default function SignatureRequestModal({
  letterId,
  letterNumber,
  onClose,
}: SignatureRequestModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<SignatureAssignment[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getManajemenUsers()
      .then(setUsers)
      .catch(() => toast.error('Gagal memuat daftar user'))
      .finally(() => setLoading(false));
  }, []);

  const createMutation = useMutation({
    mutationFn: () => createSignatureRequest(letterId, assignments, notes),
    onSuccess: () => {
      toast.success('Permintaan tanda tangan berhasil dikirim');
      queryClient.invalidateQueries({ queryKey: ['signature-requests', letterId] });
      onClose();
    },
    onError: () => toast.error('Gagal mengirim permintaan'),
  });

  const toggleAssignment = (userId: string) => {
    if (assignments.some((a) => a.assignedTo === userId)) {
      setAssignments(assignments.filter((a) => a.assignedTo !== userId));
    } else {
      setAssignments([...assignments, { assignedTo: userId }]);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  const handleNext = () => {
    if (assignments.length === 0) {
      toast.error('Pilih minimal satu user');
      return;
    }
    setStep(2);
  };

  const getAvatarGradient = (name: string) => {
    const gradients = [
      'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
      'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    ];
    const index = name.length % gradients.length;
    return gradients[index];
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Step 1: Select Users */}
        {step === 1 && (
          <>
            <div className="modal-header">
              <div className="header-content">
                <div className="header-icon">
                  <FileSignature size={24} />
                </div>
                <div>
                  <h2>Pilih Penandatangan</h2>
                  <p className="subtitle">Cari dan pilih user yang berwenang</p>
                </div>
              </div>
              <button className="close-btn" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body step-1-body">
              <div className="search-box">
                <Search size={18} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Cari nama user..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="user-section">
                <div className="section-header">
                  <label>Daftar User</label>
                  <span className="count-badge">{filteredUsers.length}</span>
                </div>
                
                {loading ? (
                  <div className="loading-state">Memuat user...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="empty-state">Tidak ada user ditemukan</div>
                ) : (
                  <div className="user-list">
                    {filteredUsers.map((user) => {
                      const isSelected = assignments.some((a) => a.assignedTo === user.id);
                      return (
                        <div
                          key={user.id}
                          className={`user-list-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleAssignment(user.id)}
                        >
                          <div className="user-item-content">
                            <div 
                              className="user-avatar-small"
                              style={{ background: getAvatarGradient(user.username) }}
                            >
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <span className="user-name-list">{user.username}</span>
                          </div>
                          
                          <div className="checkbox-wrapper">
                             {isSelected && <Check size={14} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <div className="selected-summary">
                {assignments.length > 0 ? (
                  <span><strong>{assignments.length}</strong> user dipilih</span>
                ) : (
                  <span>Belum ada yang dipilih</span>
                )}
              </div>
              <div className="footer-actions">
                <button type="button" className="btn-cancel" onClick={onClose}>
                  Batal
                </button>
                <button
                  type="button"
                  className="btn-submit"
                  onClick={handleNext}
                  disabled={assignments.length === 0}
                >
                  Lanjut <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Confirm & Notes */}
        {step === 2 && (
          <>
            <div className="modal-header">
              <div className="header-content">
                <div className="header-icon icon-step-2">
                  <Check size={24} />
                </div>
                <div>
                  <h2>Konfirmasi & Catatan</h2>
                  <p className="subtitle">Tambahkan detail sebelum mengirim</p>
                </div>
              </div>
              <button className="close-btn" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body step-2-body">
              <div className="doc-preview">
                <span className="doc-label">Dokumen:</span>
                <span className="doc-value">{letterNumber}</span>
              </div>

              <div className="selected-users-preview">
                <label>Penerima:</label>
                <div className="selected-users-tags">
                  {users
                    .filter(u => assignments.some(a => a.assignedTo === u.id))
                    .map(user => (
                      <div key={user.id} className="user-tag">
                        <div 
                          className="tag-avatar"
                          style={{ background: getAvatarGradient(user.username) }}
                        >
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <span>{user.username}</span>
                      </div>
                    ))
                  }
                </div>
              </div>

              <div className="form-group notes-group-expanded">
                <label>Catatan (Opsional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Tolong segera ditandatangani hari ini..."
                  autoFocus
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-back" onClick={() => setStep(1)}>
                <ArrowLeft size={16} /> Kembali
              </button>
              <button
                type="button"
                className="btn-submit"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
              >
                <Send size={16} />
                {createMutation.isPending ? 'Mengirim...' : 'Kirim Permintaan'}
              </button>
            </div>
          </>
        )}

        <style>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1100;
            padding: 1rem;
            animation: fadeIn 0.2s ease-out;
          }

          .modal {
            background: var(--bg-secondary);
            border-radius: 20px;
            width: 100%;
            max-width: 480px;
            height: 600px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            animation: slideUp 0.3s ease-out;
            overflow: hidden;
            border: 1px solid var(--border-color);
          }

          .modal-header {
            padding: 1.25rem 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 1px solid var(--border-light);
            background: var(--bg-primary);
            flex-shrink: 0;
          }

          .header-content {
            display: flex;
            gap: 1rem;
            align-items: center;
          }

          .header-icon {
            width: 42px;
            height: 42px;
            border-radius: 12px;
            background: rgba(15, 92, 191, 0.1);
            color: var(--accent-primary);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .header-icon.icon-step-2 {
            background: rgba(16, 185, 129, 0.1);
            color: #10b981;
          }

          .modal-header h2 {
            margin: 0;
            font-size: 1.125rem;
            color: var(--text-primary);
            font-weight: 700;
          }

          .subtitle {
            margin: 0.15rem 0 0;
            color: var(--text-secondary);
            font-size: 0.825rem;
          }

          .close-btn {
            background: transparent;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 8px;
            transition: all 0.2s;
          }

          .close-btn:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
          }

          /* General Modal Body */
          .modal-body {
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
            flex: 1;
            overflow: hidden;
          }

          /* Step 1 Specific Styles */
          .step-1-body {
             /* Ensures user list takes up space */
          }

          .search-box {
            position: relative;
            flex-shrink: 0;
          }

          .search-icon {
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
            pointer-events: none;
          }

          .search-box input {
            width: 100%;
            padding: 0.75rem 1rem 0.75rem 2.75rem;
            border-radius: 12px;
            background: var(--bg-input);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            font-size: 0.95rem;
            transition: all 0.2s;
          }

          .search-box input:focus {
            border-color: var(--accent-primary);
            box-shadow: 0 0 0 3px var(--accent-light);
            outline: none;
          }

          .user-section {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            flex: 1;
            min-height: 0;
            overflow: hidden;
          }

          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
          }

          .section-header label {
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .count-badge {
            background: var(--bg-hover);
            color: var(--text-primary);
            font-size: 0.725rem;
            font-weight: 700;
            padding: 0.125rem 0.5rem;
            border-radius: 99px;
          }

          .user-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            overflow-y: auto;
            padding-right: 0.25rem;
            flex: 1;
          }

          /* Custom Scrollbar */
          .user-list::-webkit-scrollbar {
            width: 4px;
          }
          .user-list::-webkit-scrollbar-thumb {
            background: var(--border-color);
            border-radius: 4px;
          }
          .user-list::-webkit-scrollbar-thumb:hover {
             background: var(--text-muted);
          }

          .user-list-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.15s ease;
            flex-shrink: 0;
          }

          .user-list-item:hover {
            border-color: var(--accent-primary);
            background: var(--bg-hover);
          }

          .user-list-item.selected {
            background: var(--accent-light);
            border-color: var(--accent-primary);
          }

          .user-item-content {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .user-avatar-small {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 0.9rem;
            flex-shrink: 0;
          }

          .user-name-list {
            font-size: 0.95rem;
            font-weight: 500;
            color: var(--text-primary);
          }

          .checkbox-wrapper {
            width: 22px;
            height: 22px;
            border-radius: 7px;
            border: 2px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            transition: all 0.2s;
          }

          .user-list-item.selected .checkbox-wrapper {
            background: var(--accent-primary);
            border-color: var(--accent-primary);
          }

          .loading-state, .empty-state {
            padding: 2rem;
            text-align: center;
            color: var(--text-secondary);
            font-size: 0.9rem;
            background: var(--bg-primary);
            border-radius: 12px;
            border: 1px dashed var(--border-color);
          }

          /* Step 2 Specific Styles */
          .step-2-body {
            gap: 1.5rem;
          }

          .doc-preview {
            background: var(--bg-hover);
            padding: 0.75rem 1rem;
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            border: 1px dashed var(--border-color);
            flex-shrink: 0;
          }

          .doc-label {
            font-size: 0.75rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .doc-value {
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.9rem;
            word-break: break-all;
          }

          .selected-users-preview label {
             font-size: 0.8rem;
             font-weight: 600;
             color: var(--text-secondary);
             margin-bottom: 0.5rem;
             display: block;
          }

          .selected-users-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            max-height: 100px;
            overflow-y: auto;
          }

          .user-tag {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            padding: 0.25rem 0.75rem 0.25rem 0.25rem;
            border-radius: 99px;
            font-size: 0.85rem;
            color: var(--text-primary);
          }

          .tag-avatar {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.65rem;
            font-weight: 700;
          }

          .notes-group-expanded {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
          }

          .notes-group-expanded label {
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-secondary);
            margin-bottom: 0.5rem;
          }

          .notes-group-expanded textarea {
            flex: 1;
            width: 100%;
            padding: 1rem;
            border-radius: 12px;
            border: 1px solid var(--border-color);
            background: var(--bg-input);
            font-size: 0.95rem;
            resize: none;
          }

          .notes-group-expanded textarea:focus {
             border-color: var(--accent-primary);
             outline: none;
          }

          /* Footer */
          .modal-footer {
            padding: 1.25rem 1.5rem;
            border-top: 1px solid var(--border-color);
            background: var(--bg-primary);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
          }

          .selected-summary {
            font-size: 0.875rem;
            color: var(--text-secondary);
          }

          .selected-summary strong {
            color: var(--accent-primary);
          }

          .footer-actions {
            display: flex;
            gap: 0.75rem;
          }

          .btn-cancel, .btn-back {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.625rem 1rem;
            border-radius: 10px;
            border: 1px solid transparent;
            background: transparent;
            color: var(--text-secondary);
            font-weight: 600;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-cancel:hover, .btn-back:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
          }

          .btn-submit {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.625rem 1.25rem;
            border-radius: 10px;
            border: none;
            background: var(--accent-primary);
            color: white;
            font-weight: 600;
            font-size: 0.9rem;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(var(--accent-rgb), 0.2);
            transition: all 0.2s;
          }

          .btn-submit:hover:not(:disabled) {
            background: var(--accent-secondary);
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(var(--accent-rgb), 0.3);
          }

          .btn-submit:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }

          /* Mobile Responsive */
          @media (max-width: 640px) {
            .modal-overlay {
              align-items: flex-end;
              padding: 0;
            }

            .modal {
              max-height: 90vh;
              height: 90vh; /* Fixed height for stability */
              border-radius: 24px 24px 0 0;
              margin: 0;
            }

            .modal-header {
              padding: 1.25rem;
            }

            .header-icon {
              width: 36px;
              height: 36px;
            }

            .modal-body {
              padding: 1rem 1.25rem;
            }

            .user-list {
               /* Step 1: Maximize space for users */
               padding-bottom: 0.5rem;
            }

            .notes-group-expanded textarea {
               /* Step 2: Maximize space for notes */
            }

            .modal-footer {
              padding: 1rem 1.25rem;
              padding-bottom: max(1rem, env(safe-area-inset-bottom));
              flex-direction: column;
              gap: 1rem;
              align-items: stretch;
            }

            .selected-summary {
              text-align: center;
              padding-bottom: 0.75rem;
              border-bottom: 1px solid var(--border-light);
            }

            .footer-actions {
              display: grid;
              grid-template-columns: 1fr 1.5fr;
              gap: 0.75rem;
              width: 100%;
            }

            .btn-submit, .btn-cancel, .btn-back {
              justify-content: center;
              width: 100%;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
