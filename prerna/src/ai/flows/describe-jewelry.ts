
'use server';
/**
 * @fileOverview AI Jewelry Description Agent
 *
 * - describeJewelry - A function that generates a textual description for a given jewelry image.
 * - DescribeJewelryInput - The input type for the describeJewelry function.
 * - DescribeJewelryOutput - The return type for the describeJewelry function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DescribeJewelryInputSchema = z.object({
  imageDataUri: z.string().describe(
    "The jewelry image as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
});
export type DescribeJewelryInput = z.infer<typeof DescribeJewelryInputSchema>;

const DescribeJewelryOutputSchema = z.object({
  description: z.string().describe('A compelling and elegant description of the jewelry piece.'),
});
export type DescribeJewelryOutput = z.infer<typeof DescribeJewelryOutputSchema>;

const describeJewelryPrompt = ai.definePrompt({
  name: 'describeJewelryPrompt',
  input: {schema: DescribeJewelryInputSchema},
  output: {schema: DescribeJewelryOutputSchema},
  prompt: `You are a master jeweler and an eloquent creative writer.
Look at the jewelry piece in the provided image.
Generate a compelling and elegant description for it.
Focus on its style, materials, prominent features (like gemstones, shapes, textures), craftsmanship, and the overall impression it creates.
Make it sound appealing, luxurious, and unique.
The description should be a short paragraph, suitable for a product listing or a showcase.

Image of the jewelry:
{{media url=imageDataUri}}`,
});

const describeJewelryFlow = ai.defineFlow(
  {
    name: 'describeJewelryFlow',
    inputSchema: DescribeJewelryInputSchema,
    outputSchema: DescribeJewelryOutputSchema,
  },
  async (input: DescribeJewelryInput): Promise<DescribeJewelryOutput> => {
    console.log("AI Flow: describeJewelryFlow called. Image URI starts with:", input.imageDataUri.substring(0, 50) + "...");
    
    const maxRetries = 3;
    const retryDelayMs = 2000; // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const {output} = await describeJewelryPrompt(input);

        if (!output?.description) {
            console.error(`AI Flow (Attempt ${attempt}/${maxRetries}): Description generation failed or returned empty.`);
            // If it's an empty description but not an error, and it's the last attempt, throw.
            if (attempt === maxRetries) {
                throw new Error('AI did not return a description after multiple attempts. The response might have been empty.');
            }
            // Otherwise, this case might not be typical for empty output unless an error is also thrown by the prompt call.
            // If the prompt call itself doesn't throw for empty, but we consider it an error, this logic path is fine.
        } else {
            console.log(`AI Flow (Attempt ${attempt}/${maxRetries}): Description generated successfully:`, output.description.substring(0,100)+"...");
            return output; // Success
        }
      } catch (error: any) {
        console.warn(`AI Flow (Attempt ${attempt}/${maxRetries}): Error during description generation - ${error.message}`);
        if (attempt === maxRetries) {
          console.error(`AI Flow: All ${maxRetries} attempts failed. Last error: ${error.message}`);
          throw error; // Re-throw the last error if all retries fail
        }

        // Check if the error is a 503 or overload error to decide if we should retry
        const errorMessage = error.message?.toLowerCase() || "";
        if (errorMessage.includes("503") || errorMessage.includes("overloaded") || errorMessage.includes("service unavailable")) {
          console.log(`AI Flow: Retrying in ${retryDelayMs / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        } else {
          // If it's not a retriable error, throw immediately
          throw error;
        }
      }
    }
    // Should not be reached if logic is correct, but as a fallback:
    throw new Error('AI description generation failed after all retries.');
  }
);

// Exported function that the UI calls
export async function describeJewelry(input: DescribeJewelryInput): Promise<DescribeJewelryOutput> {
  return describeJewelryFlow(input);
}
