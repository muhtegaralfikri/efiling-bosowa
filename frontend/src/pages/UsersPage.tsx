import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Pencil, Plus, Trash2, X } from 'lucide-react';
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
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setForm({ username: '', password: '', role: '', unitBisnis: '' });
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
                  
                  {/* Reverted to Native Select for Unit Bisnis */}
                  {form.role === 'USER' && (
                    <label>
                      Unit Bisnis
                      <select
                        value={form.unitBisnis}
                        onChange={(e) => setForm({ ...form, unitBisnis: e.target.value })}
                        required
                      >
                        <option value="">Pilih Unit Bisnis</option>
                        {UNIT_BISNIS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
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
      `}</style>
    </section>
  );
}
