import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Pencil, Plus, Trash2, X, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import api from '../api/client';
import type { User } from '../api/types';

const UNIT_BISNIS_OPTIONS = [
  { value: 'BOSOWA_TAXI', label: 'Bosowa Taxi' },
  { value: 'OTORENTAL_NUSANTARA', label: 'Otorental Nusantara' },
  { value: 'OTO_GARAGE_INDONESIA', label: 'Oto Garage Indonesia' },
  { value: 'MALLOMO', label: 'Mallomo' },
  { value: 'LAGALIGO_LOGISTIK', label: 'Lagaligo Logistik' },
  { value: 'PORT_MANAGEMENT', label: 'Port Management' },
];

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({ username: '', password: '', role: '', unitBisnis: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showUnitBisnisDropdown, setShowUnitBisnisDropdown] = useState(false);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { username: string; password: string; role: string; unitBisnis?: string }) =>
      api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User berhasil dibuat');
      closeModal();
    },
    onError: () => toast.error('Gagal membuat user'),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, username, password }: { id: string; username?: string; password?: string }) =>
      api.patch(`/users/${id}`, { username, password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User berhasil diperbarui');
      closeModal();
    },
    onError: () => toast.error('Gagal memperbarui user'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User berhasil dihapus');
    },
    onError: () => toast.error('Gagal menghapus user'),
  });

  const openCreateModal = () => {
    setEditingUser(null);
    setForm({ username: '', password: '', role: '', unitBisnis: '' });
    setShowPassword(false);
    setShowUnitBisnisDropdown(false);
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setForm({ 
      username: user.username, 
      password: '', 
      role: user.role,
      unitBisnis: user.unitBisnis || ''
    });
    setShowPassword(false);
    setShowUnitBisnisDropdown(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setForm({ username: '', password: '', role: '', unitBisnis: '' });
    setShowUnitBisnisDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      // At least username or password should be provided
      if (!form.username && !form.password) {
        toast.error('Masukkan username atau password baru');
        return;
      }
      updateUserMutation.mutate({ 
        id: editingUser.id, 
        username: form.username || undefined,
        password: form.password || undefined 
      });
    } else {
      const payload =
        form.role === 'USER'
          ? form
          : { username: form.username, password: form.password, role: form.role };
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (user: User) => {
    if (confirm(`Hapus user "${user.username}"?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const getUnitBisnisLabel = (value: string) => {
    const item = UNIT_BISNIS_OPTIONS.find(opt => opt.value === value);
    return item ? item.label : 'Pilih Unit Bisnis';
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Manajemen</p>
          <h1>Kelola User</h1>
        </div>
        <button type="button" className="primary-btn" onClick={openCreateModal}>
          <Plus size={18} />
          Tambah User
        </button>
      </div>

      <div className="table-container">
        <div className="table cols-4">
          <div className="table-row table-head">
            <span>Username</span>
            <span>Role</span>
            <span>Tanggal Dibuat</span>
            <span>Aksi</span>
          </div>
          {isLoading && (
            <div className="table-row table-message">
              <span>Memuat...</span>
            </div>
          )}
          {!isLoading && users.length === 0 && (
            <div className="table-row table-message">
              <span>Tidak ada user</span>
            </div>
          )}
          {users.map((user) => (
            <div key={user.id} className="table-row table-body-row">
              <div className="table-cell">
                <span className="cell-label">Username</span>
                <span className="cell-value">{user.username}</span>
              </div>
              <div className="table-cell">
                <span className="cell-label">Role</span>
                <span className={`role-badge ${user.role.toLowerCase()}`}>{user.role}</span>
              </div>
              <div className="table-cell">
                <span className="cell-label">Tanggal Dibuat</span>
                <span className="cell-value">
                  {new Date(user.createdAt).toLocaleDateString('id-ID')}
                </span>
              </div>
              <div className="table-cell">
                <span className="cell-label">Aksi</span>
                <div className="action-buttons">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => openEditModal(user)}
                    title="Edit User"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => handleDelete(user)}
                    title="Hapus"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal} style={{ zIndex: 1100 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Edit User' : 'Tambah User'}</h2>
              <button type="button" className="icon-btn" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <label>
                Username
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required={!editingUser}
                  minLength={3}
                  placeholder={editingUser ? 'Kosongkan jika tidak diubah' : 'Masukkan username...'}
                />
              </label>
              <label>
                {editingUser ? 'Password Baru' : 'Password'}
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required={!editingUser}
                    minLength={4}
                    placeholder={editingUser ? 'Kosongkan jika tidak diubah' : 'Masukkan password...'}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
              {!editingUser && (
                <>
                  <label>
                    Role
                    <select
                      value={form.role}
                      onChange={(e) => {
                        const role = e.target.value;
                        setForm({
                          ...form,
                          role,
                          unitBisnis: role === 'USER' ? form.unitBisnis : '',
                        });
                      }}
                    >
                      <option value="">Pilih Role</option>
                      <option value="USER">USER</option>
                      <option value="MANAJEMEN">MANAJEMEN</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </label>
                  
                  {/* Custom Dropdown for Unit Bisnis */}
                  {form.role === 'USER' && (
                    <label style={{ position: 'relative' }}>
                      Unit Bisnis
                      
                      <div 
                        className="custom-select-trigger" 
                        onClick={() => setShowUnitBisnisDropdown(!showUnitBisnisDropdown)}
                      >
                        <span className={!form.unitBisnis ? 'placeholder' : ''}>
                          {form.unitBisnis ? getUnitBisnisLabel(form.unitBisnis) : 'Pilih Unit Bisnis'}
                        </span>
                        <ChevronDown size={18} className={`chevron ${showUnitBisnisDropdown ? 'rotate' : ''}`} />
                      </div>

                      {showUnitBisnisDropdown && (
                        <>
                          <div className="custom-dropdown-overlay" onClick={() => setShowUnitBisnisDropdown(false)} />
                          <div className="custom-select-options">
                            {UNIT_BISNIS_OPTIONS.map((option) => (
                              <div
                                key={option.value}
                                className={`custom-option ${form.unitBisnis === option.value ? 'selected' : ''}`}
                                onClick={() => {
                                  setForm({ ...form, unitBisnis: option.value });
                                  setShowUnitBisnisDropdown(false);
                                }}
                              >
                                {option.label}
                                {form.unitBisnis === option.value && (
                                  <span className="check-indicator">✓</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </label>
                  )}
                </>
              )}
              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={closeModal}>
                  Batal
                </button>
                <button type="submit" className="primary-btn">
                  {editingUser ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .password-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .password-input-wrapper input {
          width: 100%;
          padding-right: 45px;
        }

        .password-toggle-btn {
          position: absolute;
          right: 10px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-secondary);
          padding: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .password-toggle-btn:hover {
          color: var(--accent-primary);
        }

        /* Custom Dropdown Styles */
        .custom-select-trigger {
          padding: 0.75rem 1rem;
          border: 1px solid var(--border-color);
          border-radius: 10px;
          font-size: 1rem;
          background: var(--bg-input);
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.2s;
        }

        .custom-select-trigger .placeholder {
          color: var(--text-secondary);
          opacity: 0.7;
        }

        .custom-select-trigger:hover {
          border-color: #1d74d8;
        }

        .custom-select-trigger .chevron {
          color: var(--text-secondary);
          transition: transform 0.2s;
        }

        .custom-select-trigger .chevron.rotate {
          transform: rotate(180deg);
        }

        .custom-dropdown-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 90;
          background: transparent;
        }

        .custom-select-options {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 0.5rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
          z-index: 100;
          max-height: 220px; /* Fixed Height for Scroll */
          overflow-y: auto;
          animation: fadeIn 0.1s ease-out;
        }

        .custom-option {
          padding: 0.75rem 1rem;
          cursor: pointer;
          transition: background 0.1s;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.95rem;
        }

        .custom-option:hover {
          background: var(--bg-hover);
          color: var(--accent-primary);
        }

        .custom-option.selected {
          background: var(--accent-light);
          color: var(--accent-primary);
          font-weight: 600;
        }

        .check-indicator {
          font-weight: bold;
          font-size: 0.9rem;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
