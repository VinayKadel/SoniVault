import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-sv-bg flex items-center justify-center p-4">
      {children}
    </div>
  );
}
