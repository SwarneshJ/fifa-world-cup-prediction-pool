import type { Metadata, Viewport } from 'next';
import './globals.css';
import { auth } from '@/lib/auth';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import PrivilegeMarquee from '@/components/PrivilegeMarquee';

export const metadata: Metadata = {
  title: 'World Cup 2026 Prediction Pool',
  description: 'Private prediction pool for the 2026 FIFA World Cup.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const isAdmin = session?.user ? (session.user as any).isAdmin === true : false;

  return (
    <html lang="en" className="h-full bg-slate-50 text-slate-800">
      <body className="min-h-full bg-slate-50 antialiased flex flex-col">
        <div className="max-w-xl w-full mx-auto min-h-screen bg-white flex flex-col pb-20 shadow-2xl relative border-x border-slate-200">
          {session && <Header />}
          <main className="flex-1 flex flex-col p-4 w-full">
            {children}
          </main>
          {session && <PrivilegeMarquee />}
          {session && <BottomNav isAdmin={isAdmin} />}
        </div>
      </body>
    </html>
  );
}
