"use client";

import React from 'react';
import Autocomplete from 'react-google-autocomplete';
import { Input } from '@/components/ui/input'; // Using ShadCN input for styling consistency
import { useLoadScript } from '@react-google-maps/api'; // Import useLoadScript
import { cn } from '@/lib/utils';

interface AddressAutocompleteInputProps {
  apiKey: string | undefined;
  onPlaceSelectedAction: (placeDetails: { address: string; latitude: number; longitude: number } | null) => void;
  initialValue?: string;
  className?: string;
}

export function AddressAutocompleteInput({ apiKey, onPlaceSelectedAction, initialValue = "", className }: AddressAutocompleteInputProps) {
  const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ['places'];
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || "",
    libraries,
    preventGoogleFontsLoading: true,
  });

  if (!apiKey || apiKey === '') {
    return (
      <div className={className}>
        <Input
          type="text"
          placeholder="Google Maps API Key missing"
          disabled
          className="border-destructive text-destructive placeholder-destructive/70"
        />
        <p className="text-xs text-destructive mt-1">
          Address autocomplete is disabled. Please configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={className}>
        <Input
          type="text"
          placeholder="Error loading map services"
          disabled
          className="border-destructive text-destructive"
        />
        <p className="text-xs text-destructive mt-1">
          Error loading Google Maps. Please check your network connection or API key.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={className}>
        <Input
          type="text"
          placeholder="Loading address services..."
          disabled
        />
        <p className="text-xs text-muted-foreground mt-1">
          Please wait while address services load.
        </p>
      </div>
    );
  }

  return (
    <Autocomplete
      onPlaceSelected={(place) => {
        if (place && place.formatted_address && place.geometry && place.geometry.location) {
          onPlaceSelectedAction({
            address: place.formatted_address,
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
          });
        } else {
          onPlaceSelectedAction(null); // Or handle error appropriately
        }
      }}
      options={{
        types: ['geocode'], // Allow both cities and addresses
        // Remove country restriction for global search
      }}
      defaultValue={initialValue}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      placeholder="Start typing your business address..."
    />
  );
}
