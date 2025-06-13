"use client"; // Required for using hooks like useChat

import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AnimatedSparkleIcon } from '@/components/common/animated-sparkle-icon';
import { Home, Network, Palette, MessageSquare, Star } from 'lucide-react'; // Added Star icon
import { AuthNavMenu } from '@/components/common/AuthNavMenu';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { useChat } from '@/contexts/ChatContext'; // Import useChat
import { useAuth } from '@/hooks/useAuth'; // Import useAuth to check if user is logged in
import { Badge } from '@/components/ui/badge'; // For potential unread count badge

// export const metadata: Metadata = { // Metadata should be defined in a server component or not at all in client component
//   title: 'Sparkle Studio Dashboard',
//   description: 'Manage your jewelry network or find your next piece.',
// };

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = useAuth(); // Get user and profile to conditionally render chat button and reviews link
  const { toggleChat, conversations, isChatOpen } = useChat();

  // Calculate total unread messages
  const totalUnreadMessages = user ? conversations.reduce((acc, convo) => acc + (convo.unread_count || 0), 0) : 0;
  const isBusinessUser = profile?.role === 'business'; // Check if the user is a business user

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <AnimatedSparkleIcon className="h-7 w-7 text-primary" />
            <span className="font-headline text-xl font-semibold text-foreground">Sparkle Studio</span>
          </Link>
          <nav className="flex items-center gap-1 md:gap-2">
            <Button variant="ghost" asChild className="text-foreground hover:bg-primary/10">
              <Link href="/dashboard">
                <Home className="mr-0 md:mr-2 h-4 w-4" /> <span className="hidden md:inline">Home</span>
              </Link>
            </Button>
            <Button variant="ghost" asChild className="text-foreground hover:bg-primary/10">
              <Link href="/dashboard/networks">
                <Network className="mr-0 md:mr-2 h-4 w-4" /> <span className="hidden md:inline">Networks</span>
              </Link>
            </Button>
            <Button variant="ghost" asChild className="text-foreground hover:bg-primary/10">
              <Link href="/dashboard/customizer">
                <Palette className="mr-0 md:mr-2 h-4 w-4" /> <span className="hidden md:inline">AI Customizer</span>
              </Link>
            </Button>
            {isBusinessUser && ( // Only show Reviews link if user is a business user
              <Button variant="ghost" asChild className="text-foreground hover:bg-primary/10">
                <Link href="/dashboard/reviews">
                  <Star className="mr-0 md:mr-2 h-4 w-4" /> <span className="hidden md:inline">Reviews</span>
                </Link>
              </Button>
            )}
            {user && ( // Only show chat toggle if user is logged in
              <Button variant="ghost" onClick={toggleChat} className="text-foreground hover:bg-primary/10 relative px-2 md:px-3">
                <MessageSquare className="h-5 w-5 md:mr-0" /> 
                <span className="hidden md:inline ml-2">Chat</span>
                {totalUnreadMessages > 0 && !isChatOpen && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 md:top-1 md:right-1 h-4 min-w-[1rem] px-1 py-0.5 text-xs leading-tight flex items-center justify-center">
                    {totalUnreadMessages > 9 ? '9+' : totalUnreadMessages}
                  </Badge>
                )}
              </Button>
            )}
            <AuthNavMenu />
          </nav>
        </div>
      </header>
      <div className="flex flex-1">
        <main className={`flex-1 container py-6 md:py-10 ${isChatOpen && user ? 'pr-0 md:pr-[21rem]' : 'pr-0'}`}> {/* Adjust padding based on chat sidebar state */}
          {children}
        </main>
        {user && <ChatSidebar />} {/* Conditionally render ChatSidebar if user is logged in */}
      </div>
      <footer className="py-6 md:px-8 md:py-0 border-t bg-background">
        <div className="container flex flex-col items-center justify-center gap-4 h-20 md:h-24 md:flex-row">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
            © {new Date().getFullYear()} Sparkle Studio. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
