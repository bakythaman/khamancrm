import type { Metadata } from 'next';
import { AppProvider } from '@/components/providers/app-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Khaman CRM',
  description: 'Convenient CRM for B2B and B2C sales.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
