import type { FormEvent } from 'react';
import { useState } from 'react';
import { Eye, EyeOff, FileText, Shield, Zap, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/bosowa-agensi.webp';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      const { accessToken, refreshToken, user } = res.data;
      login({
        username: user.username,
        role: user.role,
        unitBisnis: user.unitBisnis,
        token: accessToken,
        refreshToken: refreshToken,
      });
      if (user.role === 'ADMIN') {
        navigate('/stats');
      } else {
        navigate('/upload');
      }
    } catch {
      setError('Login gagal. Cek username/password.');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: <FileText size={20} />,
      title: 'Manajemen Dokumen',
      description: 'Kelola surat masuk & keluar dengan mudah',
    },
    {
      icon: <Shield size={20} />,
      title: 'Tanda Tangan Digital',
      description: 'Approval dokumen dengan signature digital',
    },
    {
      icon: <Zap size={20} />,
      title: 'Otomatisasi OCR',
      description: 'Ekstraksi data dokumen secara otomatis',
    },
  ];

  return (
    <div className="login-page">
      {/* Left Side - Branding */}
      <div className="login-branding">
        <div className="branding-content">
          <div className="branding-logo">
            <img src={logo} alt="Bosowa Bandar Agensi" className="branding-logo-icon" />
            <div>
              <h1>Bosowa Bandar</h1>
              <p>Sistem Manajemen Dokumen Digital</p>
            </div>
          </div>

          <div className="branding-features">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <div className="feature-text">
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="branding-footer">
            <p>&copy; {new Date().getFullYear()} Bosowa Bandar Agensi</p>
            <p>Enterprise Document Management System</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="login-form-container">
        <div className="login-form-wrapper">
          {/* Logo for mobile */}
          <div className="login-mobile-logo">
            <img src={logo} alt="Bosowa" />
            <span>Bosowa</span>
          </div>

          {/* Header */}
          <div className="login-form-header">
            <div className="login-badge">
              <Lock size={14} />
              Secure Login
            </div>
            <h1>Selamat Datang</h1>
            <p>Silakan masuk untuk mengakses dashboard</p>
          </div>

          {/* Form */}
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-submit-btn" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Memproses...
                </>
              ) : (
                'Masuk ke Dashboard'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="login-form-footer">
            <p>Butuh bantuan? Hubungi administrator sistem</p>
          </div>
        </div>
      </div>
    </div>
  );
}
