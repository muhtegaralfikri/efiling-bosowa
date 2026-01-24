import { lazy, Suspense, type JSX } from 'react';
import { Navigate, Outlet, Route, BrowserRouter, Routes } from 'react-router-dom';
import './App.css';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/websocket.context';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const LettersFormPage = lazy(() => import('./pages/LettersFormPage'));
const LettersListPage = lazy(() => import('./pages/LettersListPage'));
const LetterDetailPage = lazy(() => import('./pages/LetterDetailPage'));
const DeleteRequestsPage = lazy(() => import('./pages/DeleteRequestsPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const SignatureSettingsPage = lazy(() => import('./pages/SignatureSettingsPage'));
const PendingSignaturesPage = lazy(() => import('./pages/PendingSignaturesPage'));

function PageLoader() {
  return (
    <div className="page-loader">
      <div className="loader-spinner" />
      <p>Memuat...</p>
    </div>
  );
}

function ProtectedRoute({
  children,
  roles,
}: {
  children: JSX.Element;
  roles?: string[];
}) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

function AppShell() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AppShell />}>
              <Route path="/" element={<Navigate to="/upload" replace />} />
              <Route
                path="/upload"
                element={
                  <ProtectedRoute>
                    <UploadPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/letters/new"
                element={
                  <ProtectedRoute>
                    <LettersFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/letters"
                element={
                  <ProtectedRoute>
                    <LettersListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/letters/:id"
                element={
                  <ProtectedRoute>
                    <LetterDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/delete-requests"
                element={
                  <ProtectedRoute>
                    <DeleteRequestsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stats"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <StatsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit-log"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <AuditLogPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/signature-settings"
                element={
                  <ProtectedRoute roles={['MANAJEMEN']}>
                    <SignatureSettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pending-signatures"
                element={
                  <ProtectedRoute roles={['MANAJEMEN']}>
                    <PendingSignaturesPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      </WebSocketProvider>
    </AuthProvider>
  );
}
