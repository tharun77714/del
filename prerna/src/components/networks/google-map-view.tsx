
"use client";

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { GoogleMap, useLoadScript, MarkerF, InfoWindowF } from '@react-google-maps/api';
import type { Store as StoreType } from './store-card'; // Assuming this is the correct type for stores
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MapPin, AlertTriangle, ExternalLink } from 'lucide-react';

const mapContainerStyle = {
  width: '100%',
  height: '100%', // Fill the container provided by parent
  minHeight: '350px', // Minimum height
  borderRadius: '0.5rem', // Match ShadCN card radius
};

// A default center (e.g., a central point if no specific location is given)
const defaultCenter = { lat: 20.5937, lng: 78.9629 }; // Centered on India
const defaultZoom = 5;
const activeZoom = 13;

interface GoogleMapViewProps {
  stores: StoreType[];
  center?: { lat: number; lng: number } | null; // Center can be explicitly passed
  searchActive: boolean; // To know if a search (GPS or Address) initiated the view
}

const libraries: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ['places'];

export function GoogleMapView({ stores, center: explicitCenter, searchActive }: GoogleMapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || "",
    libraries,
    preventGoogleFontsLoading: true,
  });

  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null);

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    // Optional: Fit bounds to markers if many stores and no explicit center
    if (stores.length > 1 && !explicitCenter && mapInstance) {
      const bounds = new window.google.maps.LatLngBounds();
      stores.forEach(store => {
        if (store.latitude && store.longitude) {
          bounds.extend(new window.google.maps.LatLng(store.latitude, store.longitude));
        }
      });
      if (!bounds.isEmpty()) {
        mapInstance.fitBounds(bounds);
        // Adjust zoom after fitBounds if it's too close
        const listener = window.google.maps.event.addListener(mapInstance, 'idle', function() {
            if (mapInstance.getZoom()! > 15) mapInstance.setZoom(15);
            window.google.maps.event.removeListener(listener);
        });
      }
    }
  }, [stores, explicitCenter]);

  const mapCenter = useMemo(() => {
    if (explicitCenter) return explicitCenter;
    if (stores.length === 1 && stores[0].latitude && stores[0].longitude) {
      return { lat: stores[0].latitude, lng: stores[0].longitude };
    }
    // If multiple stores and no explicit center, onMapLoad with fitBounds handles it.
    // If no stores and no explicitCenter, use default.
    return defaultCenter;
  }, [explicitCenter, stores]);

  const mapZoom = useMemo(() => {
    if (explicitCenter || (stores.length === 1 && searchActive)) return activeZoom;
    return defaultZoom;
  }, [explicitCenter, stores, searchActive]);


  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Map Error</AlertTitle>
        <AlertDescription>Could not load Google Maps. Please check your API key or internet connection.</AlertDescription>
      </Alert>
    );
  }

  if (!isLoaded || !apiKey) {
    return (
      <div style={mapContainerStyle} className="bg-muted flex flex-col items-center justify-center">
        {!apiKey && (
          <Alert variant="destructive" className="mb-4 w-full max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configuration Error</AlertTitle>
            <AlertDescription>Google Maps API Key is missing. The map cannot be loaded.</AlertDescription>
          </Alert>
        )}
        {apiKey && <Skeleton className="w-full h-full rounded-lg" />}
         {apiKey && <p className="mt-2 text-sm text-muted-foreground">Loading Map...</p>}
      </div>
    );
  }

  return (
    <div style={mapContainerStyle}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%', borderRadius: 'inherit' }}
        center={mapCenter}
        zoom={mapZoom}
        onLoad={onMapLoad}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_TOP },
        }}
      >
        {stores.map((store) => (
          store.latitude && store.longitude ? (
            <MarkerF
              key={store.id}
              position={{ lat: store.latitude, lng: store.longitude }}
              title={store.name}
              onClick={() => setSelectedStore(store)}
              icon={{
                url: '/gem-marker.svg', // Custom marker icon (add this to /public)
                scaledSize: new window.google.maps.Size(30, 30),
              }}
            />
          ) : null
        ))}

        {selectedStore && selectedStore.latitude && selectedStore.longitude && (
          <InfoWindowF
            position={{ lat: selectedStore.latitude, lng: selectedStore.longitude }}
            onCloseClick={() => setSelectedStore(null)}
            options={{ pixelOffset: new window.google.maps.Size(0, -30) }}
          >
            <div className="p-1 max-w-xs text-foreground">
              <h3 className="font-semibold text-base mb-1">{selectedStore.name}</h3>
              <p className="text-xs text-muted-foreground mb-2">{selectedStore.address}</p>
              <Button variant="link" size="sm" asChild className="p-0 h-auto text-primary">
                <Link href={`/dashboard/store/${selectedStore.id}`}>
                  View Store <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}

