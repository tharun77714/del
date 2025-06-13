
'use server';
/**
 * @fileOverview Generates image variations for a given jewelry piece.
 *
 * - generateImageVariations - A function that creates multiple image views of a jewelry item.
 * - GenerateImageVariationsInput - The input type for the function.
 * - GenerateImageVariationsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateImageVariationsInputSchema = z.object({
  baseImageDataUri: z.string().describe(
    "The base image of the jewelry piece as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  originalDescription: z.string().describe('The original AI prompt or description used to generate/customize the base image.'),
});
export type GenerateImageVariationsInput = z.infer<typeof GenerateImageVariationsInputSchema>;

const GenerateImageVariationsOutputSchema = z.object({
  variations: z.array(z.string().describe(
    "An array of data URIs for the generated image variations. Format: 'data:image/png;base64,<encoded_data>'."
  )).min(0).max(4).describe('An array of 0 to 4 image data URIs representing different views or variations. Can be empty if generation fails for all variations.'),
});
export type GenerateImageVariationsOutput = z.infer<typeof GenerateImageVariationsOutputSchema>;


const generateImageVariationsFlow = ai.defineFlow(
  {
    name: 'generateImageVariationsFlow',
    inputSchema: GenerateImageVariationsInputSchema,
    outputSchema: GenerateImageVariationsOutputSchema,
  },
  async (input: GenerateImageVariationsInput): Promise<GenerateImageVariationsOutput> => {
    const variationPrompts = [
      `Show a clear front view of the jewelry from this image, maintaining the style and details consistent with the original concept: "${input.originalDescription}".`,
      `Show a clear back view of the jewelry from this image, maintaining the style and details consistent with the original concept: "${input.originalDescription}".`,
      `Show a clear top-down view (bird's-eye view) of the jewelry from this image, maintaining the style and details consistent with the original concept: "${input.originalDescription}".`,
      `Show a clear 45-degree angle view of the jewelry from this image, maintaining the style and details consistent with the original concept: "${input.originalDescription}".`,
    ];

    const variationImageUris: string[] = [];

    console.log("AI Flow: generateImageVariationsFlow called. Original Description:", input.originalDescription.substring(0,100)+"...", "Base image provided:", !!input.baseImageDataUri);

    for (const promptText of variationPrompts) {
      try {
        console.log(`AI Flow: Attempting to generate variation with prompt: ${promptText.substring(0,100)}...`);
        const {media} = await ai.generate({
          model: 'googleai/gemini-2.0-flash-exp',
          prompt: [
            {media: {url: input.baseImageDataUri}},
            {text: promptText},
          ],
          config: {
            responseModalities: ['TEXT', 'IMAGE'],
            // Optional: Add safety settings if needed.
            // safetySettings: [
            //   { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
            // ],
          },
        });

        if (media?.url) {
          variationImageUris.push(media.url);
          console.log(`AI Flow: Successfully generated variation. URL starts with: ${media.url.substring(0,50)}...`);
        } else {
          console.warn(`AI Flow: AI did not return an image for prompt: ${promptText.substring(0,100)}...`);
        }
      } catch (error) {
        console.error(`AI Flow: Error generating variation for prompt "${promptText.substring(0,100)}...":`, error);
        // Continue to next prompt even if one fails, to try and get as many variations as possible.
      }
    }
    
    // It's okay if not all variations are generated, so we don't throw an error if some are missing.
    // The output schema allows for 0-4 images.

    console.log("AI Flow: generateImageVariationsFlow finished. Generated variations count:", variationImageUris.length);
    return { variations: variationImageUris };
  }
);

export async function generateImageVariations(input: GenerateImageVariationsInput): Promise<GenerateImageVariationsOutput> {
  return generateImageVariationsFlow(input);
}
