import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/providers/providers';

export const metadata: Metadata = {
  title: { default: 'School Results Portal', template: '%s · School Results Portal' },
  description: 'Results and grade management for schools, teachers, parents and students.',
  manifest: '/manifest.webmanifest',
};
export const viewport: Viewport = { themeColor: '#4f46e5', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
