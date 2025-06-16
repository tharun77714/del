"use client";

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

interface ReviewsContextType {
  isReviewsOpen: boolean;
  toggleReviews: () => void;
  closeReviews: () => void;
  openReviewsForStore: (storeId: string) => void;
  activeStoreId: string | null;
  setActiveStoreId: (storeId: string | null) => void;
}

const ReviewsContext = createContext<ReviewsContextType | undefined>(undefined);

interface ReviewsProviderProps {
  children: ReactNode;
}

export const ReviewsProvider: React.FC<ReviewsProviderProps> = ({ children }) => {
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);

  const toggleReviews = useCallback(() => {
    setIsReviewsOpen(prev => !prev);
    if (isReviewsOpen) {
      setActiveStoreId(null); // Clear active store when closing
    }
  }, [isReviewsOpen]);

  const closeReviews = useCallback(() => {
    setIsReviewsOpen(false);
    setActiveStoreId(null);
  }, []);

  const openReviewsForStore = useCallback((storeId: string) => {
    setActiveStoreId(storeId);
    setIsReviewsOpen(true);
  }, []);

  const value = {
    isReviewsOpen,
    toggleReviews,
    closeReviews,
    openReviewsForStore,
    activeStoreId,
    setActiveStoreId,
  };

  return <ReviewsContext.Provider value={value}>{children}</ReviewsContext.Provider>;
};

export const useReviews = (): ReviewsContextType => {
  const context = useContext(ReviewsContext);
  if (context === undefined) {
    throw new Error('useReviews must be used within a ReviewsProvider');
  }
  return context;
}; 