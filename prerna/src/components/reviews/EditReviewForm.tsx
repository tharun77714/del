"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import supabase from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';

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

const EditReviewForm: React.FC<EditReviewFormProps> = ({ review, onCancel, onSaved, onRatingUpdated }) => {
  const [currentRating, setCurrentRating] = useState(review.rating);
  const [currentReviewText, setCurrentReviewText] = useState(review.review_text);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('store_reviews')
        .update({ rating: currentRating, review_text: currentReviewText, updated_at: new Date().toISOString() })
        .eq('id', review.id);

      if (error) throw error;

      toast({
        title: "Review Updated",
        description: "Your review has been successfully updated.",
      });
      onSaved();
      if (onRatingUpdated) onRatingUpdated();
    } catch (error: any) {
      console.error("Error updating review:", error);
      toast({
        title: "Update Failed",
        description: `Could not update review: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-gray-50 mb-4">
      <h3 className="font-semibold mb-2">Edit Your Review</h3>
      <div className="flex items-center gap-2 mb-2">
        <span>Rating:</span>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            type="button"
            key={star}
            onClick={() => setCurrentRating(star)}
            className={cn("text-xl", star <= currentRating ? "text-yellow-500" : "text-gray-300")}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className="w-full border rounded p-2 mb-2 resize-y min-h-[80px]"
        rows={3}
        placeholder="Edit your review..."
        value={currentReviewText}
        onChange={e => setCurrentReviewText(e.target.value)}
        required
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Updating..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
};

export default EditReviewForm; 