'use server';

/**
 * @fileOverview Provides AI-powered recommendations for optimal stock levels and reorder quantities.
 *
 * This file defines a Genkit flow that analyzes sales and inventory data to suggest
 * optimal stock levels and reorder quantities, aiming to minimize holding costs and prevent stockouts.
 *
 * @module ai/flows/inventory-optimization-recommendations
 *
 * @interface InventoryOptimizationInput - Input for the inventory optimization flow.
 * @interface InventoryOptimizationOutput - Output of the inventory optimization flow.
 * @function getInventoryOptimizationRecommendations - Main function to trigger the inventory optimization flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input schema for the inventory optimization flow
const InventoryOptimizationInputSchema = z.object({
  products: z.array(
    z.object({
      productId: z.string().describe('Unique identifier for the product.'),
      productName: z.string().describe('Name of the product.'),
      currentStock: z.number().describe('Current stock level of the product.'),
      averageMonthlySales: z
        .number()
        .describe('Average monthly sales of the product.'),
      holdingCostPerUnit: z
        .number()
        .describe('Cost of holding one unit of the product in inventory for a month.'),
      leadTimeInMonths: z
        .number()
        .describe('Lead time in months for reordering the product.'),
    })
  ).describe('Array of products with their relevant data.'),
});
export type InventoryOptimizationInput = z.infer<typeof InventoryOptimizationInputSchema>;

// Output schema for the inventory optimization flow
const InventoryOptimizationOutputSchema = z.object({
  recommendations: z.array(
    z.object({
      productId: z.string().describe('Unique identifier for the product.'),
      recommendedStockLevel: z
        .number()
        .describe('Recommended stock level to minimize holding costs and avoid stockouts.'),
      reorderQuantity: z.number().describe('Recommended reorder quantity.'),
      reasoning: z
        .string()
        .describe('Explanation of why the recommendation was made.'),
    })
  ).describe('Array of inventory optimization recommendations for each product.'),
});
export type InventoryOptimizationOutput = z.infer<typeof InventoryOptimizationOutputSchema>;

// Main function to trigger the inventory optimization flow
export async function getInventoryOptimizationRecommendations(
  input: InventoryOptimizationInput
): Promise<InventoryOptimizationOutput> {
  return inventoryOptimizationFlow(input);
}

// Define the prompt for the inventory optimization flow
const inventoryOptimizationPrompt = ai.definePrompt({
  name: 'inventoryOptimizationPrompt',
  input: {schema: InventoryOptimizationInputSchema},
  output: {schema: InventoryOptimizationOutputSchema},
  prompt: `You are an expert inventory optimization consultant. Analyze the following product data and provide recommendations for optimal stock levels and reorder quantities.

Products:
{{#each products}}
  Product ID: {{productId}}
  Product Name: {{productName}}
  Current Stock: {{currentStock}}
  Average Monthly Sales: {{averageMonthlySales}}
  Holding Cost per Unit: {{holdingCostPerUnit}}
  Lead Time (Months): {{leadTimeInMonths}}
{{/each}}

For each product, calculate the optimal stock level and reorder quantity, considering the average monthly sales, holding cost, and lead time. Provide a brief explanation for each recommendation.

Ensure you return output in the following JSON format: {{{outputSchema}}}`,
});

// Define the Genkit flow for inventory optimization recommendations
const inventoryOptimizationFlow = ai.defineFlow(
  {
    name: 'inventoryOptimizationFlow',
    inputSchema: InventoryOptimizationInputSchema,
    outputSchema: InventoryOptimizationOutputSchema,
  },
  async input => {
    const {output} = await inventoryOptimizationPrompt(input);
    return output!;
  }
);
