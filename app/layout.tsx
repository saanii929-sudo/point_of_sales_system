import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers/Providers';
import { GlobalBranding } from '@/components/GlobalBranding';

export const metadata: Metadata = {
  title: {
    default: 'SmartVendr — Intelligent Point of Sale',
    template: '%s | SmartVendr',
  },
  description: 'SmartVendr is a professional multi-tenant SaaS POS platform with real-time analytics, offline capability, and beautiful design — built for modern businesses.',
  keywords: ['POS', 'point of sale', 'retail', 'inventory', 'sales analytics', 'SaaS'],
  authors: [{ name: 'SmartVendr Team' }],
  creator: 'SmartVendr',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/favicon.ico', sizes: 'any' }],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'SmartVendr — Intelligent Point of Sale',
    description: 'Professional multi-tenant SaaS POS platform with real-time analytics and offline capability.',
    siteName: 'SmartVendr',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)',  color: '#0c0e14' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect for Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Theme init script to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem('theme-storage');
                var theme = stored ? JSON.parse(stored)?.state?.theme : null;
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch(e){}
            `,
          }}
        />
      </head>
      <body>
        <Providers>
          <GlobalBranding />
          {children}
        </Providers>
      </body>
    </html>
  );
}
