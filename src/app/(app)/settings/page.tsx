
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, 
    Save, 
    Zap, 
    Package, 
    ShoppingBag, 
    Store, 
    QrCode, 
    Scissors, 
    Laptop, 
    Sparkles, 
    Bot, 
    Key, 
    RefreshCcw, 
    ShieldCheck, 
    Copy, 
    Check 
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import crypto from 'crypto';

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [storeData, setStoreData] = useState<any>({
    name: '',
    rif: '',
    businessType: 'general',
    settings: {
      inventory: { hasVariants: false, trackSerials: false, trackBatches: false, enableBundles: true },
      sales: { allowLayaway: false, requireCustomerId: false, allowMixedPayments: true },
      pos: { defaultView: 'list', ticketWidth: 58 }
    },
    botApi: { enabled: false, apiKey: '', permissions: ['read:orders', 'read:catalog'] }
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const storeId = localStorage.getItem('storeId');
        if (!storeId || storeId === 'SYSTEM_MASTER') {
            setLoading(false);
            return;
        }
        const storeRes = await fetch(`/api/settings/store?storeId=${storeId}`);
        if (storeRes.ok) {
          const data = await storeRes.json();
          setStoreData(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const generateApiKey = () => {
      const key = `krea_live_${crypto.randomBytes(24).toString('hex')}`;
      setStoreData({
          ...storeData,
          botApi: { ...storeData.botApi, apiKey: key, enabled: true }
      });
      toast({ title: "Nueva API Key generada", description: "No olvides guardar los cambios." });
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copiado al portapapeles" });
  };

  const handleSaveStore = async () => {
    setSaving(true);
    try {
      const storeId = localStorage.getItem('storeId');
      const response = await fetch('/api/settings/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, ...storeData }),
      });
      if (!response.ok) throw new Error('Error al guardar');
      toast({ title: "Configuración Actualizada" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-10 w-1/4" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-6xl mx-auto w-full">
        <PageHeader title="Configuración Maestra" description="Ajusta el ADN de tu negocio e integraciones." />

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 border-2 h-auto grid grid-cols-2 md:grid-cols-6 w-full">
            <TabsTrigger value="profile" className="font-black text-[9px] uppercase">Perfil</TabsTrigger>
            <TabsTrigger value="fiscal" className="font-black text-[9px] uppercase">Fiscal</TabsTrigger>
            <TabsTrigger value="inventory" className="font-black text-[9px] uppercase">Inventario</TabsTrigger>
            <TabsTrigger value="sales" className="font-black text-[9px] uppercase">Ventas</TabsTrigger>
            <TabsTrigger value="integrations" className="font-black text-[9px] uppercase"><Bot className="h-3 w-3 mr-1" /> Bots API</TabsTrigger>
          </TabsList>

          <TabsContent value="integrations" className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <Card className="border-2 shadow-xl overflow-hidden">
                <CardHeader className="bg-primary/5 border-b flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-black uppercase italic tracking-tighter">Krea Connect (Bot API)</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase">Integra tu tienda con n8n, WhatsApp y Chatbots.</CardDescription>
                    </div>
                    <Switch 
                        checked={storeData.botApi?.enabled} 
                        onCheckedChange={(v) => setStoreData({...storeData, botApi: {...storeData.botApi, enabled: v}})}
                    />
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                            <Key className="h-3 w-3" /> Llave de Acceso Privada
                        </Label>
                        <div className="flex gap-2">
                            <Input 
                                value={storeData.botApi?.apiKey || ''} 
                                readOnly 
                                placeholder="Genera una llave para empezar"
                                className="font-mono text-[10px] h-12 bg-muted/30 border-2"
                            />
                            <Button variant="outline" size="icon" className="h-12 w-12" onClick={() => copyToClipboard(storeData.botApi?.apiKey)}>
                                {copied ? <Check className="text-green-600" /> : <Copy />}
                            </Button>
                            <Button variant="secondary" onClick={generateApiKey} className="h-12 font-black uppercase text-[10px]">
                                <RefreshCcw className="mr-2 h-4 w-4" /> Regenerar
                            </Button>
                        </div>
                        <p className="text-[9px] font-bold text-red-600 italic">
                            ADVERTENCIA: No compartas esta llave. Permite acceso de lectura a tus pedidos y catálogo.
                        </p>
                    </div>

                    <Separator />

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase">Endpoints Disponibles</Label>
                            <div className="space-y-2">
                                <div className="p-3 bg-muted/20 rounded-lg border-2 border-dashed flex justify-between items-center">
                                    <span className="text-[10px] font-bold font-mono">GET /v1/bot/orders/lookup</span>
                                    <Badge variant="outline" className="text-[8px] font-black">READ</Badge>
                                </div>
                                <div className="p-3 bg-muted/20 rounded-lg border-2 border-dashed flex justify-between items-center">
                                    <span className="text-[10px] font-bold font-mono">POST /v1/bot/payments/report</span>
                                    <Badge variant="outline" className="text-[8px] font-black bg-amber-50">WRITE</Badge>
                                </div>
                            </div>
                        </div>
                        <div className="bg-primary/5 p-4 rounded-2xl border-2 border-primary/10">
                            <h4 className="text-[11px] font-black uppercase text-primary mb-2 flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4" /> Configuración n8n
                            </h4>
                            <p className="text-[10px] font-medium leading-relaxed">
                                Para conectar con n8n, utiliza un nodo <strong>HTTP Request</strong> con estas cabeceras:
                            </p>
                            <pre className="mt-2 text-[9px] font-mono bg-black text-green-400 p-3 rounded-lg overflow-x-auto">
                                x-api-key: {storeData.botApi?.apiKey || 'SU_LLAVE'}<br/>
                                x-tenant-id: {localStorage.getItem('storeId')}
                            </pre>
                        </div>
                    </div>
                </CardContent>
            </Card>
          </TabsContent>

          {/* Conservamos el resto de pestañas... */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { id: 'moda', label: 'Moda & Calzado', icon: Scissors, color: 'text-pink-600', bg: 'bg-pink-50' },
                    { id: 'tech', label: 'Tecnología', icon: Laptop, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { id: 'jewelry', label: 'Joyería & Accesorios', icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { id: 'general', label: 'Detal Genérico', icon: Store, color: 'text-slate-600', bg: 'bg-slate-50' },
                ].map((p) => (
                    <button key={p.id} onClick={() => setStoreData({...storeData, businessType: p.id})}
                        className={cn("p-6 rounded-2xl border-4 transition-all flex flex-col items-center gap-3 text-center",
                            storeData.businessType === p.id ? `border-primary shadow-xl ${p.bg}` : "border-transparent bg-white hover:border-muted-foreground/20")}>
                        <p.icon className={cn("h-10 w-10", p.color)} /><span className="font-black uppercase text-xs tracking-tighter">{p.label}</span>
                    </button>
                ))}
            </div>
          </TabsContent>
          
          <TabsContent value="fiscal">
            <Card className="border-2 shadow-lg"><CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Razón Social</Label><Input value={storeData.name} onChange={(e) => setStoreData({...storeData, name: e.target.value})} className="font-bold h-11" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase">RIF</Label><Input value={storeData.rif} onChange={(e) => setStoreData({...storeData, rif: e.target.value})} className="font-mono font-bold h-11" /></div>
                </div>
            </CardContent></Card>
          </TabsContent>
        </Tabs>

        <div className="pt-6 border-t flex justify-end">
            <Button onClick={handleSaveStore} disabled={saving} className="w-full sm:w-auto font-black uppercase h-14 px-12 shadow-2xl">
                {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                Guardar Configuración
            </Button>
        </div>
      </main>
    </div>
  );
}
