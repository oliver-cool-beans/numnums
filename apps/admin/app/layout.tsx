import './globals.css';

import { Analytics } from '@vercel/analytics/react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { QueryNotificationToaster } from '@/components/layout/query-notification-toaster';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans'
});

export const metadata: Metadata = {
  title: 'NumNums Admin',
  description:
    'Admin panel for importing catalogue data, reviewing ingredient matches, and operating the NumNums platform.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html className={inter.variable} lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen w-full flex-col font-sans">
        {children}
        <QueryNotificationToaster />
        <Toaster />
      </body>
      <Analytics />
    </html>
  );
}
