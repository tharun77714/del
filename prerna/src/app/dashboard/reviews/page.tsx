"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import supabase from '@/lib/supabaseClient';
import { Card } from '@/components/ui/card';

interface Review {
  id: string;
  rating: number;
  review_text: string;
  created_at: string;
  status: 'pending' | 'approved'; // Keep status field in interface for data structure
  store_id: string;
  user_id: string;
  updated_at: string;
  profiles: { // Reviewer's profile
    full_name: string | null;
    email: string | null;
  };
  store: { // Business/Store info (fetched from profiles table where role is business)
    name: string;
  };
}

export default function BusinessReviewsPage() {
  const { user, profile } = useAuth(); // Get profile to ensure business role
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch reviews if user is logged in and is a business
    if (user && profile?.role === 'business') {
      fetchReviews();
    } else if (!user) { // If no user, stop loading and clear reviews
      setLoading(false);
      setReviews([]);
    }
  }, [user, profile]);

  const fetchReviews = async () => {
    if (!user || profile?.role !== 'business') {
      console.log('Not a business user or user not logged in. Cannot fetch business reviews.');
      setReviews([]);
      setLoading(false);
      return;
    }

    console.log('Fetching reviews for business user ID:', user?.id);
    setLoading(true);

    // Directly fetch reviews for the current business user's ID (which acts as store_id)
    // Join with profiles table to get reviewer info AND business name for the store
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('store_reviews')
      .select(`
        *,
        profiles:user_id (
          full_name,
          email
        ),
        store:profiles!store_reviews_store_id_fkey (
          business_name
        )
      `)
      .eq('store_id', user.id) // Filter reviews by the current business user's ID
      .order('created_at', { ascending: false });

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      console.error('Supabase error details:', reviewsError);
      setReviews([]);
      setLoading(false);
      toast({
        title: "Error fetching reviews",
        description: reviewsError.message,
        variant: "destructive"
      });
      return;
    }

    // Map the fetched data to match the Review interface
    const formattedReviews: Review[] = (reviewsData || []).map(review => ({
      ...review,
      store: {
        name: review.store?.business_name || 'N/A' // Use business_name from joined profiles as store name
      },
      // Ensure profiles is not null if it could be
      profiles: review.profiles || { full_name: 'Anonymous', email: null }
    }));

    console.log('Reviews data fetched and formatted:', formattedReviews);
    setReviews(formattedReviews);
    setLoading(false);
  };

  if (loading) return <div className="container mx-auto py-6 text-center">Loading reviews...</div>;

  const stats = {
    total: reviews.length,
    averageRating: reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length || 0
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Business Reviews</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Reviews</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Average Rating</div>
          <div className="text-2xl font-bold">
            {stats.averageRating.toFixed(1)} ★
          </div>
        </Card>
      </div>

          <div className="space-y-4 mt-6">
            {reviews.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No reviews found.
              </p>
            ) : (
              reviews.map((review) => (
                <Card key={review.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold mb-1">
                        {review.profiles.full_name || 'Anonymous User'}
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-yellow-500">
                          {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                        </span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {new Date(review.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{review.review_text}</p>
                      <p className="text-xs text-muted-foreground">
                        For: {review.store.name}
                        {review.profiles.email ? ` (${review.profiles.email})` : ''}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
    </div>
  );
}
