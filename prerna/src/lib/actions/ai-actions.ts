"use server";

import { suggestJewelry, type SuggestJewelryInput, type SuggestJewelryOutput } from '@/ai/flows/suggest-jewelry';

export async function suggestJewelryAction(input: SuggestJewelryInput): Promise<SuggestJewelryOutput> {
  try {
    const result = await suggestJewelry(input);
    return result;
  } catch (error) {
    console.error("Error in suggestJewelryAction:", error);
    // It's often better to throw a more specific error or return a structured error response
    // For now, re-throwing or returning a basic error structure.
    // Depending on how you want to handle errors client-side, you might adjust this.
    return { suggestions: [] }; // Or throw new Error("Failed to get AI suggestions.");
  }
}
