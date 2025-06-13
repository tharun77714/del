
import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-jewelry.ts';
import '@/ai/flows/customize-jewelry.ts';
import '@/ai/flows/generate-image-variations.ts';
import '@/ai/flows/describe-jewelry.ts'; // Ensure this line is present
import '@/ai/flows/enhance-jewelry-prompt.ts'; // Add the new flow
