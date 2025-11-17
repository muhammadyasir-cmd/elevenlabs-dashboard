import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ElevenLabs Agent Performance Dashboard',
  description: 'Dashboard for tracking ElevenLabs AI agent performance metrics',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-900 text-white antialiased">
        {children}
      </body>
    </html>
  );
}

