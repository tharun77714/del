import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { useLoadScript, GoogleMap, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { Skeleton } from '@/components/ui/skeleton';

interface StoreDirectionsMapProps {
  storeName: string;
  storeLat: number;
  storeLng: number;
}

export const StoreDirectionsMap: React.FC<StoreDirectionsMapProps> = ({ storeName, storeLat, storeLng }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ['places'];

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || "",
    libraries,
    preventGoogleFontsLoading: true,
  });

  useEffect(() => {
    if (loadError) {
      setError('Failed to load Google Maps. Please check your API key and internet connection.');
      setLoading(false);
      return;
    }
    if (isLoaded) {
      setLoading(false);
    }
  }, [isLoaded, loadError]);

  const handleGetFullDirections = () => {
    const origin = '';
    const destination = `${storeLat},${storeLng}`;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    window.open(url, '_blank');
  };

  return (
    <div className="w-full flex flex-col md:flex-row gap-4">
      <div className="w-full flex flex-col">
        <div ref={mapRef} className="h-80 w-full rounded-lg shadow border">
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%', borderRadius: 'inherit' }}
              center={{ lat: storeLat, lng: storeLng }}
              zoom={13}
              onLoad={map => setMapInstance(map)}
              onUnmount={() => setMapInstance(null)}
              options={{
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_TOP },
              }}
            >
              {storeLat && storeLng && (
                <MarkerF
                  position={{ lat: storeLat, lng: storeLng }}
                  label={{
                    text: storeName,
                    className: 'map-label',
                    color: '#000',
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}
                  draggable={false}
                  title={storeName}
                />
              )}
            </GoogleMap>
          ) : (
            <Skeleton className="h-80 w-full rounded-lg" />
          )}
        </div>
        {loading && <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">Loading map...</div>}
        {error && <div className="text-red-500 mt-2">{error}</div>}

        {storeLat !== 0 && storeLng !== 0 && !loading && !error && (
          <Button onClick={handleGetFullDirections} variant="outline" className="mt-4 w-full">
            <ExternalLink className="mr-2 h-4 w-4" /> Get Full Directions on Google Maps
          </Button>
        )}
      </div>
    </div>
  );
};

export default StoreDirectionsMap;
