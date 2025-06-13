
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import supabase from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { Briefcase, Mail, Lock, LogIn, Loader2, Eye, EyeOff } from 'lucide-react';

const businessSignInSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(1, "Password is required."),
});

type BusinessSignInFormValues = z.infer<typeof businessSignInSchema>;

export default function BusinessSignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { refreshProfile } = useAuth(); // Though refreshProfile might be called by AuthProvider on auth state change
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<BusinessSignInFormValues>({
    resolver: zodResolver(businessSignInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: BusinessSignInFormValues) {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        throw error;
      }
      
      // AuthProvider should pick up the new session and profile.
      // We might not need explicit refreshProfile() here if onAuthStateChange handles it robustly.
      // await refreshProfile(); // Ensure profile is up-to-date in context

      toast({
        title: "Sign In Successful!",
        description: "Welcome back to Sparkle Studio.",
      });
      router.push('/dashboard'); // Or specific business dashboard home
    } catch (error: any) {
      toast({
        title: "Sign In Failed",
        description: error.message || "Invalid credentials or unexpected error.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  }

  return (
    <Card className="shadow-xl">
      <CardHeader className="text-center">
        <Briefcase className="mx-auto h-12 w-12 text-primary mb-2" />
        <CardTitle className="font-headline text-3xl">Business Sign In</CardTitle>
        <CardDescription>Access your Sparkle Studio business dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4" />Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@yourcompany.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Lock className="mr-2 h-4 w-4" />Password</FormLabel>
                  <FormControl>
 <div className="relative">
 <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
 <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-1 hover:bg-transparent" onClick={togglePasswordVisibility} disabled={isLoading}>
 {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
 <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
 </Button></div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full btn-primary-sparkle text-lg py-3" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
              Sign In
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have a business account?{' '}
          <Button variant="link" asChild className="p-0 text-primary">
            <Link href="/auth/business/signup">Sign Up</Link>
          </Button>
        </p>
         <p className="mt-2 text-center text-sm">
          <Button variant="link" asChild className="p-0 text-xs text-muted-foreground">
            <Link href="/auth/forgot-password">Forgot Password?</Link>
          </Button>
        </p>
      </CardContent>
    </Card>
  );
}
