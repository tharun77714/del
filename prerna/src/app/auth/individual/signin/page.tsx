
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
import supabase from '@/lib/supabaseClient'; // Ensure this is imported correctly
import { User, Mail, Lock, LogIn, Loader2 } from 'lucide-react';
// import { useAuth } from '@/hooks/useAuth'; // Not directly needed for sign-in logic, AuthProvider handles session

const individualSignInSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(1, "Password is required."),
});

import { Eye, EyeOff } from 'lucide-react'; // Import Eye and EyeOff icons
type IndividualSignInFormValues = z.infer<typeof individualSignInSchema>;

export default function IndividualSignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  // const { refreshProfile } = useAuth(); // AuthProvider handles this on auth state change
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<IndividualSignInFormValues>({
    resolver: zodResolver(individualSignInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: IndividualSignInFormValues) {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        throw error;
      }
      
      // AuthProvider will pick up the new session and profile.
      toast({
        title: "Sign In Successful!",
        description: "Welcome to Sparkle Studio.", 
      });
      router.push('/dashboard'); 
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
        <User className="mx-auto h-12 w-12 text-accent mb-2" />
        <CardTitle className="font-headline text-3xl">Welcome Back</CardTitle>
        <CardDescription>Sign in to explore Sparkle Studio.</CardDescription>
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
                    <Input type="email" placeholder="you@example.com" {...field} />
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
                  <div className="relative">
                    <FormControl>
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        {...field} 
                      />
                    </FormControl>
                    <button type="button" onClick={togglePasswordVisibility} className="absolute inset-y-0 right-0 px-3 flex items-center text-sm leading-5">
                      {showPassword ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full btn-accent-sparkle text-lg py-3" disabled={isLoading} style={{ '--accent-foreground': 'hsl(var(--accent-foreground))', backgroundColor: 'hsl(var(--accent))' } as React.CSSProperties}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
              Sign In
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to Sparkle Studio?{' '}
          <Button variant="link" asChild className="p-0 text-accent" style={{ color: 'hsl(var(--accent))' }}>
            <Link href="/auth/individual/signup">Create an Account</Link>
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
