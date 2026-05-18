'use client';

export default function StudioLayout({ children }) {
  // Studio provides its own UI; keep page chrome minimal
  return <div style={{ minHeight: '100vh' }}>{children}</div>;
}
