"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Tag, Navigation, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import supabase from '@/lib/supabaseClient';
import { calculateStoreRating } from '@/lib/utils/ratings';

export interface Store {
  id: string;
  name: string;
  address: string;
  type: string; // e.g., Boutique, Chain, Artisan Collective
  latitude: number;
  longitude: number;
  distance?: number; // Optional distance in km
  avgRating?: number; // Add average rating
  reviewCount?: number; // Add review count
}

interface StoreCardProps {
  store: Store;
  className?: string;
  isFavorited?: boolean;
  onToggleFavorite?: (store: Store, isCurrentlyFavorited: boolean) => void;
  onRatingUpdate?: () => void;
}

export function StoreCard({ store, className, isFavorited = false, onToggleFavorite, onRatingUpdate }: StoreCardProps) {
  // These states and effects are no longer needed as avgRating and reviewCount are passed directly via `store` prop
  // const [avgRating, setAvgRating] = useState<number>(5);
  // const [reviewCount, setReviewCount] = useState<number>(0);
  // const [refreshCount, setRefreshCount] = useState(0);

  // const fetchRating = async () => {
  //   const { avgRating, reviewCount } = await calculateStoreRating(supabase, store.id);
  //   setAvgRating(avgRating);
  //   setReviewCount(reviewCount);
  // };

  // useEffect(() => {
  //   fetchRating();
  // }, [store.id]);

  // useEffect(() => {
  //   if (onRatingUpdate) {
  //     setRefreshCount(c => c + 1);
  //   }
  // }, [onRatingUpdate]);

  // useEffect(() => {
  //   fetchRating();
  // }, [store.id, refreshCount]);

  // Helper: open Google Maps directions for this store
  function openDirections() {
    if (store.latitude && store.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`;
      window.open(url, '_blank');
    }
  }

  // Use the rating data directly from the store prop
  const displayAvgRating = store.avgRating ?? 5; // Default to 5 if not provided
  const displayReviewCount = store.reviewCount ?? 0; // Default to 0 if not provided

  return (
    <Card className={cn("shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full", className)}>
      <CardHeader className="relative">
        <CardTitle className="font-headline text-lg mb-1 leading-tight flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" /> {store.name}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {store.address}
          <div className="flex items-center gap-1 mt-2">
            <span className="text-yellow-500 font-bold">{'★'.repeat(Math.round(displayAvgRating))}{'☆'.repeat(5 - Math.round(displayAvgRating))}</span>
            <span className="text-sm">
              {displayAvgRating.toFixed(1)}/5 {displayReviewCount > 0 && `(${displayReviewCount} ${displayReviewCount === 1 ? 'customer reviewed' : 'customers reviewed'})`}
            </span>
          </div>
        </CardDescription>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(store, isFavorited);
          }}
          className="absolute top-2 right-2 p-2 rounded-full bg-background/80 text-primary-foreground shadow-md hover:bg-background transition-colors duration-200"
          aria-label={isFavorited ? "Remove from favorite stores" : "Add to favorite stores"}
        >
          <Heart className={cn("h-5 w-5", isFavorited ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
        </button>
      </CardHeader>
      <CardContent className="flex-grow flex items-center gap-2">
        <Badge variant="secondary" className="flex items-center gap-1">
          <Tag className="h-3 w-3"/> {store.type}
        </Badge>
        {store.distance !== undefined && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Navigation className="h-3 w-3"/> {store.distance.toFixed(1)} km away
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
