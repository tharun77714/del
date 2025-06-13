
"use client";

import { useAuth } from '@/hooks/useAuth'; // Updated to useAuth
import { IndividualNetworkView } from '@/components/networks/individual-view';
import { BusinessNetworkView } from '@/components/networks/business-view';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TriangleAlert, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NetworksPage() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/'); // Redirect to landing if no user type is set after loading
    }
  }, [user, authLoading, router]);

  if (authLoading || !profile) { // Also wait for profile
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!profile.role) {
     // This case should ideally be handled by the useEffect redirect,
     // or if profile fetching failed but user exists.
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Alert variant="destructive" className="max-w-md">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            User role not determined. Please try signing out and signing back in, or contact support if the issue persists.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      {profile.role === 'individual' && <IndividualNetworkView />}
      {profile.role === 'business' && <BusinessNetworkView />}
    </div>
  );
}
