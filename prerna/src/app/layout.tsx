import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/contexts/AuthContext'; // Import AuthProvider
import { ChatProvider } from '@/contexts/ChatContext'; // Import ChatProvider
import { ReviewsProvider } from '@/contexts/ReviewsContext'; // Import ReviewsProvider
import { ReviewsSidebar } from '@/components/reviews/ReviewsSidebar'; // Import ReviewsSidebar

export const metadata: Metadata = {
  title: 'Sparkle Studio',
  description: 'Discover your next favorite jewelry piece or showcase your collection.',
  icons: {
    icon: '/favicon.ico', // Assuming a favicon might be added later
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <ChatProvider> {/* Wrap children with ChatProvider inside AuthProvider */}
            <ReviewsProvider> {/* Wrap children with ReviewsProvider inside ChatProvider */}
              {children}
              <Toaster />
              <ReviewsSidebar />
            </ReviewsProvider>
          </ChatProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
