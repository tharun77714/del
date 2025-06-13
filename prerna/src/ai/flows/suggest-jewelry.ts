'use server';

/**
 * @fileOverview Jewelry suggestion AI agent.
 *
 * - suggestJewelry - A function that suggests jewelry types, styles, and materials.
 * - SuggestJewelryInput - The input type for the suggestJewelry function.
 * - SuggestJewelryOutput - The return type for the suggestJewelry function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestJewelryInputSchema = z.object({
  searchQuery: z.string().describe('The user\'s search query for jewelry.'),
});
export type SuggestJewelryInput = z.infer<typeof SuggestJewelryInputSchema>;

const SuggestJewelryOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      type: z.string().describe('The type of jewelry (e.g., necklace, ring).'),
      style: z.string().describe('The style of jewelry (e.g., modern, vintage).'),
      material: z.string().describe('The material of jewelry (e.g., gold, silver).'),
      description: z.string().describe('A short description of the suggested jewelry.')
    })
  ).describe('A list of suggested jewelry items based on the search query.'),
});
export type SuggestJewelryOutput = z.infer<typeof SuggestJewelryOutputSchema>;

export async function suggestJewelry(input: SuggestJewelryInput): Promise<SuggestJewelryOutput> {
  return suggestJewelryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestJewelryPrompt',
  input: {schema: SuggestJewelryInputSchema},
  output: {schema: SuggestJewelryOutputSchema},
  prompt: `You are an expert jewelry consultant. Based on the user's search query, suggest jewelry types, styles, and materials they might be interested in. Return at least 3 suggestions.

Search Query: {{{searchQuery}}}

Format your response as a JSON object conforming to the schema:
{{ zodSchema }}`,
});

const suggestJewelryFlow = ai.defineFlow(
  {
    name: 'suggestJewelryFlow',
    inputSchema: SuggestJewelryInputSchema,
    outputSchema: SuggestJewelryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
