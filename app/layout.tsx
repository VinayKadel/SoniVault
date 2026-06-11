import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthSessionProvider } from '@/components/AuthSessionProvider';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SONIVAULT — Your Secure Document Vault',
  description:
    'Personal document management system with cloud storage, offline access, and secure sharing.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SONIVAULT',
  },
  icons: {
    icon: '/icons/logo.png',
    apple: '/icons/logo.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <AuthSessionProvider>
            {children}
            <Toaster 
              position="bottom-right" 
              toastOptions={{
                style: {
                  background: 'var(--sv-surface)',
                  color: 'var(--sv-text-primary)',
                  border: '1px solid var(--sv-border)',
                },
                success: {
                  iconTheme: { primary: 'var(--sv-success)', secondary: '#fff' }
                },
                error: {
                  iconTheme: { primary: 'var(--sv-danger)', secondary: '#fff' }
                }
              }}
            />
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
