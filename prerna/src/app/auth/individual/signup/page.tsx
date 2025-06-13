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
import { User, Mail, Lock, MapPin, Phone, ArrowRight, Loader2, EyeIcon, EyeOffIcon } from 'lucide-react';
import { AddressAutocompleteInput } from '@/components/common/address-autocomplete-input'; // Assuming this component exists and is correctly implemented
import { signUpIndividual } from '@/lib/actions/supabase-actions';
import { useLoadScript } from '@react-google-maps/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import supabase from "@/lib/supabaseClient";

const individualSignUpSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Invalid email address.").optional(),
  password: z.string().min(8, "Password must be at least 8 characters.").optional(),
  confirmPassword: z.string().optional(),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits.").regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format.").optional(),
  otp: z.string().min(6, "OTP must be 6 digits.").max(6, "OTP must be 6 digits.").optional(),
  defaultShippingAddressText: z.string().min(10, "Default shipping address is required."),
  defaultShippingAddressLat: z.number().optional(),
  defaultShippingAddressLng: z.number().optional(),
  profilePhoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format.").optional(),
}).refine(data => {
  if (data.email && data.password && data.confirmPassword) {
    return data.password === data.confirmPassword;
  }
  return true; // No password confirmation needed for phone signup
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type IndividualSignUpFormValues = z.infer<typeof individualSignUpSchema>;

export default function IndividualSignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [showPassword, setShowPassword] = useState(false);
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const libraries: ("places")[] = ['places'];

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: googleMapsApiKey || "",
    libraries,
    preventGoogleFontsLoading: true,
  });

  const form = useForm<IndividualSignUpFormValues>({
    resolver: zodResolver(individualSignUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phoneNumber: "",
      otp: "",
      defaultShippingAddressText: "",
      profilePhoneNumber: "",
    },
  });

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handlePlaceSelected = (placeDetails: { address: string; latitude: number; longitude: number } | null) => {
    if (placeDetails) {
      form.setValue('defaultShippingAddressText', placeDetails.address, { shouldValidate: true });
      form.setValue('defaultShippingAddressLat', placeDetails.latitude, { shouldValidate: true });
      form.setValue('defaultShippingAddressLng', placeDetails.longitude, { shouldValidate: true });
    }
  };

  async function onSubmit(data: IndividualSignUpFormValues) {
    setIsLoading(true);
    setError(null); // Clear previous errors

    console.log("Submitting form with data:", data);

    try {
      let result;
      if (authMethod === "email") {
        // Ensure email and password are provided for email signup
        if (!data.email || !data.password || !data.confirmPassword) {
          throw new Error("Please fill in all email and password fields.");
        }
        if (data.password !== data.confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        result = await signUpIndividual({
          fullName: data.fullName,
          email: data.email,
          password: data.password,
          defaultShippingAddressText: data.defaultShippingAddressText,
          defaultShippingAddressLat: data.defaultShippingAddressLat,
          defaultShippingAddressLng: data.defaultShippingAddressLng,
          profilePhoneNumber: data.profilePhoneNumber,
        });
      } else { // authMethod === "phone"
        if (!data.phoneNumber) {
          throw new Error("Please enter your phone number.");
        }

        if (!otpSent) {
          // First step: Send OTP
          result = await signUpIndividual({
            fullName: data.fullName,
            phoneNumber: data.phoneNumber,
            defaultShippingAddressText: data.defaultShippingAddressText,
            defaultShippingAddressLat: data.defaultShippingAddressLat,
            defaultShippingAddressLng: data.defaultShippingAddressLng,
            profilePhoneNumber: data.phoneNumber,
          });
          console.log("Result after sending OTP:", result);

          if (!result.error && !result.data?.user) {
            // OTP sent successfully, but user not fully signed in yet
            setOtpSent(true);
            toast({
              title: "OTP Sent!",
              description: `A One-Time Password has been sent to ${data.phoneNumber}. Please enter it to verify.`, 
            });
            setIsLoading(false); // Stop loading, wait for OTP input
            return; // Exit to wait for OTP input
          }
        } else {
          // Second step: Verify OTP
          if (!data.otp) {
            throw new Error("Please enter the OTP.");
          }
          result = await signUpIndividual({
            fullName: data.fullName,
            phoneNumber: data.phoneNumber,
            otp: data.otp,
            defaultShippingAddressText: data.defaultShippingAddressText,
            defaultShippingAddressLng: data.defaultShippingAddressLng,
            defaultShippingAddressLat: data.defaultShippingAddressLat,
            profilePhoneNumber: data.phoneNumber,
          });
          console.log("Result after verifying OTP:", result);
        }
      }

      if (result.error) {
        throw new Error(result.error.message);
      }
      if (result.data?.user) {
        toast({
          title: "Sign Up Successful!",
          description: "Welcome to Sparkle Studio! You are now signed in.",
        });
        router.push('/dashboard'); // Redirect to dashboard after successful signup
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

  // Debugging log for button disabled state
  const isButtonDisabled = isLoading || 
                         (authMethod === "email" && (!form.watch("email") || !form.watch("password") || !form.watch("confirmPassword"))) || 
                         (authMethod === "phone" && !otpSent && !form.watch("phoneNumber")) || 
                         (authMethod === "phone" && otpSent && !form.watch("otp"));
  console.log("Button Debugging:", {
    isLoading, 
    authMethod, 
    otpSent, 
    phoneNumberValue: form.watch("phoneNumber"),
    isButtonDisabled
  });

  return (
    <Card className="shadow-xl">
      <CardHeader className="text-center">
        <User className="mx-auto h-12 w-12 text-accent mb-2" />
        <CardTitle className="font-headline text-3xl">Create Your Account</CardTitle>
        <CardDescription>Join Sparkle Studio to discover unique jewelry.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><User className="mr-2 h-4 w-4" />Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Alex Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Tabs value={authMethod} onValueChange={(value) => {
                setAuthMethod(value as "email" | "phone");
                form.reset(); // Clear form fields when switching method
                setOtpSent(false); // Reset OTP state
              }} className="col-span-full mb-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="email">Email & Password</TabsTrigger>
                  <TabsTrigger value="phone">Phone & OTP</TabsTrigger>
                </TabsList>
              </Tabs>

              {authMethod === "email" && (
                <>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="col-span-full">
                        <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4" />Email Address</FormLabel>
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
                            <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                          </FormControl>
                          <button type="button" onClick={togglePasswordVisibility} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
                            {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center"><Lock className="mr-2 h-4 w-4" />Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="profilePhoneNumber"
                    render={({ field }) => (
                      <FormItem className="col-span-full">
                        <FormLabel className="flex items-center"><Phone className="mr-2 h-4 w-4" />Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="+1234567890 (with country code)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {authMethod === "phone" && (
                <>
                  {!otpSent ? (
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem className="col-span-full">
                          <FormLabel className="flex items-center"><Phone className="mr-2 h-4 w-4" />Phone Number</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="+1234567890 (with country code)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem className="col-span-full">
                          <FormLabel className="flex items-center"><Lock className="mr-2 h-4 w-4" />One-Time Password (OTP)</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="Enter 6-digit OTP" {...field} />
                          </FormControl>
                          <FormDescription>An OTP has been sent to your phone number.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}
            </div>
            <FormItem>
              <FormLabel className="flex items-center"><MapPin className="mr-2 h-4 w-4" />Please enter the location</FormLabel>
              {isLoaded ? (
                <AddressAutocompleteInput
                  apiKey={googleMapsApiKey}
                  onPlaceSelectedAction={handlePlaceSelected}
                  initialValue={form.getValues().defaultShippingAddressText}
                />
              ) : (
                <div className="relative w-full">
                  <Input
                    type="text"
                    placeholder="Loading address input..."
                    disabled
                    className="pr-10"
                  />
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground animate-spin" />
                </div>
              )}
               <FormField control={form.control} name="defaultShippingAddressText" render={({ field }) => <Input type="hidden" {...field} />} />
              <FormMessage>{form.formState.errors.defaultShippingAddressText?.message}</FormMessage>
            </FormItem>
            <Button 
              type={authMethod === "phone" ? "button" : "submit"}
              className="w-full btn-accent-sparkle text-lg py-3"
              disabled={isButtonDisabled}
              onClick={async (e) => {
                if (authMethod === "phone") {
                  e.preventDefault();
                  setIsLoading(true);
                  setError(null); 

                  const phoneNumber = form.watch("phoneNumber");
                  const otp = form.watch("otp");
                  const fullName = form.watch("fullName");
                  const defaultShippingAddressText = form.watch("defaultShippingAddressText");
                  const defaultShippingAddressLat = form.watch("defaultShippingAddressLat");
                  const defaultShippingAddressLng = form.watch("defaultShippingAddressLng");
                  const profilePhoneNumber = form.watch("profilePhoneNumber");

                  console.log("Direct Phone OTP Trigger - Data:", { phoneNumber, otp, fullName });

                  try {
                    let result;
                    if (!otpSent) {
                      // First step: Send OTP
                      result = await signUpIndividual({
                        fullName,
                        phoneNumber,
                        defaultShippingAddressText,
                        defaultShippingAddressLat,
                        defaultShippingAddressLng,
                        profilePhoneNumber: phoneNumber,
                      });
                      console.log("Direct Phone OTP Trigger - Result after sending OTP:", result);

                      if (!result.error && !result.data?.user) {
                        setOtpSent(true);
                        toast({
                          title: "OTP Sent!",
                          description: `A One-Time Password has been sent to ${phoneNumber}. Please enter it to verify.`, 
                        });
                        setIsLoading(false);
                        return; 
                      }
                    } else {
                      // Second step: Verify OTP
                      if (!otp) {
                        throw new Error("Please enter the OTP.");
                      }
                      result = await signUpIndividual({
                        fullName,
                        phoneNumber,
                        otp,
                        defaultShippingAddressText,
                        defaultShippingAddressLng,
                        defaultShippingAddressLat,
                        profilePhoneNumber: phoneNumber,
                      });
                      console.log("Direct Phone OTP Trigger - Result after verifying OTP:", result);
                    }

                    if (result.error) {
                      throw new Error(result.error.message);
                    }
                    if (result.data?.user) {
                      toast({
                        title: "Sign Up Successful!",
                        description: "Welcome to Sparkle Studio! You are now signed in.",
                      });
                      router.push('/dashboard');
                    }
                  } catch (err: any) {
                    setError(err.message || "An unexpected error occurred.");
                    toast({
                      title: "Action Failed",
                      description: err.message || "An unexpected error occurred.",
                      variant: "destructive",
                      duration: 7000,
                    });
                  } finally {
                    setIsLoading(false);
                  }
                } else {
                  form.handleSubmit(onSubmit)(e);
                }
              }}
              style={{ '--accent-foreground': 'hsl(var(--accent-foreground))', backgroundColor: 'hsl(var(--accent))' } as React.CSSProperties}
            >
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ArrowRight className="mr-2 h-5 w-5" />}
              {authMethod === "phone" && !otpSent ? "SEND OTP" : "CREATE ACCOUNT"}
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Button variant="link" asChild className="p-0 text-accent" style={{ color: 'hsl(var(--accent))' }}>
            <Link href="/auth/individual/signin">Sign In</Link>
          </Button>
        </p>
      </CardContent>
    </Card>
  );
}
