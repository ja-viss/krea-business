'use server';

/**
 * @fileOverview Provides a summarized analysis of top-selling products.
 *
 * - topSellingProductsSummary - A function that generates a summary of top-selling products.
 * - TopSellingProductsSummaryInput - The input type for the topSellingProductsSummary function (currently empty).
 * - TopSellingProductsSummaryOutput - The return type for the topSellingProductsSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TopSellingProductsSummaryInputSchema = z.object({}).describe('Input for top selling products summary flow');
export type TopSellingProductsSummaryInput = z.infer<typeof TopSellingProductsSummaryInputSchema>;

const TopSellingProductsSummaryOutputSchema = z.object({
  summary: z.string().describe('A summary of the top-selling products, including key trends and insights.'),
});
export type TopSellingProductsSummaryOutput = z.infer<typeof TopSellingProductsSummaryOutputSchema>;

export async function topSellingProductsSummary(
  input: TopSellingProductsSummaryInput
): Promise<TopSellingProductsSummaryOutput> {
  return topSellingProductsSummaryFlow(input);
}

const getTopSellingProducts = ai.defineTool({
  name: 'getTopSellingProducts',
  description: 'Retrieves a list of the top-selling products from the database, including sales data.',
  inputSchema: z.object({
    limit: z
      .number()
      .default(10)
      .describe('The maximum number of top-selling products to retrieve.'),
  }),
  outputSchema: z.array(z.object({
    productName: z.string(),
    totalSales: z.number(),
  })).describe('An array of top selling products with their names and total sales.'),
}, async (input) => {
  // TODO: Replace with actual database call.
  // Placeholder data for demonstration.
  const topProducts = [
    { productName: 'Product A', totalSales: 1200 },
    { productName: 'Product B', totalSales: 950 },
    { productName: 'Product C', totalSales: 800 },
  ];

  return topProducts.slice(0, input.limit);
});

const prompt = ai.definePrompt({
  name: 'topSellingProductsSummaryPrompt',
  input: {schema: TopSellingProductsSummaryInputSchema},
  output: {schema: TopSellingProductsSummaryOutputSchema},
  tools: [getTopSellingProducts],
  prompt: `You are a business analyst tasked with summarizing the top-selling products for a small business.
  Analyze the data provided by the getTopSellingProducts tool and provide a concise summary of key trends and insights.
  Focus on providing actionable recommendations for marketing and inventory management based on the sales data.

  Summary: {{#tool_use "getTopSellingProducts"}} {{/tool_use}}`,
});

const topSellingProductsSummaryFlow = ai.defineFlow(
  {
    name: 'topSellingProductsSummaryFlow',
    inputSchema: TopSellingProductsSummaryInputSchema,
    outputSchema: TopSellingProductsSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
