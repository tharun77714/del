
import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-background to-secondary/30">
      <div className="w-full max-w-md">
        {children}
      </div>
    </main>
  );
}
