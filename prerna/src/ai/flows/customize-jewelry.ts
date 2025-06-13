
'use server';
/**
 * @fileOverview AI Jewelry Customization Agent
 *
 * - customizeJewelry - A function that generates a customized jewelry image based on a description and an optional base image.
 * - CustomizeJewelryInput - The input type for the customizeJewelry function.
 * - CustomizeJewelryOutput - The return type for the customizeJewelry function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CustomizeJewelryInputSchema = z.object({
  customizationDescription: z.string().describe('A textual description of the desired jewelry design or modifications.'),
  baseJewelryDataUri: z.string().optional().describe(
    "An optional base image of a jewelry piece as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
});
export type CustomizeJewelryInput = z.infer<typeof CustomizeJewelryInputSchema>;

const CustomizeJewelryOutputSchema = z.object({
  customizedJewelryDataUri: z.string().describe(
    "The customized jewelry image as a data URI. Format: 'data:image/png;base64,<encoded_data>'."
  ),
});
export type CustomizeJewelryOutput = z.infer<typeof CustomizeJewelryOutputSchema>;

const customizeJewelryFlow = ai.defineFlow(
  {
    name: 'customizeJewelryFlow',
    inputSchema: CustomizeJewelryInputSchema,
    outputSchema: CustomizeJewelryOutputSchema,
  },
  async (input: CustomizeJewelryInput): Promise<CustomizeJewelryOutput> => {
    const promptItems: Array<{text: string} | {media: {url: string}}> = [];
    let instructionText = "";

    if (input.baseJewelryDataUri) {
      promptItems.push({media: {url: input.baseJewelryDataUri}});
      instructionText = `Using the provided image as a base, create a new image that incorporates these changes: "${input.customizationDescription}". Ensure the output is a clear, high-quality image of the modified jewelry.`;
      promptItems.push({text: instructionText});
    } else {
      instructionText = `Generate a new, clear, high-quality image of a piece of jewelry based on this description: "${input.customizationDescription}".`;
      promptItems.push({text: instructionText});
    }

    console.log("AI Flow: customizeJewelryFlow called. Description:", input.customizationDescription, "Base image provided:", !!input.baseJewelryDataUri);
    console.log("AI Flow: Prompt items for ai.generate:", JSON.stringify(promptItems).substring(0,200) + "...");


    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', // Model capable of image generation
      prompt: promptItems,
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // Request both text and image modalities
        // Optional: Add safety settings if needed.
        // safetySettings: [
        //   { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
        //   { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        // ],
      },
    });

    if (!media || !media.url) {
      console.error("AI Flow: Image generation failed or media URL not found in response.");
      throw new Error('AI did not return an image. The response might have been blocked or did not contain image data.');
    }
    
    console.log("AI Flow: Image generated successfully. Media URL starts with:", media.url.substring(0, 50) + "...");
    return { customizedJewelryDataUri: media.url };
  }
);

// Exported function that the UI calls
export async function customizeJewelry(input: CustomizeJewelryInput): Promise<CustomizeJewelryOutput> {
  return customizeJewelryFlow(input);
}
