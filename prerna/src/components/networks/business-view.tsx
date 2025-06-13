"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { updateBusinessProfile, addJewelryItem, getJewelryItemsByBusiness, type JewelryItemData } from '@/lib/actions/supabase-actions';
import { Loader2, Save, Edit, UploadCloud, Building, FileText, MapPin, User, Phone, Briefcase, ImageIcon, ListOrdered, ShoppingBag, PackageSearch, PlusCircle, Lock } from 'lucide-react';
import { AddressAutocompleteInput } from '@/components/common/address-autocomplete-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { JewelryCard, type JewelryItem } from '@/components/networks/jewelry-card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import dynamic from "next/dynamic";
const StoreLocationPicker = dynamic(() => import("./StoreLocationPicker").then(mod => mod.StoreLocationPicker), { ssr: false });
const StoreMap = dynamic(() => import('./StoreMap').then(mod => mod.StoreMap), { ssr: false });
const StoreDirectionsMap = dynamic(() => import('./StoreDirectionsMap').then(mod => mod.default), { ssr: false });

const businessProfileSchema = z.object({
  business_name: z.string().min(2, "Business name is required."),
  gst_number: z.string().min(15, "GST number must be 15 characters.").max(15, "GST number must be 15 characters.").regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST number format."),
  business_type: z.string().min(3, "Business type is required."),
  business_address_text: z.string().min(10, "Business address is required."),
  business_address_lat: z.number().nullable().optional(), // Allow null
  business_address_lng: z.number().nullable().optional(), // Allow null
  contact_person_name: z.string().min(2, "Contact person name is required."),
  contact_phone_number: z.string().min(10, "Phone number must be at least 10 digits.").regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format."),
});

type BusinessProfileFormValues = z.infer<typeof businessProfileSchema>;

const jewelryItemSchema = z.object({
  name: z.string().min(2, "Jewelry name is required."),
  description: z.string().min(10, "Description is required."),
  material: z.string().min(2, "Material is required."),
  style: z.string().min(2, "Style is required."),
  image_url: z.string().url("A valid image URL is required."),
});

type JewelryItemFormValues = z.infer<typeof jewelryItemSchema>;

const businessTypes = ["Retailer", "Wholesaler", "Artisan/Designer", "Manufacturer", "Online Store", "Other"];

interface FetchedJewelryItem extends JewelryItemData {
  id: string;
  created_at: string;
}

export function BusinessNetworkView() {
  const { user, profile, isLoading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  
  const [isSubmittingJewelry, setIsSubmittingJewelry] = useState(false);
  const [listedItems, setListedItems] = useState<FetchedJewelryItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [showMapDialog, setShowMapDialog] = useState(false);

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const profileForm = useForm<BusinessProfileFormValues>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      business_name: "", gst_number: "", business_type: "", business_address_text: "",
      business_address_lat: null, business_address_lng: null, // Default to null
      contact_person_name: "", contact_phone_number: "",
    },
  });

  const jewelryForm = useForm<JewelryItemFormValues>({
    resolver: zodResolver(jewelryItemSchema),
    defaultValues: { name: "", description: "", material: "", style: "", image_url: "" },
  });

  const fetchListedItems = async () => {
    if (!user) return;
    setIsLoadingItems(true);
    const { data, error } = await getJewelryItemsByBusiness(user.id);
    if (error) {
      toast({ title: "Error", description: "Could not fetch your listed jewelry items.", variant: "destructive" });
    } else {
      setListedItems(data as FetchedJewelryItem[] || []);
    }
    setIsLoadingItems(false);
  };
  
  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== 'business')) {
      router.replace('/auth/business/signin');
    }
    if (user && profile && profile.role === 'business') {
      profileForm.reset({
        business_name: profile.business_name || "",
        gst_number: profile.gst_number || "",
        business_type: profile.business_type || "",
        business_address_text: profile.business_address_text || "",
        business_address_lat: profile.business_address_lat === undefined ? null : profile.business_address_lat,
        business_address_lng: profile.business_address_lng === undefined ? null : profile.business_address_lng,
        contact_person_name: profile.contact_person_name || "",
        contact_phone_number: profile.contact_phone_number || "",
      });
      fetchListedItems();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile, authLoading, router, profileForm.reset]); // Removed toast from deps array as it's stable

  const handlePlaceSelected = (placeDetails: { address: string; latitude: number; longitude: number } | null) => {
    if (placeDetails) {
      profileForm.setValue('business_address_text', placeDetails.address, { shouldValidate: true });
      profileForm.setValue('business_address_lat', placeDetails.latitude, { shouldValidate: true });
      profileForm.setValue('business_address_lng', placeDetails.longitude, { shouldValidate: true });
    } else {
      // If placeDetails is null (e.g., address cleared), reset address text and explicitly set lat/lng to null
      profileForm.setValue('business_address_text', "", { shouldValidate: true }); 
      profileForm.setValue('business_address_lat', null, { shouldValidate: true }); 
      profileForm.setValue('business_address_lng', null, { shouldValidate: true }); 
    }
  };

  const handleMapSelect = (location: { lat: number; lng: number }) => {
    profileForm.setValue('business_address_lat', location.lat, { shouldValidate: true });
    profileForm.setValue('business_address_lng', location.lng, { shouldValidate: true });
  };

  async function onProfileSubmit(values: BusinessProfileFormValues) {
    if (!user) return;
    setIsSubmittingProfile(true);
    try {
      // Ensure lat/lng are numbers or undefined (not null) before sending to server action
      const submissionValues = {
        ...values,
        business_address_lat: values.business_address_lat !== null ? values.business_address_lat : null,
        business_address_lng: values.business_address_lng !== null ? values.business_address_lng : null,
      };
      const { error } = await updateBusinessProfile(user.id, submissionValues); 
      if (error) throw error;
      await refreshProfile(); 
      toast({ title: "Success", description: "Business profile updated successfully." });
      setIsEditingProfile(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update profile.", variant: "destructive" });
    } finally {
      setIsSubmittingProfile(false);
    }
  }

  async function onJewelrySubmit(values: JewelryItemFormValues) {
    if (!user) return;
    setIsSubmittingJewelry(true);
    try {
      const itemData: JewelryItemData = { ...values, business_id: user.id };
      const { error } = await addJewelryItem(itemData);
      if (error) throw error;
      toast({ title: "Success", description: "Jewelry item listed successfully." });
      jewelryForm.reset();
      await fetchListedItems(); 
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to list jewelry item.", variant: "destructive" });
    } finally {
      setIsSubmittingJewelry(false);
    }
  }

  if (authLoading || !profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-10 w-1/2 mx-auto my-4" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
   if (profile.role !== 'business') {
     return <p>Loading or Access Denied...</p>;
  }

  return (
    <div className="space-y-8 pb-16">
      <Card className="shadow-lg overflow-hidden">
        <div className="relative h-48 md:h-64 w-full bg-secondary/30">
             <Image
                src={`https://placehold.co/1200x400.png?text=${encodeURIComponent(profile.business_name || "Your Business")}`}
                alt={`${profile.business_name || "Your Business"} banner`}
                layout="fill"
                objectFit="cover"
                priority
                data-ai-hint="business banner"
              />
            <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center p-4">
                <ShoppingBag className="h-16 w-16 text-white/80 mb-2" />
                <h1 className="font-headline text-3xl md:text-5xl font-bold text-white text-center shadow-md">
                    {profile.business_name || "Your Business"}
                </h1>
                <p className="text-sm text-white/90 mt-1">Manage your profile, items, and branches here.</p>
            </div>
        </div>
        <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center text-muted-foreground mb-2">
                        <MapPin className="h-5 w-5 mr-2 text-primary shrink-0" />
                        <span>{profile.business_address_text || "Address not set"}</span>
                        {/* Restriction badge */}
                        {profile.role === 'business' ? (
                          <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-medium" title="Only business owners can edit store location">
                            <Lock className="h-3 w-3 mr-1 text-green-600" /> Owner Editable
                          </span>
                        ) : (
                          <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs font-medium" title="View only. Store location can only be set by the business owner.">
                            <Lock className="h-3 w-3 mr-1 text-gray-500" /> View Only
                          </span>
                        )}
                    </div>
                    <p className="text-sm text-foreground flex items-center">
                        <Briefcase className="h-4 w-4 mr-2 text-primary shrink-0" />
                        Registered as: <span className="font-semibold ml-1">{profile.business_type || "Type not set"}</span>
                    </p>
                    {/* Prompt to add location if missing (for business owner) */}
                    {profile.role === 'business' && (!profile.business_address_lat || !profile.business_address_lng) && (
                      <div className="mt-4 bg-yellow-100 border border-yellow-300 rounded p-3 flex items-center gap-3">
                        <span className="text-yellow-800 text-sm">Add your store location on the map so customers can find you!</span>
                        <Button size="sm" variant="secondary" onClick={() => setIsEditingProfile(true)}>
                          <MapPin className="mr-1 h-4 w-4" /> Add Location
                        </Button>
                      </div>
                    )}
                </div>
                <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="mt-2 sm:mt-0" onClick={() => setIsEditingProfile(true)}>
                      <Edit className="mr-2 h-4 w-4" /> Edit Your Business Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center"><Building className="mr-2 h-6 w-6 text-primary"/>Edit Business Profile</DialogTitle>
                      <DialogDescription>Update your business information. Click save when you're done.</DialogDescription>
                    </DialogHeader>
                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-3">
                        <FormField control={profileForm.control} name="business_name" render={({ field }) => (
                            <FormItem><FormLabel>Business Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )}
                        />
                        <FormItem><FormLabel>Business Email</FormLabel><Input value={user?.email || ""} disabled /></FormItem>
                        <FormField control={profileForm.control} name="gst_number" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center"><FileText className="mr-2 h-4 w-4" />GST Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )}
                        />
                        <FormField control={profileForm.control} name="business_type" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center"><Briefcase className="mr-2 h-4 w-4" />Business Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                                <SelectContent>{businessTypes.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent>
                              </Select><FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormItem>
                          <FormLabel className="flex items-center"><MapPin className="mr-2 h-4 w-4" />Business Address</FormLabel>
                          <div className="flex flex-col gap-1">
                            <AddressAutocompleteInput
                              apiKey={googleMapsApiKey!}
                              onPlaceSelectedAction={handlePlaceSelected}
                              initialValue={profileForm.getValues().business_address_text || ""}
                            />
                            <div className="flex gap-2 mt-2">
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setShowMapDialog(true)}
                                disabled={profile.role !== 'business'}
                                title={profile.role !== 'business' ? 'Only business owners can pick location on map.' : undefined}
                              >
                                <MapPin className="mr-2 h-4 w-4" />Pick on Map
                              </Button>
                              {profileForm.watch('business_address_lat') && profileForm.watch('business_address_lng') && (
                                <span className="text-xs text-muted-foreground">Lat: {profileForm.watch('business_address_lat')}, Lng: {profileForm.watch('business_address_lng')}</span>
                              )}
                            </div>
                            {profile.role !== 'business' && (
                              <span className="text-xs text-gray-500 mt-1 flex items-center"><Lock className="h-3 w-3 mr-1" /> Store location can only be set by the business owner.</span>
                            )}
                          </div>
                          <FormField control={profileForm.control} name="business_address_text" render={({ field }) => <Input type="hidden" {...field} />} />
                          <FormField control={profileForm.control} name="business_address_lat" render={({ field }) => <Input type="hidden" value={field.value ?? ''} onChange={field.onChange} name={field.name} ref={field.ref} />} />
                          <FormField control={profileForm.control} name="business_address_lng" render={({ field }) => <Input type="hidden" value={field.value ?? ''} onChange={field.onChange} name={field.name} ref={field.ref} />} />
                          <FormMessage>{profileForm.formState.errors.business_address_text?.message || profileForm.formState.errors.business_address_lat?.message || profileForm.formState.errors.business_address_lng?.message}</FormMessage>
                        </FormItem>
                        <FormField control={profileForm.control} name="contact_person_name" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center"><User className="mr-2 h-4 w-4" />Contact Person</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )}
                        />
                        <FormField control={profileForm.control} name="contact_phone_number" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center"><Phone className="mr-2 h-4 w-4" />Contact Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                          )}
                        />
                         <DialogFooter className="pt-4">
                            <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isSubmittingProfile}>
                              {isSubmittingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                              Save Changes
                            </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                    {/* Map Dialog for picking location */}
                    <Dialog open={showMapDialog} onOpenChange={setShowMapDialog}>
                      <DialogContent className="max-w-4xl p-0">
                        <DialogHeader className="p-6 pb-4">
                          <DialogTitle>Pick Store Location on Map</DialogTitle>
                          <DialogDescription>Drag the marker to your exact store location.</DialogDescription>
                        </DialogHeader>
                        <div className="px-6 pb-6">
                          <StoreLocationPicker
                            initialLocation={profile.business_address_lat && profile.business_address_lng ? { lat: profile.business_address_lat, lng: profile.business_address_lng } : undefined}
                            onLocationSelectAction={handleMapSelect}
                            apiKey={googleMapsApiKey!}
                          />
                        </div>
                        <DialogFooter className="px-6 py-4 border-t border-gray-200">
                          <DialogClose asChild>
                            <Button type="button" variant="outline" onClick={() => setShowMapDialog(false)}>Cancel</Button>
                          </DialogClose>
                          <Button type="button" onClick={() => setShowMapDialog(false)}>Save Location</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </DialogContent>
                </Dialog>
            </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
            <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center"><UploadCloud className="mr-3 h-7 w-7 text-primary"/>List New Jewelry Item</CardTitle>
            <CardDescription>Add your jewelry pieces to the Sparkle Studio catalog. Provide an image URL for each item.</CardDescription>
            </CardHeader>
            <CardContent>
            <Form {...jewelryForm}>
                <form onSubmit={jewelryForm.handleSubmit(onJewelrySubmit)} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                    <FormField control={jewelryForm.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Jewelry Name</FormLabel><FormControl><Input placeholder="e.g., Diamond Solitaire Ring" {...field} /></FormControl><FormMessage /></FormItem>
                    )}
                    />
                    <FormField control={jewelryForm.control} name="image_url" render={({ field }) => (
                        <FormItem><FormLabel className="flex items-center"><ImageIcon className="mr-2 h-4 w-4" />Image URL</FormLabel><FormControl><Input type="url" placeholder="https://yourimagehost.com/image.png" {...field} /></FormControl><FormMessage /></FormItem>
                    )}
                    />
                </div>
                <FormField control={jewelryForm.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Detailed description of the piece..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>
                    )}
                />
                <div className="grid sm:grid-cols-2 gap-6">
                    <FormField control={jewelryForm.control} name="material" render={({ field }) => (
                        <FormItem><FormLabel>Material</FormLabel><FormControl><Input placeholder="e.g., 18k White Gold, Platinum" {...field} /></FormControl><FormMessage /></FormItem>
                    )}
                    />
                    <FormField control={jewelryForm.control} name="style" render={({ field }) => (
                        <FormItem><FormLabel>Style</FormLabel><FormControl><Input placeholder="e.g., Vintage, Modern, Art Deco" {...field} /></FormControl><FormMessage /></FormItem>
                    )}
                    />
                </div>
                <Button type="submit" className="btn-primary-sparkle" disabled={isSubmittingJewelry}>
                    {isSubmittingJewelry ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                    List This Item
                </Button>
                </form>
            </Form>
            </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <Building className="mx-auto h-12 w-12 text-primary mb-2" />
            <CardTitle className="font-headline text-2xl">Branch Management</CardTitle>
            <CardDescription>
              Expand your business by adding and managing branch locations. (Feature under development)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            <Button size="lg" className="btn-primary-sparkle w-full max-w-xs" onClick={() => toast({title: "Coming Soon!", description: "Feature to add branches is under development."})}>
              <PlusCircle className="mr-2 h-5 w-5" />
              Add New Branch Location
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <Separator />

      <div>
        <h2 className="font-headline text-2xl md:text-3xl font-semibold mb-6 flex items-center gap-2">
          <ListOrdered className="h-7 w-7 text-accent" /> Your Listed Items
        </h2>
        {isLoadingItems ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-72 w-full" />)}
          </div>
        ) : listedItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listedItems.map(item => (
              <JewelryCard
                key={item.id}
                id={item.id}
                name={item.name}
                type={'Assorted'}
                style={item.style}
                material={item.material}
                description={item.description}
                imageUrl={item.image_url}
                dataAiHint={`${item.style} ${item.name.split(' ')[0]}`}
              />
            ))}
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center py-12 border-dashed bg-muted/20">
            <PackageSearch className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">You haven't listed any jewelry items yet.</p>
            <p className="text-sm text-muted-foreground">Items you add will appear here.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
