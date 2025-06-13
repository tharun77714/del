"use client";
import React from 'react'; // Ensure React is imported
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { UserCircle, LogOut, ChevronDown, Loader2, LogIn, Briefcase, User, Settings, Star } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function AuthNavMenu() {
  const { user, profile, signOut, isLoading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/'); 
  };

  if (isLoading) {
    return <Button variant="ghost" size="sm" disabled><Loader2 className="h-4 w-4 animate-spin" /> Loading...</Button>;
  }

  if (!user || !profile) {
    return (
      <div className="flex items-center gap-2">
         <Button variant="outline" size="sm" asChild>
            <Link href="/auth/individual/signin">
                <User className="mr-1 md:mr-2 h-4 w-4"/> <span className="hidden md:inline">Client Sign In</span>
            </Link>
         </Button>
         <Button variant="default" size="sm" asChild className="btn-primary-sparkle">
            <Link href="/auth/business/signin">
                <Briefcase className="mr-1 md:mr-2 h-4 w-4"/> <span className="hidden md:inline">Business Sign In</span>
            </Link>
         </Button>
      </div>
    );
  }
  
  const profileName = profile.role === 'business' ? profile.business_name : profile.full_name;
  const initials = profileName?.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || user.email?.[0].toUpperCase() || "U";
  
  // Updated logic: "My Profile" for business users now points to /dashboard/networks
  const profileOrNetworkLink = profile.role === 'business' ? "/dashboard/networks" : "/dashboard/profile/individual";
  const profileOrNetworkLabel = profile.role === 'business' ? "Business Dashboard" : "My Profile";
  const profileIcon = profile.role === 'business' ? Settings : UserCircle;


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 md:h-10 md:w-auto md:px-3 md:py-2">
           <Avatar className="h-8 w-8 md:mr-2">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden md:inline text-sm font-medium">{profileName || "Profile"}</span>
          <ChevronDown className="ml-1 h-4 w-4 opacity-70 hidden md:inline" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{profileName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground capitalize">
              Role: {profile.role}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={profileOrNetworkLink}>
            {React.createElement(profileIcon, { className: "mr-2 h-4 w-4" })}
            {profileOrNetworkLabel}
          </Link>
        </DropdownMenuItem>
        {profile.role === 'business' && (
          <DropdownMenuItem asChild>
            <Link href="/dashboard/reviews">
              <Star className="mr-2 h-4 w-4" />
              Reviews
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

