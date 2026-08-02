import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AuthProvider } from '@/hooks/useAuth';
import { ToastProvider } from '@/components/shared/Toast';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants';

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen flex-col bg-gray-50">
        <AuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <ToastProvider />
        </AuthProvider>
      </body>
    </html>
  );
}
