"use client";

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, Loader2, Star, CheckCheck, Check, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { useReviews } from '@/contexts/ReviewsContext';
import { useAuth } from '@/contexts/AuthContext';
import supabase from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNowStrict } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import EditReviewForm from '@/components/reviews/EditReviewForm';

interface Review {
  id: string;
  rating: number;
  review_text: string;
  created_at: string;
  updated_at?: string;
  status: 'pending' | 'approved';
  store_id: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  };
}

export function ReviewsSidebar() {
  const { isReviewsOpen, closeReviews, activeStoreId } = useReviews();
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isReviewsOpen && activeStoreId) {
      fetchReviews(activeStoreId);
    } else {
      setReviews([]);
      setLoading(false);
    }
  }, [isReviewsOpen, activeStoreId]);

  const fetchReviews = async (storeId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('store_reviews')
        .select(`
          *,
          profiles!store_reviews_user_id_fkey (
            full_name,
            email
          )
        `)
        .eq('store_id', storeId)
        .eq('status', 'approved') // Only show approved reviews
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(data || []);
    } catch (error: any) {
      console.error("Error fetching reviews for sidebar:", error);
      toast({
        title: "Error loading reviews",
        description: error.message,
        variant: "destructive"
      });
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditReview = (review: Review) => {
    setEditingReviewId(review.id);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (window.confirm("Are you sure you want to delete this review?")) {
      try {
        const { error } = await supabase
          .from('store_reviews')
          .delete()
          .eq('id', reviewId)
          .eq('user_id', user?.id); // Ensure only sender can delete

        if (error) throw error;

        toast({
          title: "Review Deleted",
          description: "Your review has been successfully deleted.",
        });
        // Optimistically update UI
        setReviews(prevReviews => prevReviews.filter(r => r.id !== reviewId));
      } catch (error: any) {
        console.error("Error deleting review:", error);
        toast({
          title: "Deletion Failed",
          description: `Could not delete review: ${error.message}`,
          variant: "destructive",
        });
      }
    }
  };

  const handleEditComplete = () => {
    setEditingReviewId(null);
    if (activeStoreId) fetchReviews(activeStoreId);
  };

  const reviewToEdit = reviews.find(r => r.id === editingReviewId);

  return (
    <div
      ref={sidebarRef}
      className={cn(
        "fixed inset-y-0 right-0 z-[100] w-full md:w-96 bg-background shadow-lg transform transition-transform ease-in-out duration-300 flex flex-col",
        isReviewsOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Customer Reviews</h2>
        <Button variant="ghost" size="icon" onClick={closeReviews}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground text-center p-4">
          No reviews for this store yet.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          {user && reviewToEdit && editingReviewId === reviewToEdit.id ? (
            <EditReviewForm
              review={reviewToEdit}
              onCancel={handleEditComplete}
              onSaved={handleEditComplete}
              onRatingUpdated={() => {
                // Optionally update rating count if needed on sidebar close
              }}
            />
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="border rounded-lg p-4 bg-white shadow-sm mb-4">
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
                      {user && user.id === review.user_id && <span className="ml-2 text-xs text-blue-500">(Your Review)</span>}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNowStrict(new Date(review.created_at), { addSuffix: true })}
                  </span>
                </div>
                <div className="text-sm text-gray-700 mb-2">{review.review_text}</div>
                {user && user.id === review.user_id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute -top-1 right-2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Review options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditReview(review)} className="flex items-center">
                        <Edit className="mr-2 h-4 w-4" /> Edit Review
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDeleteReview(review.id)} className="text-destructive flex items-center">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Review
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
} 