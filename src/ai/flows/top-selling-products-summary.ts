'use server';

/**
 * @fileOverview Análisis inteligente de ventas e inventario.
 *
 * Proporciona un resumen ejecutivo de los productos más vendidos y genera recomendaciones
 * estratégicas de reabastecimiento utilizando IA.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import dbConnect from '@/lib/dbConnect';
import SaleModel from '@/models/Sale';
import ProductModel from '@/models/Product';
import mongoose from 'mongoose';

const TopSellingProductsSummaryInputSchema = z.object({
    storeId: z.string().describe('ID de la tienda para filtrar datos.')
});
export type TopSellingProductsSummaryInput = z.infer<typeof TopSellingProductsSummaryInputSchema>;

const TopSellingProductsSummaryOutputSchema = z.object({
  summary: z.string().describe('Resumen narrativo de los productos más vendidos.'),
  recommendations: z.array(z.object({
      productName: z.string(),
      reason: z.string(),
      suggestedAction: z.string(),
      priority: z.enum(['Alta', 'Media', 'Baja'])
  })).describe('Lista de recomendaciones tácticas para el inventario.')
});
export type TopSellingProductsSummaryOutput = z.infer<typeof TopSellingProductsSummaryOutputSchema>;

export async function topSellingProductsSummary(
  input: TopSellingProductsSummaryInput
): Promise<TopSellingProductsSummaryOutput> {
  return topSellingProductsSummaryFlow(input);
}

const getSalesAndStockData = ai.defineTool({
  name: 'getSalesAndStockData',
  description: 'Recupera datos reales de ventas y stock actual para análisis.',
  inputSchema: z.object({
    storeId: z.string(),
  }),
  outputSchema: z.object({
      topProducts: z.array(z.object({
          name: z.string(),
          totalSold: number,
          currentStock: number,
          minStock: number
      }))
  }),
}, async (input) => {
  await dbConnect();
  
  const storeId = new mongoose.Types.ObjectId(input.storeId);
  
  // Agregación para obtener los productos más vendidos
  const salesData = await SaleModel.aggregate([
      { $match: { store: storeId, status: 'Pagado' } },
      { $unwind: '$items' },
      { $group: { 
          _id: '$items.product', 
          totalQuantity: { $sum: '$items.quantity' } 
      } },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
  ]);

  const results = [];
  for (const item of salesData) {
      const product = await ProductModel.findById(item._id);
      if (product) {
          results.push({
              name: product.name,
              totalSold: item.totalQuantity,
              currentStock: product.stock,
              minStock: product.minStock
          });
      }
  }

  return { topProducts: results };
});

const prompt = ai.definePrompt({
  name: 'businessIntelligencePrompt',
  input: {schema: TopSellingProductsSummaryInputSchema},
  output: {schema: TopSellingProductsSummaryOutputSchema},
  tools: [getSalesAndStockData],
  prompt: `Eres un consultor experto en retail y analista de negocios para pequeñas y medianas empresas en Venezuela.
  
  Tu tarea es analizar los datos de ventas e inventario proporcionados por la herramienta getSalesAndStockData para la tienda con ID: {{storeId}}.
  
  Analiza cuidadosamente:
  1. ¿Cuál es el producto estrella? (El más vendido).
  2. ¿Hay productos de alta rotación con stock crítico (cerca del stock mínimo)?
  3. Proporciona una recomendación de COMPRA inmediata si el stock está bajo y la venta es alta.
  4. Sé específico, profesional y estratégico.
  
  Genera el resumen ejecutivo y las recomendaciones en formato JSON estructurado.`,
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
