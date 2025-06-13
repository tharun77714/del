"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, MarkerF, useLoadScript } from '@react-google-maps/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const libraries: ["places"] = ["places"];

interface StoreLocationPickerProps {
  initialLocation?: { lat: number; lng: number };
  onLocationSelectAction: (location: { lat: number; lng: number }) => void;
  apiKey: string; // Ensure API key is passed
}

export function StoreLocationPicker({ initialLocation, onLocationSelectAction, apiKey }: StoreLocationPickerProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  });

  const [marker, setMarker] = useState<{ lat: number; lng: number } | undefined>(initialLocation);
  const [loadingGeolocation, setLoadingGeolocation] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const { toast } = useToast();

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    mapRef.current = map;
    if (marker) {
      map.setCenter(marker);
      map.setZoom(15);
    } else {
      // Default to a general center if no initial location
      map.setCenter({ lat: 20.5937, lng: 78.9629 }); // Center of India
      map.setZoom(5);
    }
  }, [marker]);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    mapRef.current = null;
  }, []);

  useEffect(() => {
    if (isLoaded && !initialLocation && !loadingGeolocation) {
      handleUseMyLocation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, initialLocation]); // Only run on isLoaded and initialLocation change


  const handleUseMyLocation = () => {
    setLoadingGeolocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const newLocation = { lat: latitude, lng: longitude };
          setMarker(newLocation);
          onLocationSelectAction(newLocation);
          if (mapRef.current) {
            mapRef.current.setCenter(newLocation);
            mapRef.current.setZoom(15);
          }
          setLoadingGeolocation(false);
        },
        (error) => {
          toast({
            title: "Geolocation Error",
            description: "Could not retrieve your current location. Please ensure location services are enabled.",
            variant: "destructive",
          });
          console.error("Geolocation error:", error);
          setLoadingGeolocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      toast({
        title: "Geolocation Not Supported",
        description: "Your browser does not support geolocation.",
        variant: "destructive",
      });
      setLoadingGeolocation(false);
    }
  };

  const onMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newLocation = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setMarker(newLocation);
      onLocationSelectAction(newLocation);
    }
  };

  if (loadError) return <div className="text-destructive">Error loading maps</div>;
  if (!isLoaded) return <Skeleton className="h-96 w-full" />;

  const defaultCenter = marker ? marker : { lat: 20.5937, lng: 78.9629 }; // Center of India if no marker

  return (
    <div className="space-y-4">
      <Button
        type="button"
        onClick={handleUseMyLocation}
        disabled={loadingGeolocation}
        className="flex items-center"
      >
        {loadingGeolocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
        Use My Current Location
      </Button>

      <GoogleMap
        mapContainerStyle={{ height: '400px', width: '100%' }}
        center={defaultCenter}
        zoom={marker ? 15 : 5}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={(e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            const newLocation = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            setMarker(newLocation);
            onLocationSelectAction(newLocation);
          }
        }}
      >
        {marker && (
          <MarkerF
            position={marker}
            draggable={true}
            onDragEnd={onMarkerDragEnd}
            icon={{
                url: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png", // Fallback to a general marker icon
                scaledSize: new window.google.maps.Size(25, 41), // Standard marker size
                anchor: new window.google.maps.Point(12, 41) // Center the marker
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
