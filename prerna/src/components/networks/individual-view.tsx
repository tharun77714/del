"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { JewelryCard } from './jewelry-card';
// import { MapPlaceholder } from './map-placeholder'; // Replaced by GoogleMapView
import { GoogleMapView } from './google-map-view'; // Import the new map component
import { Search, Lightbulb, GalleryVertical, Compass, Loader2, Store as StoreIcon, LocateFixed, AlertTriangle, Building, Map } from 'lucide-react'; // Added Map icon
import type { SuggestJewelryOutput } from '@/ai/flows/suggest-jewelry';
import { suggestJewelryAction } from '@/lib/actions/ai-actions';
import { getRegisteredBusinesses } from '@/lib/actions/supabase-actions'; 
import { useToast } from "@/hooks/use-toast"
import { Separator } from '../ui/separator';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { getDistance, cn } from '@/lib/utils';
import type { Store as StoreType } from './store-card'; 
import { StoreCard } from './store-card';
import { useLoadScript } from '@react-google-maps/api'; // Import useLoadScript
import { AddressAutocompleteInput } from '@/components/common/address-autocomplete-input';
import type { Profile } from '@/contexts/AuthContext'; // Ensure correct Profile type import
import supabase from '@/lib/supabaseClient'; // Import supabase client
import { calculateStoreRating } from '@/lib/utils/ratings'; // Import calculateStoreRating
import { useAuth } from '@/hooks/useAuth'; // Import useAuth
import type { JewelryItem } from './jewelry-card'; // Import JewelryItem type

const mockFeaturedJewelry = [
  { id: crypto.randomUUID(), name: 'Elegant Diamond Necklace', type: 'Necklace', style: 'Classic', material: 'Diamond, White Gold', description: 'A timeless piece for special occasions.', imageUrl: 'https://placehold.co/600x400.png', dataAiHint: 'diamond necklace' },
  { id: crypto.randomUUID(), name: 'Bohemian Feather Earrings', type: 'Earrings', style: 'Boho', material: 'Silver, Feather', description: 'Lightweight and stylish for a free spirit.', imageUrl: 'https://placehold.co/600x400.png', dataAiHint: 'boho earrings' },
  { id: crypto.randomUUID(), name: 'Minimalist Gold Bangle', type: 'Bracelet', style: 'Minimalist', material: 'Gold', description: 'Sleek and modern, perfect for everyday wear.', imageUrl: 'https://placehold.co/600x400.png', dataAiHint: 'gold bangle' },
  { id: crypto.randomUUID(), name: 'Vintage Sapphire Ring', type: 'Ring', style: 'Vintage', material: 'Sapphire, Platinum', description: 'An exquisite ring with a touch of history.', imageUrl: 'https://placehold.co/600x400.png', dataAiHint: 'sapphire ring' },
];

const NEARBY_RADIUS_KM = 50;


export function IndividualNetworkView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<SuggestJewelryOutput['suggestions']>([]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null); // Changed to lat/lng
  const [searchedLocationCoords, setSearchedLocationCoords] = useState<{ lat: number; lng: number } | null>(null); // Changed to lat/lng
  
  const [allRegisteredStores, setAllRegisteredStores] = useState<StoreType[]>([]);
  const [displayedStores, setDisplayedStores] = useState<StoreType[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [activeSearchType, setActiveSearchType] = useState<'ai' | 'store_keyword' | 'store_gps' | 'store_address_radius' | 'none'>('none');
  const [searchOrigin, setSearchOrigin] = useState<'manual' | 'autocomplete_address'>('manual');
  const [userFavorites, setUserFavorites] = useState<string[]>([]); // New state for user favorites (jewelry)
  const [userFavoritedStores, setUserFavoritedStores] = useState<string[]>([]); // New state for user favorited stores

  const { toast } = useToast();
  const { user } = useAuth(); // Get current user from AuthContext
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ['places'];

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: googleMapsApiKey || "",
    libraries,
    preventGoogleFontsLoading: true,
  });

  // Memoized list of AI suggested jewelry items with generated IDs
  const aiJewelryItems: JewelryItem[] = useMemo(() => {
    return aiSuggestions.map((suggestion, index) => ({
      id: crypto.randomUUID(), // Generate a UUID for each AI suggestion
      name: `${suggestion.style} ${suggestion.type}`,
      type: suggestion.type,
      style: suggestion.style,
      material: suggestion.material,
      description: suggestion.description,
      imageUrl: `https://placehold.co/300x200.png`, // Assuming a default placeholder for AI generated items
      // dataAiHint is not provided by aiSuggestions, so omit it
    }));
  }, [aiSuggestions]);

  const transformProfileToStore = (profile: Profile): StoreType => {
    return {
      id: profile.id,
      name: profile.business_name || 'Unnamed Business',
      address: profile.business_address_text || 'Address not available',
      type: profile.business_type || 'N/A',
      latitude: profile.business_address_lat || 0, // Keep these for store card/list
      longitude: profile.business_address_lng || 0, // Keep these for store card/list
      distance: undefined,
      avgRating: 5, // Default for now, will be overwritten
      reviewCount: 0, // Default for now, will be overwritten
    };
  };
  
  useEffect(() => {
    const fetchStores = async () => {
      setIsLoadingStores(true);
      const { data: businessProfiles, error } = await getRegisteredBusinesses();
      if (error) {
        toast({
          title: "Store Loading Error",
          description: `Could not load registered businesses: ${error.message}. RLS policies might need adjustment.`,
          variant: "destructive"
        });
        setAllRegisteredStores([]);
        setDisplayedStores([]);
      } else if (businessProfiles) {
        const storesWithRatings = await Promise.all(businessProfiles.map(async (profile) => {
          const store = transformProfileToStore(profile);
          const { avgRating, reviewCount } = await calculateStoreRating(supabase, profile.id);
          return { ...store, avgRating, reviewCount };
        }));
        setAllRegisteredStores(storesWithRatings);
        setDisplayedStores(storesWithRatings); 
      } else {
        setAllRegisteredStores([]);
        setDisplayedStores([]);
      }
      setIsLoadingStores(false);
    };
    fetchStores();
  }, [toast]);

  // New useEffect to fetch user favorites
  useEffect(() => {
    const fetchFavorites = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('user_favorites')
          .select('item_id')
          .eq('user_id', user.id);

        if (error) {
          console.error("Error fetching favorites:", error);
          toast({
            title: "Error loading favorites",
            description: "Could not load your favorited items.",
            variant: "destructive",
          });
        } else if (data) {
          setUserFavorites(data.map(f => f.item_id));
        }
      }
    };
    fetchFavorites();
  }, [user, toast]);

  // New useEffect to fetch user favorited stores
  useEffect(() => {
    const fetchFavoritedStores = async () => {
      if (!user) {
        setUserFavoritedStores([]);
        return;
      }
      const { data, error } = await supabase
        .from('user_favorite_stores')
        .select('store_id')
        .eq('user_id', user.id);

      if (error) {
        console.error("Error fetching favorited stores:", error);
        toast({
          title: "Error loading favorite stores",
          description: "Could not load your favorited stores.",
          variant: "destructive",
        });
      } else if (data) {
        setUserFavoritedStores(data.map(f => f.store_id));
      }
    };
    fetchFavoritedStores();
  }, [user, toast]);

  const handleToggleFavorite = async (item: JewelryItem, isCurrentlyFavorited: boolean) => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to add items to your favorites.",
        variant: "default",
      });
      return;
    }

    if (isCurrentlyFavorited) {
      // Remove from favorites
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', item.id);

      if (error) {
        console.error("Error removing favorite:", error);
        toast({
          title: "Error removing favorite",
          description: "Could not remove item from favorites.",
          variant: "destructive",
        });
      } else {
        setUserFavorites(prev => prev.filter(id => id !== item.id));
        toast({ title: "Removed from favorites", description: "Item successfully removed from your favorites.", variant: "default" });
      }
    } else {
      // Add to favorites - First, upsert the item details into jewelry_items table
      const { error: upsertError } = await supabase
        .from('jewelry_items')
        .upsert({
          id: item.id,
          name: item.name,
          style: item.style,
          material: item.material,
          description: item.description,
          image_url: item.imageUrl,
        }, { onConflict: 'id' }); // Conflict on 'id' to update if exists

      if (upsertError) {
        console.error("Error upserting jewelry item:", upsertError.message); // Log the specific error message
        toast({
          title: "Error saving item details",
          description: `Could not save item details for favoriting: ${upsertError.message}`,
          variant: "destructive",
        });
        return;
      }

      // Then, add to user_favorites
      const { error: favoriteError } = await supabase
        .from('user_favorites')
        .insert({ user_id: user.id, item_id: item.id });

      if (favoriteError) {
        console.error("Error adding favorite:", favoriteError);
        toast({
          title: "Error adding favorite",
          description: "Could not add item to favorites.",
          variant: "destructive",
        });
      } else {
        setUserFavorites(prev => [...prev, item.id]);
        toast({ title: "Added to favorites", description: "Item successfully added to your favorites!", variant: "default" });
      }
    }
  };

  const handleSearchSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!searchTerm.trim()) {
      toast({ title: "Search term empty", description: "Please enter what you're looking for.", variant: "destructive" });
      return;
    }

    setIsLoadingAi(true);
    setAiSuggestions([]);
    setLocationError(null); 
    
    const currentSearchOrigin = searchOrigin;
    setSearchOrigin('manual'); 

    const lowerSearchTerm = searchTerm.toLowerCase();

    if (currentSearchOrigin === 'autocomplete_address' && searchedLocationCoords) {
      setActiveSearchType('store_address_radius');
      setUserLocation(null); // Clear GPS location if address search is used
      if (allRegisteredStores.length === 0 && !isLoadingStores) {
        toast({ title: "No Registered Stores Found", description: "No businesses are currently listed in the system to search within." });
        setDisplayedStores([]);
      } else {
        const foundStores = allRegisteredStores.map(store => {
            const distance = getDistance(searchedLocationCoords.lat, searchedLocationCoords.lng, store.latitude, store.longitude);
            return { ...store, distance };
          }).filter(store => store.distance <= NEARBY_RADIUS_KM)
          .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        
        setDisplayedStores(foundStores);
        if (foundStores.length > 0) {
          toast({
            title: "Nearby Stores Found",
            description: `Found ${foundStores.length} registered store(s) within ${NEARBY_RADIUS_KM}km of "${searchTerm}".`,
          });
        } else {
          toast({
            title: "No Stores Found Nearby",
            description: `No registered stores found within ${NEARBY_RADIUS_KM}km of "${searchTerm}".`,
          });
        }
      }
    } else {
        let isStoreSearchIntent = false;
        const storeKeywords = ['store', 'shop', 'jeweler', 'near', 'in ', 'street', 'road', 'ave', 'avenue', 'blvd', 'boulevard', 'ln', 'lane', 'dr', 'drive', 'rd', 'market', 'center', 'plaza'];
        isStoreSearchIntent = storeKeywords.some(keyword => lowerSearchTerm.includes(keyword)) ||
                              allRegisteredStores.some(store => store.name.toLowerCase().includes(lowerSearchTerm) || store.address.toLowerCase().includes(lowerSearchTerm)) ||
                              (/\d/.test(lowerSearchTerm) && /[a-zA-Z]/.test(lowerSearchTerm) && lowerSearchTerm.length > 5);

        if (isStoreSearchIntent) {
          setActiveSearchType('store_keyword');
          setUserLocation(null); 
          setSearchedLocationCoords(null);
          const foundStores = allRegisteredStores.filter(store => 
            store.name.toLowerCase().includes(lowerSearchTerm) || 
            store.address.toLowerCase().includes(lowerSearchTerm)
          ).map(s => ({...s, distance: undefined })); 
          setDisplayedStores(foundStores);
          
          if (foundStores.length > 0) {
            toast({
              title: "Store Search Results",
              description: `Found ${foundStores.length} registered store(s) matching "${searchTerm}".`,
            });
          } else {
            toast({
              title: "No Stores Found",
              description: `No registered stores match "${searchTerm}".`,
            });
          }
        } else { 
          setActiveSearchType('ai');
          setUserLocation(null); 
          setSearchedLocationCoords(null);
          setDisplayedStores(allRegisteredStores.map(s => ({...s, distance: undefined }))); 
          try {
            const result = await suggestJewelryAction({ searchQuery: searchTerm });
            if (result && result.suggestions) {
              setAiSuggestions(result.suggestions);
              if (result.suggestions.length === 0) {
                toast({ title: "No Jewelry Suggestions Found", description: "Try a different search term for jewelry." });
              }
            } else {
              toast({ title: "AI Suggestion Error", description: "Could not fetch jewelry suggestions.", variant: "destructive" });
            }
          } catch (error) {
            console.error("AI Suggestion Error:", error);
            toast({ title: "AI Suggestion Error", description: "An unexpected error occurred while fetching jewelry suggestions.", variant: "destructive" });
          }
        }
    }
    setIsLoadingAi(false);
  };

  const handleFindNearbyStores = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      toast({ title: "Geolocation Error", description: "Geolocation is not supported by your browser.", variant: "destructive" });
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    setAiSuggestions([]); 
    setActiveSearchType('store_gps');
    setSearchedLocationCoords(null); // Clear address search coords
    setSearchTerm(""); // Clear search term

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        if (allRegisteredStores.length === 0 && !isLoadingStores) {
            toast({ title: "No Registered Stores", description: "No businesses are currently listed in the system to search." });
            setDisplayedStores([]);
            setIsLocating(false);
            return;
        }
        
        const storesFound = allRegisteredStores.map(store => {
          const distance = getDistance(latitude, longitude, store.latitude, store.longitude);
          return { ...store, distance };
        }).filter(store => store.distance <= NEARBY_RADIUS_KM)
          .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

        setDisplayedStores(storesFound);
        setIsLocating(false);
        if (storesFound.length > 0) {
          toast({ title: "Nearby Registered Stores Found", description: `Found ${storesFound.length} registered store(s) within ${NEARBY_RADIUS_KM}km.` });
        } else {
          toast({ title: "No Nearby Registered Stores", description: `No registered stores found within ${NEARBY_RADIUS_KM}km of your location.` });
        }
      },
      (error) => {
        let message = "Could not get your location.";
        if (error.code === error.PERMISSION_DENIED) {
          message = "Permission denied. Please allow location access.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Location information is unavailable.";
        } else if (error.code === error.TIMEOUT) {
          message = "The request to get user location timed out.";
        }
        setLocationError(message);
        toast({ title: "Geolocation Error", description: message, variant: "destructive" });
        setIsLocating(false);
        setUserLocation(null);
        setDisplayedStores(allRegisteredStores); // Revert to showing all stores on geolocation error
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setAiSuggestions([]);
    setUserLocation(null);
    setSearchedLocationCoords(null);
    setLocationError(null);
    setActiveSearchType('none');
    setDisplayedStores(allRegisteredStores); // Reset to all stores
  };

  const isLoadingCombinedState = isLoadingAi || isLocating || isLoadingStores;
  
  const currentLoadingMessage = useMemo(() => {
    if (isLoadingStores) return "Loading Registered Stores...";
    if (isLocating) return "Getting your location & finding registered stores...";
    if (isLoadingAi && (activeSearchType === 'store_keyword' || activeSearchType === 'store_address_radius')) return "Searching Registered Stores...";
    if (isLoadingAi && activeSearchType === 'ai') return "AI Suggestions Loading...";
    return "Loading...";
  }, [isLoadingStores, isLocating, isLoadingAi, activeSearchType]);

  const registeredStoresTitleDescription = useMemo(() => {
    if (activeSearchType === 'store_gps' && userLocation) {
        return `Showing stores within ${NEARBY_RADIUS_KM}km of your current location, sorted by distance.`;
    }
    if (activeSearchType === 'store_address_radius' && searchedLocationCoords) {
        return `Showing stores within ${NEARBY_RADIUS_KM}km of "${searchTerm}", sorted by distance.`;
    }
    if (activeSearchType === 'store_keyword') {
        return `Showing registered stores matching "${searchTerm}".`;
    }
    return "Browse all registered businesses. Click a store to see their items. Use search or GPS to filter.";
  }, [activeSearchType, userLocation, searchedLocationCoords, searchTerm]);

  const mapCenter = useMemo(() => {
    if (activeSearchType === 'store_gps' && userLocation) return userLocation;
    if (activeSearchType === 'store_address_radius' && searchedLocationCoords) return searchedLocationCoords;
    // If only one store is displayed from keyword search, center on it.
    if (activeSearchType === 'store_keyword' && displayedStores.length === 1 && displayedStores[0].latitude && displayedStores[0].longitude) {
        return { lat: displayedStores[0].latitude, lng: displayedStores[0].longitude };
    }
    return null; // Let GoogleMapView handle default or fitBounds
  }, [activeSearchType, userLocation, searchedLocationCoords, displayedStores]);
  
  const isMapSearchActive = activeSearchType === 'store_gps' || activeSearchType === 'store_address_radius' || (activeSearchType === 'store_keyword' && displayedStores.length > 0);

  // New function for toggling store favorite status
  const handleToggleStoreFavorite = async (store: StoreType, isCurrentlyFavorited: boolean) => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to add stores to your favorites.",
        variant: "default",
      });
      return;
    }

    if (isCurrentlyFavorited) {
      // Remove from favorites
      const { error } = await supabase
        .from('user_favorite_stores')
        .delete()
        .eq('user_id', user.id)
        .eq('store_id', store.id);

      if (error) {
        console.error("Error removing favorite store:", error);
        toast({
          title: "Error removing favorite store",
          description: "Could not remove store from favorites.",
          variant: "destructive",
        });
      } else {
        setUserFavoritedStores(prev => prev.filter(id => id !== store.id));
        toast({ title: "Removed from favorites", description: "Store successfully removed from your favorites.", variant: "default" });
      }
    } else {
      // Add to favorites
      const { error } = await supabase
        .from('user_favorite_stores')
        .insert({ user_id: user.id, store_id: store.id });

      if (error) {
        console.error("Error adding favorite store:", error);
        toast({
          title: "Error adding favorite store",
          description: "Could not add store to favorites.",
          variant: "destructive",
        });
      } else {
        setUserFavoritedStores(prev => [...prev, store.id]);
        toast({ title: "Added to favorites", description: "Store successfully added to your favorites!", variant: "default" });
      }
    }
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-6 w-6 text-primary" />
            <CardTitle className="font-headline text-2xl">Find Your Sparkle</CardTitle>
          </div>
          <CardDescription>
            Search for jewelry (e.g., "gold necklace"), or type an address/place to find registered stores within {NEARBY_RADIUS_KM}km. Use "Find Nearby Stores" for GPS-based search.
          </CardDescription>
           {!googleMapsApiKey && (
            <p className="text-xs text-destructive mt-1">
              Address autocomplete for stores is disabled. Please configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2 mb-2">
            {isLoaded ? (
              <AddressAutocompleteInput
                apiKey={googleMapsApiKey}
                onPlaceSelectedAction={(place) => {
                  if (place) {
                    setSearchTerm(place.address);
                    setSearchedLocationCoords({ lat: place.latitude, lng: place.longitude });
                    setSearchOrigin('autocomplete_address');
                  }
                }}
                initialValue={searchTerm}
                onInputChange={setSearchTerm}
                className="flex-grow"
              />
            ) : (
              <Skeleton className="h-10 w-full" />
            )}
            <Button type="submit" disabled={isLoadingCombinedState} className="btn-primary-sparkle">
              {(isLoadingAi && !isLocating && !isLoadingStores) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Search
            </Button>
          </form>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleFindNearbyStores} disabled={isLoadingCombinedState} variant="outline" className="w-full sm:w-auto">
              {isLocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-2 h-4 w-4" />}
              Find Nearby Registered Stores (GPS)
            </Button>
            {(searchTerm.trim() !== '' || activeSearchType !== 'none') && (
              <Button onClick={handleClearSearch} disabled={isLoadingCombinedState} variant="ghost" className="w-full sm:w-auto">
                Clear Search
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoadingCombinedState && activeSearchType !== 'ai' && ( 
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
              {currentLoadingMessage}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-60 w-full rounded-lg" />)}
          </CardContent>
        </Card>
      )}
      
      {locationError && !isLocating && (
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Location Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{locationError}</p>
            <p className="text-sm text-muted-foreground mt-1">Please ensure location services are enabled and permissions are granted for this site.</p>
          </CardContent>
        </Card>
      )}

      {!isLoadingCombinedState && activeSearchType === 'ai' && aiSuggestions.length > 0 && (
        <Card className="bg-primary/5">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2 text-xl">
              <Lightbulb className="h-6 w-6 text-primary" />
              AI-Powered Suggestions for "{searchTerm}"
            </CardTitle>
            <CardDescription>Our AI thinks you might like these styles and materials. These are general suggestions and not linked to specific stores or inventory.</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoadingAi && activeSearchType === 'ai' ? (
                <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mr-3" />
                    <p>Fetching AI suggestions...</p>
                </div>
             ) : (
                <ScrollArea className="w-full">
                <div className="flex space-x-4 pb-4">
                    {aiJewelryItems.map((item) => (
                    <JewelryCard 
                        key={item.id} 
                        {...item} 
                        className="min-w-[280px] md:min-w-[320px]"
                        isFavorited={userFavorites.includes(item.id)} 
                        onToggleFavorite={(clickedItem, isCurrentlyFavorited) => handleToggleFavorite(clickedItem, isCurrentlyFavorited)} 
                    />
                    ))}
                </div>
                <ScrollBar orientation="horizontal" />
                </ScrollArea>
             )}
          </CardContent>
        </Card>
      )}
      
      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2 text-xl">
                <Building className="h-6 w-6 text-primary" />
                Registered Stores
                </CardTitle>
                <CardDescription>
                 {registeredStoresTitleDescription}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingStores ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1,2,3,4].map(i => <Skeleton key={i} className="h-40 w-full rounded-lg" />)}
                    </div>
                ) : displayedStores.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {displayedStores.map((store) => (
                            <Link href={`/dashboard/store/${store.id}`} key={store.id} legacyBehavior>
                                <a className="block hover:opacity-90 transition-opacity">
                                    <StoreCard 
                                        store={store} 
                                        isFavorited={userFavoritedStores.includes(store.id)} 
                                        onToggleFavorite={(clickedStore, isCurrentlyFavorited) => handleToggleStoreFavorite(clickedStore, isCurrentlyFavorited)}
                                    />
                                </a>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-8">
                        No registered businesses found matching your current criteria.
                        New businesses can register via the 'Business' mode.
                        <br />
                        If you expect businesses to be listed, please ensure RLS policies on the 'profiles' table in Supabase allow read access for 'business' roles.
                    </p>
                )}
            </CardContent>
          </Card>

          {activeSearchType !== 'ai' && ( 
            <Card>
                <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2 text-xl">
                    <GalleryVertical className="h-6 w-6 text-accent" />
                    Featured Jewelry Gallery
                </CardTitle>
                <CardDescription>Browse a selection of beautiful jewelry pieces from our general collection (not store specific).</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mockFeaturedJewelry.map(item => (
                    <JewelryCard 
                        key={item.id} 
                        {...item} 
                        isFavorited={userFavorites.includes(item.id)} 
                        onToggleFavorite={(clickedItem, isCurrentlyFavorited) => handleToggleFavorite(clickedItem, isCurrentlyFavorited)} 
                    />
                ))}
                </CardContent>
            </Card>
          )}
        </div>
        
        <div className="lg:col-span-1 space-y-8">
          <Card className="h-full"> {/* Ensure Card takes height */}
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2 text-xl">
                <Map className="h-6 w-6 text-primary" /> {/* Changed to Map icon */}
                Local Store Map
              </CardTitle>
              <CardDescription>
                {
                  activeSearchType === 'store_gps' && userLocation ? `Map showing stores near your GPS location.` :
                  activeSearchType === 'store_address_radius' && searchedLocationCoords ? `Map showing stores near "${searchTerm}".` :
                  (activeSearchType === 'store_keyword' && displayedStores.length > 0) ? `Map showing locations for "${searchTerm}".` :
                  `Use "Find Nearby Stores" (GPS) or search by address to see stores on the map.`
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[calc(100%-8rem)]"> {/* Adjust height dynamically */}
              <GoogleMapView stores={displayedStores.filter(s => s.latitude && s.longitude)} center={mapCenter} searchActive={isMapSearchActive} />
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
