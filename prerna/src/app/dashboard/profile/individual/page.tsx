"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { updateIndividualProfile, getSavedDesignsByUserIdAction, type SavedDesign, getUserReviewsWithStoreInfo, type Profile, type UserReviewWithStore } from '@/lib/actions/supabase-actions';
import { Loader2, Save, Edit, UserCircle, Mail, MapPin, Phone, User, GalleryHorizontal, FileImage, Palette, Heart, Star } from 'lucide-react';
import { AddressAutocompleteInput } from '@/components/common/address-autocomplete-input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import supabase from '@/lib/supabaseClient';
import { calculateStoreRating } from '@/lib/utils/ratings';

const individualProfileSchema = z.object({
  full_name: z.string().min(2, "Full name is required."),
  default_shipping_address_text: z.string().min(10, "Shipping address is required."),
  default_shipping_address_lat: z.number().optional(),
  default_shipping_address_lng: z.number().optional(),
  individual_phone_number: z.string().min(10, "Phone number must be at least 10 digits.").regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format."),
});

type IndividualProfileFormValues = z.infer<typeof individualProfileSchema>;

interface ReviewedStore {
  id: string;
  name: string;
  avgRating: number;
  reviewCount: number;
}

export default function IndividualProfilePage() {
  const { user, profile, isLoading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [isLoadingSavedDesigns, setIsLoadingSavedDesigns] = useState(true);
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [likedDesigns, setLikedDesigns] = useState<any[]>([]);
  const [refreshSaved, setRefreshSaved] = useState(0);
  const [reviewedStores, setReviewedStores] = useState<ReviewedStore[]>([]);
  const [isLoadingReviewedStores, setIsLoadingReviewedStores] = useState(true);
  const [refreshReviews, setRefreshReviews] = useState(0);

  const form = useForm<IndividualProfileFormValues>({
    resolver: zodResolver(individualProfileSchema),
    defaultValues: {
      full_name: "",
      default_shipping_address_text: "",
      default_shipping_address_lat: undefined,
      default_shipping_address_lng: undefined,
      individual_phone_number: "",
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/individual/signin');
    }
    if (profile && profile.role === 'individual') {
      form.reset({
        full_name: profile.full_name || "",
        default_shipping_address_text: profile.default_shipping_address_text || "",
        default_shipping_address_lat: profile.default_shipping_address_lat,
        default_shipping_address_lng: profile.default_shipping_address_lng,
        individual_phone_number: profile.individual_phone_number || "",
      });
    }
  }, [user, profile, authLoading, router, form.reset]);

  useEffect(() => {
    const fetchDesigns = async () => {
      if (user && profile && profile.role === 'individual') {
        setIsLoadingSavedDesigns(true);
        const { data, error } = await getSavedDesignsByUserIdAction(user.id);
        if (error) {
          toast({ title: "Error", description: `Could not load saved designs: ${error.message}`, variant: "destructive" });
          setSavedDesigns([]);
        } else {
          setSavedDesigns(data || []);
        }
        setIsLoadingSavedDesigns(false);
      }
    };
    fetchDesigns();
  }, [user, profile, toast]);
  
  useEffect(() => {
    async function fetchLiked() {
      if (!user) return;
      const { data, error } = await supabase.from('saved_designs').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (!error && data) setLikedDesigns(data);
    }
    fetchLiked();
  }, [user, refreshSaved]);

  useEffect(() => {
    async function fetchReviewedStores() {
      if (!user) return;
      setIsLoadingReviewedStores(true);
      const { data: userReviews, error } = await getUserReviewsWithStoreInfo(user.id);
      
      if (error) {
        console.error("Error fetching user reviews for profile:", error);
        toast({ title: "Error", description: `Could not load your reviews: ${error.message}`, variant: "destructive" });
        setReviewedStores([]);
        setIsLoadingReviewedStores(false);
        return;
      }

      if (!userReviews || userReviews.length === 0) {
        setReviewedStores([]);
        setIsLoadingReviewedStores(false);
        return;
      }

      const storeReviewsMap = new Map<string, { reviews: number[] }>();

      userReviews.forEach((review: UserReviewWithStore) => {
        if (review.store_id && review.store) {
          if (!storeReviewsMap.has(review.store_id)) {
            storeReviewsMap.set(review.store_id, { reviews: [] });
          }
          storeReviewsMap.get(review.store_id)?.reviews.push(review.rating);
        }
      });

      const uniqueReviewedStores: ReviewedStore[] = [];
      for (const [storeId, { reviews }] of storeReviewsMap.entries()) {
        const storeName = userReviews.find((r: UserReviewWithStore) => r.store_id === storeId)?.store?.name || 'Unknown Store';
        const { avgRating, reviewCount } = await calculateStoreRating(supabase, storeId, reviews);
        uniqueReviewedStores.push({
          id: storeId,
          name: storeName,
          avgRating: avgRating,
          reviewCount: reviewCount,
        });
      }
      setReviewedStores(uniqueReviewedStores);
      setIsLoadingReviewedStores(false);
    }

    fetchReviewedStores();
  }, [user, toast, refreshReviews]);

  const handlePlaceSelected = (placeDetails: { address: string; latitude: number; longitude: number } | null) => {
    if (placeDetails) {
      form.setValue('default_shipping_address_text', placeDetails.address, { shouldValidate: true });
      form.setValue('default_shipping_address_lat', placeDetails.latitude, { shouldValidate: true });
      form.setValue('default_shipping_address_lng', placeDetails.longitude, { shouldValidate: true });
    }
  };

  async function onProfileSubmit(values: IndividualProfileFormValues) {
    if (!user) return;
    setIsSubmittingProfile(true);
    try {
      const { error } = await updateIndividualProfile(user.id, values);
      if (error) throw error;
      await refreshProfile();
      toast({ title: "Success", description: "Profile updated successfully." });
      setIsEditingProfile(false);
      setRefreshSaved(r => r + 1);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update profile.", variant: "destructive" });
    } finally {
      setIsSubmittingProfile(false);
    }
  }

  if (authLoading || !profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/2" />
        <Card><CardHeader><Skeleton className="h-8 w-1/4 mb-2" /><Skeleton className="h-4 w-full" /></CardHeader><CardContent><Skeleton className="h-10 w-1/3" /></CardContent></Card>
        <Separator />
        <Skeleton className="h-8 w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  if (profile.role !== 'individual') {
     return <p>Access denied. This page is for individual users only.</p>;
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline text-2xl flex items-center"><UserCircle className="mr-2 h-6 w-6 text-accent"/>Your Profile</CardTitle>
            <CardDescription>View and manage your personal information.</CardDescription>
          </div>
          {!isEditingProfile && (
            <Button variant="outline" onClick={() => setIsEditingProfile(true)}><Edit className="mr-2 h-4 w-4" /> Edit Profile</Button>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-6">
              <FormField control={form.control} name="full_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><User className="mr-2 h-4 w-4" />Full Name</FormLabel>
                    <FormControl><Input {...field} disabled={!isEditingProfile} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                  <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4" />Email</FormLabel>
                  <Input value={user?.email || ""} disabled />
                  <FormDescription>Your email address cannot be changed here.</FormDescription>
              </FormItem>
              <FormItem>
                <FormLabel className="flex items-center"><MapPin className="mr-2 h-4 w-4" />Please enter the location</FormLabel>
                {isEditingProfile ? (
                    <AddressAutocompleteInput
                        apiKey={googleMapsApiKey}
                        onPlaceSelectedAction={handlePlaceSelected}
                        initialValue={form.getValues().default_shipping_address_text}
                    />
                ) : (
                    <Input value={form.getValues().default_shipping_address_text} disabled />
                )}
                <FormField control={form.control} name="default_shipping_address_text" render={({ field }) => <Input type="hidden" {...field} />} />
                <FormMessage>{form.formState.errors.default_shipping_address_text?.message}</FormMessage>
              </FormItem>
              <FormField control={form.control} name="individual_phone_number" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Phone className="mr-2 h-4 w-4" />Phone Number</FormLabel>
                    <FormControl><Input type="tel" {...field} disabled={!isEditingProfile} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditingProfile && (
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="ghost" onClick={() => {
                    setIsEditingProfile(false);
                    form.reset({ 
                        full_name: profile.full_name || "",
                        default_shipping_address_text: profile.default_shipping_address_text || "",
                        default_shipping_address_lat: profile.default_shipping_address_lat,
                        default_shipping_address_lng: profile.default_shipping_address_lng,
                        individual_phone_number: profile.individual_phone_number || "",
                    });
                  }}>Cancel</Button>
                  <Button type="submit" disabled={isSubmittingProfile} className="btn-accent-sparkle" style={{ '--accent-foreground': 'hsl(var(--accent-foreground))', backgroundColor: 'hsl(var(--accent))' } as React.CSSProperties}>
                    {isSubmittingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      <Separator />

      <div>
        <h2 className="text-2xl font-semibold mb-6 flex items-center">
            <GalleryHorizontal className="mr-3 h-7 w-7 text-primary" /> My Saved Designs
        </h2>
        {isLoadingSavedDesigns ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {[1,2,3].map(i => (
                    <Card key={i} className="overflow-hidden">
                        <Skeleton className="w-full aspect-square rounded-t-lg" />
                        <CardContent className="p-4 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        ) : savedDesigns.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {savedDesigns.map(design => (
                    <Card key={design.id} className="shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
                        <div className="relative w-full aspect-square bg-muted/30">
                            <Image src={design.image_data_uri} alt={`Saved design - ${design.design_prompt.substring(0,30)}...`} layout="fill" objectFit="contain" className="p-2"/>
                        </div>
                        <CardContent className="p-4 flex-grow flex flex-col justify-between">
                           <div>
                                <p className="text-xs text-muted-foreground mb-2 flex items-center">
                                    <Palette className="mr-1.5 h-3 w-3" /> Prompt:
                                </p>
                                <p className="text-sm font-medium line-clamp-3 mb-2" title={design.design_prompt}>
                                    {design.design_prompt}
                                </p>
                           </div>
                            <p className="text-xs text-muted-foreground mt-auto pt-2 border-t border-border/50">
                                Saved: {format(new Date(design.created_at), "PPp")}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        ) : (
            <Card className="flex flex-col items-center justify-center py-12 border-dashed bg-muted/20">
                <FileImage className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">You haven't saved any designs yet.</p>
                <p className="text-sm text-muted-foreground">Designs you save from the AI Customizer will appear here.</p>
            </Card>
        )}
      </div>

      <Separator />

      <div>
        <h2 className="text-2xl font-semibold mb-6 flex items-center">
            <Star className="mr-3 h-7 w-7 text-primary" /> My Store Reviews
        </h2>
        {isLoadingReviewedStores ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {[1,2].map(i => (
                    <Card key={i} className="overflow-hidden p-4 space-y-3">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-full" />
                    </Card>
                ))}
            </div>
        ) : reviewedStores.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {reviewedStores.map(store => (
                    <Card key={store.id} className="shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
                        <CardContent className="p-4 flex-grow flex flex-col justify-between">
                           <div>
                                <p className="text-lg font-semibold mb-2 flex items-center">
                                    <MapPin className="mr-2 h-5 w-5 text-accent" /> {store.name}
                                </p>
                                <p className="text-sm text-muted-foreground flex items-center">
                                    <Star className="h-4 w-4 text-yellow-500 mr-1" />
                                    Average Rating: <span className="font-bold ml-1">{store.avgRating.toFixed(1)}/5</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    ({store.reviewCount} {store.reviewCount === 1 ? 'review' : 'reviews'})
                                </p>
                           </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        ) : (
            <Card className="flex flex-col items-center justify-center py-12 border-dashed bg-muted/20">
                <Star className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">You haven't reviewed any stores yet.</p>
                <p className="text-sm text-muted-foreground">Reviews you submit for businesses will appear here.</p>
            </Card>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Favourite Designs</h2>
        {likedDesigns.length === 0 ? (
          <p className="text-muted-foreground">You haven't favourited or saved any designs yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {likedDesigns.map(design => (
              <div key={design.id} className="border rounded-lg overflow-hidden relative group">
                <img src={design.image_url} alt={design.description} className="w-full h-40 object-contain bg-muted" />
                <button
                  className="absolute top-2 right-2 bg-white/80 rounded-full p-1 shadow group-hover:bg-white"
                  title="Favourite"
                  type="button"
                >
                  <Heart className="h-5 w-5 text-pink-500" fill="currentColor" />
                </button>
                <div className="p-2 text-xs text-muted-foreground">{design.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
