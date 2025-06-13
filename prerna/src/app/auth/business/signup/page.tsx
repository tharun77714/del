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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Briefcase, Mail, Lock, Building, FileText, MapPin, User, Phone, ArrowRight, Loader2 } from 'lucide-react';
import { Eye, EyeOff } from 'lucide-react';
import { signUpBusiness } from '@/lib/actions/supabase-actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';

const businessSignUpSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string(),
  gstNumber: z.string().min(15, "GST number must be 15 characters.").max(15, "GST number must be 15 characters.").regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST number format."),
  businessType: z.string().min(3, "Please select a business type."),
  businessAddressText: z.string().min(10, "Business address is required."),
  businessAddressLat: z.number().optional(),
  businessAddressLng: z.number().optional(),
  contactPersonName: z.string().min(2, "Contact person name is required."),
  contactPhoneNumber: z.string().min(10, "Phone number must be at least 10 digits.").regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format."),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type BusinessSignUpFormValues = z.infer<typeof businessSignUpSchema>;

const businessTypes = ["Retailer", "Wholesaler", "Artisan/Designer", "Manufacturer", "Online Store", "Other"];

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Dynamically import AddressAutocompleteInput to ensure it's client-side only
const AddressAutocompleteInput = dynamic(() => import('@/components/common/address-autocomplete-input').then(mod => mod.AddressAutocompleteInput), {
  ssr: false,
  loading: () => <Input placeholder="Loading address input..." disabled />,
});

export default function BusinessSignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Pre-fill phone and contact name if available
  const defaultPhone = user?.phone || profile?.contact_phone_number || '';
  const defaultContactName = profile?.contact_person_name || profile?.full_name || '';

  const form = useForm<BusinessSignUpFormValues>({
    resolver: zodResolver(businessSignUpSchema),
    defaultValues: {
      businessName: '',
      email: '',
      password: '',
      confirmPassword: '',
      gstNumber: '',
      businessType: '',
      businessAddressText: '',
      contactPersonName: defaultContactName,
      contactPhoneNumber: defaultPhone,
    },
  });

  const handlePlaceSelected = (placeDetails: { address: string; latitude: number; longitude: number } | null) => {
    if (placeDetails) {
      form.setValue('businessAddressText', placeDetails.address, { shouldValidate: true });
      form.setValue('businessAddressLat', placeDetails.latitude, { shouldValidate: true });
      form.setValue('businessAddressLng', placeDetails.longitude, { shouldValidate: true });
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prevState => !prevState);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(prevState => !prevState);
  };

  async function onSubmit(data: BusinessSignUpFormValues) {
    setIsLoading(true);
    try {
      const result = await signUpBusiness(data);
      if (result.error) {
        throw new Error(result.error.message);
      }
      if (result.data?.user) {
        toast({
          title: "Sign Up Successful!",
          description: "Please check your email to confirm your registration. Then, you can sign in.",
        });
        router.push('/auth/business/signin');
      }
    } catch (error: any) {
      toast({
        title: "Sign Up Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="shadow-xl">
      <CardHeader className="text-center">
        <Briefcase className="mx-auto h-12 w-12 text-primary mb-2" />
        <CardTitle className="font-headline text-3xl">Business Registration</CardTitle>
        <CardDescription>Create your Sparkle Studio business account.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Building className="mr-2 h-4 w-4" />Business Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Company Inc." {...field} autoComplete="organization" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4" />Business Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@yourcompany.com" {...field} autoComplete="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Lock className="mr-2 h-4 w-4" />Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} autoComplete="new-password" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-1 hover:bg-transparent"
                          onClick={togglePasswordVisibility}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Lock className="mr-2 h-4 w-4" />Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" {...field} autoComplete="new-password" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-1 hover:bg-transparent"
                          onClick={toggleConfirmPasswordVisibility}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="gstNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><FileText className="mr-2 h-4 w-4" />GST Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 29ABCDE1234F1Z5" {...field} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="businessType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Briefcase className="mr-2 h-4 w-4" />Business Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select business type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {businessTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel className="flex items-center"><MapPin className="mr-2 h-4 w-4" />Business Address</FormLabel>
              <AddressAutocompleteInput
                apiKey={googleMapsApiKey}
                onPlaceSelectedAction={handlePlaceSelected}
                initialValue={form.getValues().businessAddressText}
              />
              <FormField control={form.control} name="businessAddressText" render={({ field }) => <Input type="hidden" {...field} />} />
              <FormMessage>{form.formState.errors.businessAddressText?.message}</FormMessage>
            </FormItem>

            <FormField
              control={form.control}
              name="contactPersonName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><User className="mr-2 h-4 w-4" />Contact Person Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Jane Doe" {...field} autoComplete="name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactPhoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Phone className="mr-2 h-4 w-4" />Contact Phone Number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+1234567890" {...field} autoComplete="tel" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full btn-primary-sparkle text-lg py-3" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ArrowRight className="mr-2 h-5 w-5" />}
              Create Business Account
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Button variant="link" asChild className="p-0 text-primary">
            <Link href="/auth/business/signin">Sign In</Link>
          </Button>
        </p>
      </CardContent>
    </Card>
  );
}
