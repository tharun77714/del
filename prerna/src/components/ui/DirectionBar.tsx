'use client';

import { Button } from "@/components/ui/button";

export function DirectionBar() {
  const handleGetDirections = () => {
    const storeLocation = "Your Store Address, City, State"; // Replace with actual store address or coordinates
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(storeLocation)}`;
    window.open(googleMapsUrl, "_blank");
  };

  return (
    <div className="mt-8 text-center">
      <Button onClick={handleGetDirections} className="px-6 py-3 text-lg">
        Get Directions to Our Store
      </Button>
    </div>
  );
} 