
"use client";

import { useAuth } from '@/hooks/useAuth'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, UserCircle, Building, Loader2, Palette, Settings } from 'lucide-react'; 
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedSparkleIcon } from '@/components/common/animated-sparkle-icon';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/'); 
    }
  }, [user, authLoading, router]);

  if (authLoading || !profile) { 
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-8 w-3/4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/4 mb-2" /><Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent><Skeleton className="h-10 w-1/3" /></CardContent>
        </Card>
      </div>
    );
  }
  
  const userRole = profile.role;
  const displayName = profile.role === 'business' ? profile.business_name : profile.full_name;
  const welcomeTitle = userRole === 'individual' ? "Explore Your Sparkle" : "Grow Your Business";
  const welcomeMessage = userRole === 'individual' 
    ? "Discover stunning jewelry, connect with artisans, and find pieces that tell your story. Your journey into the world of brilliance starts here."
    : "Showcase your masterful creations, expand your reach, and connect with a community passionate about fine jewelry. Let's build your brand.";
  
  const profileOrNetworkLink = userRole === 'individual' ? "/dashboard/profile/individual" : "/dashboard/networks";
  const profileOrNetworkButtonText = userRole === 'individual' ? "Go to My Profile" : "Go to Business Dashboard";

  return (
    <div className="space-y-8">
      <div className="p-6 md:p-8 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-border shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
          {userRole === 'individual' ? 
            <UserCircle className="h-12 w-12 text-accent shrink-0" /> : 
            <Building className="h-12 w-12 text-primary shrink-0" />
          }
          <div>
            <h1 className="font-headline text-3xl md:text-4xl font-bold text-foreground">
              {welcomeTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              Welcome, {displayName || user?.email}! (Mode: {userRole === 'individual' ? 'Individual Client' : 'Business Partner'})
            </p>
          </div>
        </div>
        <p className="mt-2 text-lg text-foreground/80 leading-relaxed">
          {welcomeMessage}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AnimatedSparkleIcon className="h-6 w-6 text-primary" />
              <CardTitle className="font-headline text-2xl">Navigate Your Network</CardTitle>
            </div>
            <CardDescription>
              {userRole === 'individual' 
                ? 'Find nearby stores, get AI-powered jewelry suggestions, and browse collections.'
                : 'Manage your business profile, list items, and oversee branch locations (soon).'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-foreground/90">
              Ready to dive deeper? Head over to the Networks section.
            </p>
            <Button asChild size="lg" className={userRole === 'individual' ? 'btn-accent-sparkle' : 'btn-primary-sparkle'} 
              style={userRole === 'individual' ? { '--accent-foreground': 'hsl(var(--accent-foreground))', backgroundColor: 'hsl(var(--accent))' } as React.CSSProperties : {}}>
              <Link href="/dashboard/networks">
                Go to Networks <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
             <div className="flex items-center gap-2">
                <Palette className="h-6 w-6 text-primary" />
                <CardTitle className="font-headline text-2xl">AI Jewelry Customizer</CardTitle>
            </div>
            <CardDescription>
                Unleash your creativity. Design or refine jewelry with our AI-powered customizer tool.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-foreground/90">
                Whether you have a base image to modify or an idea to bring to life from scratch, the AI Customizer is here to help.
            </p>
            <Button asChild size="lg" variant="outline">
                <Link href="/dashboard/customizer">AI Customizer <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      
       <Card className="shadow-md">
         <CardHeader>
           <div className="flex items-center gap-2">
             <Settings className="h-6 w-6 text-muted-foreground" />
             <CardTitle className="font-headline text-xl">
                {userRole === 'individual' ? "Manage Your Profile" : "Access Business Dashboard"}
             </CardTitle>
           </div>
           <CardDescription>
            {userRole === 'individual' 
                ? "Keep your information up-to-date for a seamless experience."
                : "Your central hub for managing business details, items, and more."
            }
           </CardDescription>
         </CardHeader>
         <CardContent>
           <p className="text-sm text-muted-foreground mb-3">
             {userRole === 'individual' 
               ? "Update your name, default shipping address, and contact details."
               : "The Networks page now serves as your main dashboard for all business management tasks."
             }
           </p>
            <Button asChild variant="outline">
                <Link href={profileOrNetworkLink}>{profileOrNetworkButtonText} <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
         </CardContent>
       </Card>
    </div>
  );
}

    