import { useState, useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FileText,
  History,
  LineChart,
  LogOut,
  Menu,
  Moon,
  Sun,
  Trash2,
  Upload,
  Users,
  X,
  PenTool,
  FileSignature,
} from 'lucide-react';
import logo from '../assets/bosowa-agensi.webp';
import { useAuth } from '../context/AuthContext';
import OfflineIndicator from './OfflineIndicator';
import NotificationBell from './notification/NotificationBell';
import NotificationListener from './notification/NotificationListener';

const THEME_KEY = 'bosowa-ocr-theme';

const navItems = [
  { path: '/upload', label: 'Unggah Dokumen', mobileLabel: 'Unggah', icon: Upload },
  { path: '/letters', label: 'Daftar Dokumen', mobileLabel: 'Dokumen', icon: FileText },
  { path: '/delete-requests', label: 'Permintaan Hapus', mobileLabel: 'Hapus', icon: Trash2 },
  { path: '/pending-signatures', label: 'Menunggu TTD', mobileLabel: 'Inbox TTD', icon: FileSignature, manajemenOnly: true },
  { path: '/signature-settings', label: 'Pengaturan TTD', mobileLabel: 'TTD Saya', icon: PenTool, manajemenOnly: true },
  { path: '/stats', label: 'Statistik', mobileLabel: 'Statistik', icon: LineChart, adminOnly: true },
  { path: '/users', label: 'Kelola User', mobileLabel: 'User', icon: Users, adminOnly: true },
  { path: '/audit-log', label: 'Audit Log', mobileLabel: 'Log', icon: History, adminOnly: true },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const visibleNavItems = navItems.filter((item) => {
    if (item.adminOnly && user?.role !== 'ADMIN') return false;
    if ('manajemenOnly' in item && item.manajemenOnly && user?.role !== 'MANAJEMEN') return false;
    return true;
  });

  const mobileMainItems = visibleNavItems.slice(0, 3);
  const mobileMoreItems = visibleNavItems.slice(3);

  const handleMobileMenuClose = () => setMobileMenuOpen(false);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src={logo} alt="Bosowa Bandar Agensi" className="sidebar-logo" />
          <div className="sidebar-header-actions">

            <NotificationBell />
          </div>
        </div>

        <nav className="sidebar-nav">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user">
              <div className="sidebar-user-header">
                <div className="sidebar-user-info">
                  <span className="sidebar-username">{user.username}</span>
                  <span className="sidebar-role">{user.role}</span>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="sidebar-theme-btn"
                  title={theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
                >
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>
              </div>
              
              <button
                type="button"
                onClick={logout}
                className="sidebar-logout"
                title="Keluar"
              >
                <LogOut size={18} />
                <span>Keluar</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="main-content">
        {/* Mobile Header with Notification */}
        <div className="mobile-header">
          <img src={logo} alt="Bosowa" className="mobile-logo" />
          <NotificationBell />
        </div>
        <div className="main-content-inner">
          {children}
        </div>
        <footer className="app-footer">
          <p>&copy; {new Date().getFullYear()} Bosowa Bandar Agensi. All rights reserved.</p>
        </footer>
      </main>

      {/* Mobile Bottom Bar */}
      <nav className="mobile-bottom-bar">
        {mobileMainItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`mobile-nav-item ${isActive(item.path) ? 'active' : ''}`}
            >
              <Icon className="mobile-nav-icon" aria-hidden="true" />
              <span className="mobile-nav-label">{item.mobileLabel}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className="mobile-nav-item"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="mobile-nav-icon" aria-hidden="true" />
          <span className="mobile-nav-label">Lainnya</span>
        </button>
      </nav>

      {/* Mobile More Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={handleMobileMenuClose}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <span>Menu Lainnya</span>
              <button type="button" onClick={handleMobileMenuClose}>
                <X size={20} />
              </button>
            </div>
            <div className="mobile-menu-items">
              {mobileMoreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`mobile-menu-link ${isActive(item.path) ? 'active' : ''}`}
                    onClick={handleMobileMenuClose}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                className="mobile-menu-link"
                onClick={() => {
                  toggleTheme();
                }}
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                <span>{theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}</span>
              </button>
              <button
                type="button"
                className="mobile-menu-link logout"
                onClick={() => {
                  handleMobileMenuClose();
                  logout();
                }}
              >
                <LogOut size={20} />
                <span>Keluar</span>
              </button>
            </div>
            {user && (
              <div className="mobile-menu-user">
                <span>{user.username}</span>
                <span className="mobile-menu-role">{user.role}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <OfflineIndicator />
      <NotificationListener />
    </div>
  );
}
