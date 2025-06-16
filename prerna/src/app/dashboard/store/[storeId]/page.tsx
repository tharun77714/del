"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { JewelryCard, type JewelryItem as JewelryItemType } from '@/components/networks/jewelry-card';
import type { Store as StoreType } from '@/components/networks/store-card';
import { getProfile, getJewelryItemsByBusiness } from '@/lib/actions/supabase-actions';
import { ArrowLeft, MapPin, PackageSearch, AlertTriangle, ShoppingBag, Loader2, MessageSquare, Star, Info, Eye } from 'lucide-react'; 
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/contexts/ChatContext'; // Import useChat
import { calculateStoreRating } from '@/lib/utils/ratings';
import supabase from '@/lib/supabaseClient';
import { DirectionBar } from "@/components/ui/DirectionBar";
import dynamic from 'next/dynamic';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const StoreDirectionsMap = dynamic(() => import('@/components/networks/StoreDirectionsMap').then(mod => mod.default), { ssr: false });

export default function StoreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile: currentUserProfile } = useAuth(); 
  const { openChatWithUser, isChatOpen, toggleChat } = useChat();
  const storeId = params.storeId as string;

  const [storeDetails, setStoreDetails] = useState<StoreType | null>(null);
  const [storeItems, setStoreItems] = useState<JewelryItemType[]>([]);
  const [isLoadingStoreDetails, setIsLoadingStoreDetails] = useState(true);
  const [isLoadingStoreItems, setIsLoadingStoreItems] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshReviews, setRefreshReviews] = useState(0);
  const [ratingKey, setRatingKey] = useState(0);
  const [avgRating, setAvgRating] = useState(5);
  const [reviewCount, setReviewCount] = useState(0);

  // Fetch store ratings
  useEffect(() => {
    const fetchRating = async () => {
      if (!storeId) return;
      const { avgRating: rating, reviewCount: count } = await calculateStoreRating(supabase, storeId);
      setAvgRating(rating);
      setReviewCount(count);
    };
    fetchRating();
  }, [storeId, refreshReviews]);

  useEffect(() => {
    const fetchStoreData = async () => {
      if (!storeId || typeof storeId !== 'string') {
        setError("Invalid Store ID in URL.");
        setIsLoadingStoreDetails(false);
        setIsLoadingStoreItems(false);
        return;
      }

      setIsLoadingStoreDetails(true);
      setIsLoadingStoreItems(true);
      setError(null);

      try {
        const { data: storeProfileData, error: profileError } = await getProfile(storeId);

        if (profileError) {
          console.error('Error fetching store profile:', profileError);
          setError(`Error fetching store details: ${profileError.message}. This could be due to RLS policies or an invalid ID.`);
          setIsLoadingStoreDetails(false);
          setIsLoadingStoreItems(false);
          return;
        }

        if (!storeProfileData) {
          setError(`Store with ID "${storeId}" not found. Please ensure the ID is correct and the store exists.`);
          setIsLoadingStoreDetails(false);
          setIsLoadingStoreItems(false);
          return;
        }

        if (storeProfileData.role !== 'business') {
          setError(`The profile associated with ID "${storeId}" is not a registered business. (Found role: ${storeProfileData.role})`);
          setStoreDetails(null);
          setIsLoadingStoreDetails(false);
          setIsLoadingStoreItems(false);
          return;
        }

        setStoreDetails({
          id: storeProfileData.id,
          name: storeProfileData.business_name || 'Business Name Not Set',
          address: storeProfileData.business_address_text || 'Address Not Set',
          type: storeProfileData.business_type || 'Type Not Set',
          latitude: storeProfileData.business_address_lat || 0,
          longitude: storeProfileData.business_address_lng || 0,
        });
        setIsLoadingStoreDetails(false);

        const { data: itemsData, error: itemsError } = await getJewelryItemsByBusiness(storeId);
        if (itemsError) {
          console.error('Error fetching jewelry items:', itemsError);
          toast({ title: "Could not load jewelry items", description: itemsError.message, variant: "destructive" });
          setStoreItems([]);
        } else {
          setStoreItems((itemsData as any[] || []).map(item => ({
            id: item.id,
            name: item.name,
            type: item.type || 'Jewelry',
            style: item.style,
            material: item.material,
            description: item.description,
            imageUrl: item.image_url,
            dataAiHint: `${item.style} ${item.name.split(' ')[0]}`,
          })));
        }
      } catch (e: any) {
        console.error("Unexpected error in fetchStoreData:", e);
        setError(`An unexpected error occurred: ${e.message}`);
        setIsLoadingStoreDetails(false);
      } finally {
        setIsLoadingStoreItems(false);
      }
    };

    fetchStoreData();
  }, [storeId, toast, ratingKey]); // Add ratingKey to dependencies

  const handleChatWithBusiness = async () => {
    if (currentUserProfile && storeDetails && storeDetails.id !== currentUserProfile.id) {
        await openChatWithUser(storeDetails.id);
        if (!isChatOpen) {
          toggleChat();
        }
        // Chat sidebar should open via context state change
    } else if (storeDetails && storeDetails.id === currentUserProfile?.id) {
         toast({
            title: "Cannot Chat",
            description: "You cannot open a chat with your own business profile.",
            variant: "default"
        });
    } else {
         toast({
            title: "Cannot Initiate Chat",
            description: "User or store details are missing, or you are not logged in.",
            variant: "destructive"
        });
    }
  };

  // New function to handle AR Try On button click
  const handleTryOn = (imageUrl: string, description: string) => {
    try {
      sessionStorage.setItem('productDetailsImageUri', imageUrl);
      sessionStorage.setItem('productDetailsPrompt', description);
      sessionStorage.setItem('activateTryOnMode', 'true'); // Set flag for auto-activation
      router.push('/dashboard/product-details');
    } catch (e) {
      console.error("Error using sessionStorage for try-on:", e);
      toast({
        title: "Try-On Error",
        description: "Could not prepare try-on. Your browser might be blocking session storage or it's full.",
        variant: "destructive",
      });
    }
  };

  const canChatWithBusiness = currentUserProfile?.role === 'individual' && storeDetails && currentUserProfile.id !== storeDetails.id;

  const handleScrollToReviews = () => {
    const reviewsSection = document.getElementById('customer-reviews');
    if (reviewsSection) {
      reviewsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (isLoadingStoreDetails) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-8 w-1/2" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-72 w-full" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-6">
        <AlertTitle className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6" /> Error Loading Store
        </AlertTitle>
        <AlertDescription>
          <p>{error}</p>
          <Button variant="outline" asChild className="mt-4">
            <Link href="/dashboard/networks">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Networks
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!storeDetails) {
     return (
      <Alert variant="default" className="mt-6">
        <AlertTitle className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6" /> Store Not Found
        </AlertTitle>
        <AlertDescription>
          <p>The requested store could not be found after loading.</p>
           <Button variant="outline" asChild className="mt-4"><Link href="/dashboard/networks"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Networks</Link></Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">{storeDetails.name}</h1>
        {currentUserProfile && storeDetails.id === currentUserProfile.id && (
          <Button variant="outline" asChild className="ml-auto">
            <Link href="/dashboard/profile/business">
              Edit Your Business Profile
            </Link>
          </Button>
        )}
      </div>

      <Card className="shadow-lg overflow-hidden">
        <div className="relative h-48 md:h-64 w-full bg-secondary/30">
             <Image
                src={`https://placehold.co/1200x400.png?text=${encodeURIComponent(storeDetails.name)}`}
                alt={`${storeDetails.name} banner`}
                layout="fill"
                objectFit="cover"
                priority
                data-ai-hint="store banner"
              />
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-4">
                <ShoppingBag className="h-16 w-16 text-white/90 mb-3" />
                <h1 className="font-headline text-3xl md:text-5xl font-bold text-white text-center drop-shadow-md">
                    {storeDetails.name}
                </h1>
            </div>
        </div>
        <CardContent className="p-6">
          <p className="text-muted-foreground mb-4">{storeDetails.address}</p>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="outline" className="flex items-center"><MapPin className="h-3 w-3 mr-1" /> {storeDetails.type}</Badge>
            {avgRating > 0 && (
              <Badge variant="secondary" className="flex items-center">
                <Star className="h-3 w-3 mr-1 fill-current text-yellow-500" /> {avgRating.toFixed(1)} ({reviewCount} reviews)
              </Badge>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4">
            {canChatWithBusiness && (
              <Button onClick={handleChatWithBusiness} className="w-full sm:w-auto">
                <MessageSquare className="mr-2 h-4 w-4" /> Chat with this Business
              </Button>
            )}
            {storeDetails.latitude && storeDetails.longitude && (
                <DirectionBar
                    latitude={storeDetails.latitude}
                    longitude={storeDetails.longitude}
                    storeName={storeDetails.name}
                    storeAddress={storeDetails.address}
                />
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-6 flex items-center">
          <MapPin className="mr-3 h-7 w-7 text-primary" /> Location of {storeDetails.name}
        </h2>
        <StoreDirectionsMap storeName={storeDetails.name} storeLat={storeDetails.latitude} storeLng={storeDetails.longitude} />
        {storeDetails.latitude === 0 && storeDetails.longitude === 0 && (
          <Alert variant="default" className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Location Not Available</AlertTitle>
            <AlertDescription>
              The exact location for this store is not available. Please update the business profile with a valid address to show directions.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Separator />

      <div>
        <h2 className="font-headline text-2xl md:text-3xl font-semibold mb-6 flex items-center gap-2">
          <PackageSearch className="h-7 w-7 text-accent" /> Items from {storeDetails.name}
        </h2>
        {isLoadingStoreItems ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-72 w-full rounded-lg" />)}
            </div>
        ) : storeItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {storeItems.map(item => (
              <div key={item.id} className="relative overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
                {/* The main card part, clickable to view details */}
                <Link href={`/dashboard/product-details`} onClick={() => {
                    sessionStorage.setItem('productDetailsImageUri', item.imageUrl);
                    sessionStorage.setItem('productDetailsPrompt', item.description);
                    sessionStorage.removeItem('activateTryOnMode'); // Important: clear this if navigating normally
                }} className="block flex-grow"> {/* `block` and `flex-grow` to make link fill space */}
                  <JewelryCard {...item} className="h-full" /> {/* Ensure JewelryCard takes full height */}
                </Link>
                {/* The AR Try On button */}
                <div className="p-4 pt-0"> {/* Use padding to align with CardContent */}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleTryOn(item.imageUrl, item.description)}
                    className="w-full btn-primary-sparkle"
                  >
                    <Eye className="mr-2 h-4 w-4" /> AR Try On
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center py-12 border-dashed bg-muted/20">
            <PackageSearch className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">This store hasn't listed any items yet.</p>
            <p className="text-sm text-muted-foreground">Items added by the business will appear here.</p>
          </Card>
        )}
      </div>

      {currentUserProfile?.role === 'individual' && user?.id && (
        <ReviewForm storeId={storeId} onReviewAdded={() => setRefreshReviews(prev => prev + 1)} />
      )}

      {reviewCount > 0 && (
        <Button onClick={handleScrollToReviews} variant="outline" className="w-full sm:w-auto mx-auto mt-4">
          <Eye className="mr-2 h-4 w-4" /> View Reviews ({reviewCount})
        </Button>
      )}
    </div>
  );
}

function StoreReviews({ storeId, onRatingUpdate }: { storeId: string, onRatingUpdate?: () => void }) {
  console.log("StoreReviews component rendering..."); // Debug log for component rendering
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReview, setEditingReview] = useState<string | null>(null);

  useEffect(() => {
    console.log("useEffect in StoreReviews triggered. Current editingReview:", editingReview); // Debug log for useEffect
    fetchReviews();
  }, [storeId, editingReview]); // Add editingReview to dependencies

  const fetchReviews = async () => {
    try {
    const { data, error } = await supabase
      .from('store_reviews')
      .select(`
        *,
          profiles!store_reviews_user_id_fkey (
            id,
            full_name,
            email
        )
      `)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      return;
    }

      console.log('Fetched reviews:', data); // Debug log
    setReviews(data || []);
    } catch (error) {
      console.error('Error in fetchReviews:', error);
    } finally {
    setLoading(false);
    }
  };

  const handleEditComplete = () => {
    console.log("handleEditComplete triggered.");
    setEditingReview(null);
    fetchReviews();
  };

  if (loading) return <div>Loading reviews...</div>;
  if (reviews.length === 0) return <div className="mt-6 text-muted-foreground">No reviews yet.</div>;

  const reviewToEdit = reviews.find(r => r.id === editingReview);
  console.log("Review to edit based on editingReview state:", reviewToEdit); // Debug log for review object
  console.log("Current editingReview state:", editingReview); // Debug log for editingReview state

  return (
    <div id="customer-reviews" className="mt-6 space-y-4">
      <h2 className="text-2xl font-semibold mb-4">Customer Reviews</h2>
      {editingReview && reviewToEdit ? (
        <EditReviewForm
          review={reviewToEdit}
          onCancel={() => setEditingReview(null)}
          onSaved={handleEditComplete}
          onRatingUpdated={onRatingUpdate}
        />
      ) : ( // Added else block to ensure component is rendered or nothing if condition is not met
        reviews.map((review) => (
          <div key={review.id} className="border rounded-lg p-4 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <span className="text-yellow-500 text-lg">
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  </span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {review.rating}/5
                  </span>
                </div>
                <span className="text-sm font-medium">
                  {review.profiles?.full_name || 'Anonymous'}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(review.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="text-sm text-gray-700 mb-2">{review.review_text}</div>
                {user?.id === review.user_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log(`Edit Review button clicked for review ID: ${review.id}`);
                      setEditingReview(review.id);
                    }}
                  >
                    Edit Review
                  </Button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

interface EditReviewFormProps {
  review: {
    id: string;
    rating: number;
    review_text: string;
  };
  onCancel: () => void;
  onSaved: () => void;
  onRatingUpdated?: () => void;
}

function EditReviewForm({ review, onCancel, onSaved, onRatingUpdated }: EditReviewFormProps) {
  const [rating, setRating] = useState(review.rating);
  const [reviewText, setReviewText] = useState(review.review_text);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleSubmit triggered");
    setSubmitting(true);
    
    const { error } = await supabase
      .from('store_reviews')
      .update({
        rating,
        review_text: reviewText,
        updated_at: new Date().toISOString()      })
      .eq('id', review.id);

    if (error) {
      console.error("Supabase update error:", error);
      toast({
        title: "Error",
        description: "Failed to update review: " + error.message,
        variant: "destructive"
      });
    } else {
      onSaved();
      onRatingUpdated?.(); // Trigger rating refresh
      toast({
        title: "Success",
        description: "Your review has been updated",
      });
    }
    setSubmitting(false);
  };

  return (
    console.log("EditReviewForm is rendering"),
    <form onSubmit={handleSubmit} className="mt-6 border-t pt-4">
      <h3 className="font-semibold mb-2">Edit Your Review</h3>
      <div className="flex items-center gap-2 mb-2">
        <span>Rating:</span>
        {[1,2,3,4,5].map((star) => (
          <button
            type="button"
            key={star}
            onClick={() => setRating(star)}
            className={star <= rating ? "text-yellow-500" : "text-gray-300"}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className="w-full border rounded p-2 mb-2"
        rows={3}
        placeholder="Write your review..."
        value={reviewText}
        onChange={e => setReviewText(e.target.value)}
        required
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ReviewForm({ storeId, onReviewAdded }: { storeId: string, onReviewAdded: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  useEffect(() => {
    async function checkIfReviewed() {
      if (!user) return;
      const { data } = await supabase
        .from('store_reviews')
        .select('id')
        .eq('store_id', storeId)
        .eq('user_id', user.id);
      if (data && data.length > 0) setAlreadyReviewed(true);
      else setAlreadyReviewed(false);
    }
    checkIfReviewed();
  }, [storeId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('store_reviews').insert({
        store_id: storeId,
        user_id: user.id,
        rating,
        review_text: reviewText,
        created_at: new Date().toISOString(),
        status: 'approved'
      });

      if (error) {
        toast({
          title: "Failed to submit review",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Review submitted",
        description: "Thank you for your review!", // Removed 'It will be visible after approval.'
      });
      setRating(5);
      setReviewText('');
      setAlreadyReviewed(true);
      onReviewAdded();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return <p className="mt-6 text-muted-foreground">Sign in to leave a review.</p>;
  if (alreadyReviewed) return <p className="mt-6 text-muted-foreground">You have already submitted a review for this store.</p>;

  return (
    <form onSubmit={handleSubmit} className="mt-6 border-t pt-4">
      <h3 className="font-semibold mb-2">Leave a Review</h3>
      <div className="flex items-center gap-2 mb-2">
        <span>Rating:</span>
        {[1,2,3,4,5].map((star) => (
          <button
            type="button"
            key={star}
            onClick={() => setRating(star)}
            className={star <= rating ? "text-yellow-500" : "text-gray-300"}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className="w-full border rounded p-2 mb-2"
        rows={3}
        placeholder="Write your review..."
        value={reviewText}
        onChange={e => setReviewText(e.target.value)}
        required
      />
      <Button type="submit" disabled={submitting} className="btn-primary-sparkle">
        {submitting ? "Submitting..." : "Submit Review"}
      </Button>
    </form>
  );
}
