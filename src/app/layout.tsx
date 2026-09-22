import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TOP SECRET ARCHIVE — Central Records Facility',
  description:
    'An interactive 3D classified document archive: open the vault, pull a locker, read the dossiers.',
};

export const viewport: Viewport = {
  themeColor: '#07080a',
  width: 'device-width',
  initialScale: 1,
  // The scene is a fixed-camera experience; pinch-zooming the page would only
  // fight the 3D camera.
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
