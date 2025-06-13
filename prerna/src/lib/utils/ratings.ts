export async function calculateStoreRating(supabase: any, storeId: string, providedRatings?: number[]) {
  try {
    let validRatings: number[] = [];

    if (providedRatings) {
      validRatings = providedRatings.filter((r: number) => r >= 1 && r <= 5);
    } else {    
      const { data, error } = await supabase
        .from('store_reviews')
        .select('rating')
        .eq('store_id', storeId)
        .eq('status', 'approved');
      
      if (error) throw error;

      if (!data || data.length === 0) {
        return { avgRating: 5, reviewCount: 0 }; // Default to 5 stars when no reviews
      }
      validRatings = data.map((r: { rating: number }) => r.rating).filter((r: number) => r >= 1 && r <= 5);
    }

    if (validRatings.length === 0) {
      return { avgRating: 5, reviewCount: 0 }; // Default to 5 stars if no valid ratings are found after filtering/fetching
    }

    const avgRating = validRatings.reduce((a, b) => a + b, 0) / validRatings.length;
    return {
      avgRating,
      reviewCount: validRatings.length
    };
  } catch (err) {
    console.error('Error calculating store rating:', err);
    return { avgRating: 5, reviewCount: 0 }; // Default on error
  }
}
