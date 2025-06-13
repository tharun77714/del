
'use server';
/**
 * @fileOverview AI Prompt Enhancement Agent for Jewelry Design
 *
 * - enhanceJewelryPrompt - A function that takes a user's jewelry idea and enhances it into a more detailed prompt for image generation.
 * - EnhanceJewelryPromptInput - The input type for the enhanceJewelryPrompt function.
 * - EnhanceJewelryPromptOutput - The return type for the enhanceJewelryPrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EnhanceJewelryPromptInputSchema = z.object({
  currentPrompt: z.string().describe('The user\'s initial idea or prompt for a jewelry design.'),
});
export type EnhanceJewelryPromptInput = z.infer<typeof EnhanceJewelryPromptInputSchema>;

const EnhanceJewelryPromptOutputSchema = z.object({
  enhancedPrompt: z.string().describe('The AI-enhanced, more detailed prompt suitable for jewelry image generation.'),
});
export type EnhanceJewelryPromptOutput = z.infer<typeof EnhanceJewelryPromptOutputSchema>;

const promptEnhancementDefinition = ai.definePrompt({
  name: 'enhanceJewelryPromptDefinition',
  input: {schema: EnhanceJewelryPromptInputSchema},
  output: {schema: EnhanceJewelryPromptOutputSchema},
  prompt: `You are an AI assistant specializing in crafting detailed and vivid prompts for generating images of jewelry.
A user has provided the following initial idea for a piece of jewelry:
"{{{currentPrompt}}}"

Your task is to enhance this prompt. Make it more descriptive and evocative. Consider adding details about:
- Specific materials and their appearance (e.g., "polished 18k yellow gold", "lustrous freshwater pearls", "brilliant-cut diamond with fire")
- Gemstone details if mentioned (e.g., cut, color, clarity, setting type like "prong-set oval sapphire")
- Design style and era (e.g., "Art Deco filigree", "minimalist geometric", "organic nature-inspired")
- Textures and finishes (e.g., "hammered texture", "high-polish finish", "delicate engraving")
- Potential ambiance or lighting for the image (e.g., "soft studio lighting", "dramatic spotlight", "natural daylight")
- Overall artistic impression (e.g., "a sense of timeless elegance", "a bold contemporary statement", "ethereal and delicate")

The enhanced prompt should be a single, cohesive paragraph, optimized for an AI image generation model.
Do not make up completely new elements not implied by the original prompt, but expand creatively on what is given.
If the original prompt is very specific, focus on adding rich visual details and artistic direction.
If the original prompt is vague, infer plausible details that would make for a compelling jewelry image.
If the original prompt is empty or nonsensical, try to generate a creative prompt for a beautiful, unique piece of jewelry from scratch.
Return only the enhanced prompt as the 'enhancedPrompt' field in the JSON output.
`,
});

const enhanceJewelryPromptFlow = ai.defineFlow(
  {
    name: 'enhanceJewelryPromptFlow',
    inputSchema: EnhanceJewelryPromptInputSchema,
    outputSchema: EnhanceJewelryPromptOutputSchema,
  },
  async (input: EnhanceJewelryPromptInput): Promise<EnhanceJewelryPromptOutput> => {
    console.log("AI Flow: enhanceJewelryPromptFlow called. Current prompt:", input.currentPrompt.substring(0,100)+"...");
    
    const {output} = await promptEnhancementDefinition(input);

    if (!output?.enhancedPrompt) {
      console.error("AI Flow: Prompt enhancement failed or returned empty.");
      throw new Error('AI did not return an enhanced prompt. The response might have been empty or an error occurred.');
    }
    console.log("AI Flow: Prompt enhanced successfully:", output.enhancedPrompt.substring(0,100)+"...");
    return output;
  }
);

// Exported function that the UI calls
export async function enhanceJewelryPrompt(input: EnhanceJewelryPromptInput): Promise<EnhanceJewelryPromptOutput> {
  return enhanceJewelryPromptFlow(input);
}
