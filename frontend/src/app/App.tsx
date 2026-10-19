import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes';
import { ThemeProvider } from './contexts/ThemeProvider';
import { AuthProvider } from './auth/AuthContext';
import { Suspense } from 'react';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Suspense fallback={
          <main className="min-h-screen grid place-items-center" role="status" aria-live="polite">
            <span className="text-sm text-slate-600 dark:text-slate-300">Loading…</span>
          </main>
        }>
          <RouterProvider router={router} />
        </Suspense>
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </ThemeProvider>
  );
}
