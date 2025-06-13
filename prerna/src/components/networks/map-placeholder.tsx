import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

export function MapPlaceholder() {
  return (
    <Card className="w-full h-60 md:h-72 shadow-md border-dashed border-2 border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col items-center justify-center h-full text-center p-6">
        <MapPin size={48} className="mb-4 text-primary opacity-60" strokeWidth={1.5}/>
        <p className="text-lg font-semibold text-primary mb-1">Store Locations Map</p>
        <p className="text-sm text-muted-foreground">
          Use the "Find Nearby Stores" button to locate stores. An interactive map displaying them would appear here.
        </p>
        <p className="text-xs text-muted-foreground mt-3">(Google Maps API integration pending)</p>
      </CardContent>
    </Card>
  );
}
