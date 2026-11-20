import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'CampusBite — College Event Food Order Management',
  description: 'Fast, reliable food order collection and procurement for campus events',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-slate-50 text-slate-900 selection:bg-brand-500 selection:text-white min-h-screen">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
