"use client";

import type { Session, User } from '@supabase/supabase-js';
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import supabase from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

// Define the shape of your profile data
export interface Profile {
  id: string;
  role: 'individual' | 'business' | null;
  email?: string;
  full_name?: string; // Individual
  default_shipping_address_text?: string; // Individual
  default_shipping_address_lat?: number; // Individual
  default_shipping_address_lng?: number; // Individual
  individual_phone_number?: string; // Individual
  business_name?: string; // Business
  gst_number?: string; // Business
  business_type?: string; // Business
  business_address_text?: string; // Business
  business_address_lat?: number; // Business
  business_address_lng?: number; // Business
  contact_person_name?: string; // Business
  contact_phone_number?: string; // Business
  updated_at?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchProfile = async (userId: string) => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) {
        console.error('Error fetching profile:', error);
        toast({ 
          title: "Profile Loading Error", 
          description: `Could not load user profile: ${error.message}. This might be due to Row Level Security policies.`, 
          variant: "destructive" 
        });
        return null;
      }
      return data as Profile;
    } catch (e: any) {
      console.error('Exception fetching profile:', e);
      toast({ 
        title: "Profile Loading Error", 
        description: `An unexpected error occurred while loading profile: ${e.message || 'Unknown error'}.`, 
        variant: "destructive" 
      });
      return null;
    }
  };
  
  const refreshProfile = async () => {
    if (user) {
      const currentProfile = await fetchProfile(user.id);
      setProfile(currentProfile);
    }
  };


  useEffect(() => {
    setIsLoading(true);
    const getInitialSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        const initialProfile = await fetchProfile(initialSession.user.id);
        setProfile(initialProfile);
      }
      setIsLoading(false);
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === 'SIGNED_IN') {
          // Force cookie sync with server
          await fetch('/api/auth/sync', { method: 'POST' });
        }
        
        setSession(newSession);
        const currentUser = newSession?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          setIsLoading(true);
          const currentProfile = await fetchProfile(currentUser.id);
          setProfile(currentProfile);
          setIsLoading(false);
        } else {
          setProfile(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const value = {
    session,
    user,
    profile,
    isLoading,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
