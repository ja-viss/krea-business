'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Sparkles, Loader2, TrendingUp, AlertCircle, ShoppingCart, ArrowRight, PackageCheck } from 'lucide-react';
import { topSellingProductsSummary, TopSellingProductsSummaryOutput } from '@/ai/flows/top-selling-products-summary';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function AiInsightsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TopSellingProductsSummaryOutput | null>(null);

  const handleGenerateAnalysis = async () => {
    setLoading(true);
    try {
      const storeId = localStorage.getItem('storeId');
      if (!storeId) throw new Error('Sesión no encontrada');

      const result = await topSellingProductsSummary({ storeId });
      setData(result);
      toast({ title: "Análisis Completado", description: "La IA ha procesado tus datos con éxito." });
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Error", description: "No se pudo generar el análisis de IA." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader 
            title="AI Insights" 
            description="Análisis inteligente de tu inventario y tendencias de ventas." 
            actions={
                <Button onClick={handleGenerateAnalysis} disabled={loading} className="font-bold shadow-lg shadow-primary/20">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    {data ? "Actualizar Análisis" : "Generar Análisis con IA"}
                </Button>
            }
        />

        {!data && !loading && (
            <div className="flex h-[450px] shrink-0 items-center justify-center rounded-xl border-2 border-dashed bg-muted/20">
                <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center px-4">
                    <div className="rounded-full bg-primary/10 p-6 mb-4">
                        <Sparkles className="h-12 w-12 text-primary animate-pulse" />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Inteligencia de Negocio</h3>
                    <p className="mb-6 mt-2 text-sm text-muted-foreground font-medium">
                        Presiona el botón superior para que la IA analice tus facturas recientes y niveles de stock. Te recomendaremos qué productos reponer y cuáles son tus mejores vendedores.
                    </p>
                    <Button onClick={handleGenerateAnalysis} variant="outline" className="font-bold">Empezar ahora</Button>
                </div>
            </div>
        )}

        {loading && (
            <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-[300px] w-full rounded-xl" />
                <Skeleton className="h-[300px] w-full rounded-xl" />
                <Skeleton className="h-[400px] w-full md:col-span-2 rounded-xl" />
            </div>
        )}

        {data && !loading && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                
                {/* Resumen Ejecutivo */}
                <Card className="lg:col-span-2 border-2 border-primary/10 shadow-md">
                    <CardHeader className="bg-primary/5 border-b">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">Resumen Ejecutivo</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap font-medium">
                            {data.summary}
                        </p>
                    </CardContent>
                </Card>

                {/* KPI de Rendimiento */}
                <Card className="shadow-md border-2 border-green-500/10">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Estado de Recomendaciones</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <span className="text-sm font-medium">Acciones de Compra</span>
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">{data.recommendations.length}</Badge>
                        </div>
                        <div className="flex items-center justify-between border-b pb-2">
                            <span className="text-sm font-medium">Prioridad Alta</span>
                            <Badge variant="destructive">{data.recommendations.filter(r => r.priority === 'Alta').length}</Badge>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg flex items-center gap-3">
                            <PackageCheck className="h-8 w-8 text-green-600" />
                            <div>
                                <p className="text-xs font-bold text-green-800 uppercase">Salud de Stock</p>
                                <p className="text-sm font-bold text-green-700">Inventario monitoreado por IA</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Lista de Recomendaciones de Compra */}
                <div className="md:col-span-2 lg:col-span-3 space-y-4">
                    <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 px-2">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                        Plan de Acción de Reabastecimiento
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {data.recommendations.map((rec, idx) => (
                            <Card key={idx} className={`relative overflow-hidden border-2 transition-all hover:shadow-lg ${rec.priority === 'Alta' ? 'border-red-200 bg-red-50/20' : 'border-muted'}`}>
                                {rec.priority === 'Alta' && <div className="absolute top-0 right-0 h-12 w-12"><div className="absolute transform rotate-45 bg-red-500 text-white text-[8px] font-bold py-1 w-24 text-center top-3 -right-6 shadow-sm">URGENTE</div></div>}
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-base font-black truncate max-w-[80%] uppercase">{rec.productName}</CardTitle>
                                        <Badge variant={rec.priority === 'Alta' ? 'destructive' : rec.priority === 'Media' ? 'default' : 'secondary'} className="text-[9px] h-5">
                                            {rec.priority}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 pt-2">
                                    <div className="flex gap-2 items-start">
                                        <AlertCircle className={`h-4 w-4 shrink-0 mt-0.5 ${rec.priority === 'Alta' ? 'text-red-500' : 'text-primary'}`} />
                                        <p className="text-xs text-muted-foreground font-semibold leading-tight">{rec.reason}</p>
                                    </div>
                                    <div className="bg-background/80 p-3 rounded-lg border-2 border-dashed border-primary/20 flex flex-col gap-1">
                                        <span className="text-[10px] font-black uppercase text-primary">Acción Recomendada:</span>
                                        <p className="text-xs font-bold flex items-center gap-2">
                                            <ArrowRight className="h-3 w-3" />
                                            {rec.suggestedAction}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

            </div>
        )}
      </main>
    </div>
  );
}
