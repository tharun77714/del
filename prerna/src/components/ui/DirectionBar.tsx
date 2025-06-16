'use client';

import { Button } from "@/components/ui/button";

interface DirectionBarProps {
  latitude: number;
  longitude: number;
  storeName: string;
  storeAddress: string;
}

export function DirectionBar({ latitude, longitude, storeName, storeAddress }: DirectionBarProps) {
  const handleGetDirections = () => {
    const destination = `${latitude},${longitude}`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    window.open(url, "_blank");
  };

  return (
    <Button onClick={handleGetDirections} className="w-full sm:w-auto">
      Get Directions to Our Store
    </Button>
  );
} 