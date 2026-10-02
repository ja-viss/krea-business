
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, MapPin, Calculator, Printer, DollarSign, Lock, QrCode, ShieldAlert, AlertCircle, Store, Zap, Package, ShoppingBag, Laptop, Scissors, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const VENEZUELA_CITIES = [
    { name: 'Caracas (Centro)', lat: 10.4806, lng: -66.9036 },
    { name: 'Valencia (Carabobo)', lat: 10.1620, lng: -68.0077 },
    { name: 'Maracaibo (Zulia)', lat: 10.6427, lng: -71.6125 },
    { name: 'Barquisimeto (Lara)', lat: 10.0678, lng: -69.3473 },
    { name: 'Puerto La Cruz (Anzoátegui)', lat: 10.2167, lng: -64.6333 },
    { name: 'San Cristóbal (Táchira)', lat: 7.7669, lng: -72.2250 },
    { name: 'Mérida (Mérida)', lat: 8.5833, lng: -71.1333 },
    { name: 'Puerto Ordaz (Bolívar)', lat: 8.2970, lng: -62.7111 },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isGlobal, setIsGlobal] = useState(false);
  
  const [storeData, setStoreData] = useState<any>({
    name: '',
    rif: '',
    businessType: 'general',
    settings: {
      inventory: { hasVariants: false, trackSerials: false, trackBatches: false, enableBundles: true },
      sales: { allowLayaway: false, requireCustomerId: false, allowMixedPayments: true },
      pos: { defaultView: 'list', ticketWidth: 58 }
    },
    pagoMovil: { bankCode: '0102', phone: '', idNumber: '' }
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const storeId = localStorage.getItem('storeId');
        const isMaster = localStorage.getItem('isGlobalAdmin') === 'true';
        setIsGlobal(isMaster);

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

  const applyPreset = (type: 'moda' | 'jewelry' | 'tech' | 'general') => {
      const presets = {
          moda: {
              businessType: 'moda',
              settings: {
                  inventory: { hasVariants: true, trackSerials: false, trackBatches: false, enableBundles: false },
                  sales: { allowLayaway: true, requireCustomerId: true, allowMixedPayments: true },
                  pos: { defaultView: 'grid', ticketWidth: 80 }
              }
          },
          jewelry: {
              businessType: 'jewelry',
              settings: {
                  inventory: { hasVariants: false, trackSerials: false, trackBatches: false, enableBundles: true },
                  sales: { allowLayaway: true, requireCustomerId: false, allowMixedPayments: true },
                  pos: { defaultView: 'grid', ticketWidth: 58 }
              }
          },
          tech: {
              businessType: 'tech',
              settings: {
                  inventory: { hasVariants: false, trackSerials: true, trackBatches: true, enableBundles: true },
                  sales: { allowLayaway: false, requireCustomerId: true, allowMixedPayments: true },
                  pos: { defaultView: 'list', ticketWidth: 80 }
              }
          },
          general: {
              businessType: 'general',
              settings: {
                  inventory: { hasVariants: false, trackSerials: false, trackBatches: false, enableBundles: true },
                  sales: { allowLayaway: false, requireCustomerId: false, allowMixedPayments: true },
                  pos: { defaultView: 'list', ticketWidth: 58 }
              }
          }
      };

      setStoreData({ ...storeData, ...presets[type] });
      toast({ title: `Perfil ${type.toUpperCase()} aplicado`, description: "Revisa los interruptores habilitados." });
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
      toast({ title: "Configuración Actualizada", description: "El motor de la tienda ha sido recalibrado." });
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
        <PageHeader 
          title="Configuración Maestra" 
          description="Ajusta el ADN de tu negocio y sus módulos operativos." 
        />

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 border-2 h-auto grid grid-cols-2 md:grid-cols-5 w-full">
            <TabsTrigger value="profile" className="font-black text-[9px] uppercase"><Store className="mr-1.5 h-3 w-3" /> Perfil Negocio</TabsTrigger>
            <TabsTrigger value="fiscal" className="font-black text-[9px] uppercase"><Zap className="mr-1.5 h-3 w-3" /> Fiscal</TabsTrigger>
            <TabsTrigger value="inventory" className="font-black text-[9px] uppercase"><Package className="mr-1.5 h-3 w-3" /> Inventario</TabsTrigger>
            <TabsTrigger value="sales" className="font-black text-[9px] uppercase"><ShoppingBag className="mr-1.5 h-3 w-3" /> Ventas & POS</TabsTrigger>
            <TabsTrigger value="payments" className="font-black text-[9px] uppercase"><QrCode className="mr-1.5 h-3 w-3" /> Pagos</TabsTrigger>
          </TabsList>

          {/* TAB 1: PERFIL DE NEGOCIO (PRESETS) */}
          <TabsContent value="profile" className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { id: 'moda', label: 'Moda & Calzado', icon: Scissors, color: 'text-pink-600', bg: 'bg-pink-50' },
                    { id: 'tech', label: 'Tecnología', icon: Laptop, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { id: 'jewelry', label: 'Joyería & Accesorios', icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { id: 'general', label: 'Detal Genérico', icon: Store, color: 'text-slate-600', bg: 'bg-slate-50' },
                ].map((p) => (
                    <button 
                        key={p.id}
                        onClick={() => applyPreset(p.id as any)}
                        className={cn(
                            "p-6 rounded-2xl border-4 transition-all flex flex-col items-center gap-3 text-center",
                            storeData.businessType === p.id 
                                ? `border-primary shadow-xl ${p.bg}` 
                                : "border-transparent bg-white hover:border-muted-foreground/20"
                        )}
                    >
                        <p.icon className={cn("h-10 w-10", p.color)} />
                        <span className="font-black uppercase text-xs tracking-tighter">{p.label}</span>
                        {storeData.businessType === p.id && <Badge className="bg-primary uppercase text-[8px]">Activo</Badge>}
                    </button>
                ))}
            </div>

            <Card className="border-2 border-dashed bg-muted/20">
                <CardHeader>
                    <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" /> ¿Qué hace un perfil?
                    </CardTitle>
                    <CardDescription className="text-xs font-medium">
                        Al seleccionar un perfil, Krea adapta los formularios, el punto de venta y los reportes para que solo veas lo que tu industria necesita.
                    </CardDescription>
                </CardHeader>
            </Card>
          </TabsContent>

          {/* TAB 3: INVENTARIO PERSONALIZADO */}
          <TabsContent value="inventory" className="space-y-4">
            <Card className="border-2">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle className="text-sm font-black uppercase">Control de Existencias</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl border bg-white">
                        <div className="space-y-0.5">
                            <Label className="text-xs font-black uppercase">Gestión de Variantes</Label>
                            <p className="text-[10px] text-muted-foreground italic">Permite tallas, colores y dimensiones por producto.</p>
                        </div>
                        <Switch 
                            checked={storeData.settings.inventory.hasVariants}
                            onCheckedChange={(v) => setStoreData({...storeData, settings: {...storeData.settings, inventory: {...storeData.settings.inventory, hasVariants: v}}})}
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl border bg-white">
                        <div className="space-y-0.5">
                            <Label className="text-xs font-black uppercase">Rastreo de Seriales / IMEI</Label>
                            <p className="text-[10px] text-muted-foreground italic">Ideal para electrónica y garantías.</p>
                        </div>
                        <Switch 
                            checked={storeData.settings.inventory.trackSerials}
                            onCheckedChange={(v) => setStoreData({...storeData, settings: {...storeData.settings, inventory: {...storeData.settings.inventory, trackSerials: v}}})}
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl border bg-white">
                        <div className="space-y-0.5">
                            <Label className="text-xs font-black uppercase">Control de Lotes & Vencimiento</Label>
                            <p className="text-[10px] text-muted-foreground italic">Obligatorio para alimentos y farmacia.</p>
                        </div>
                        <Switch 
                            checked={storeData.settings.inventory.trackBatches}
                            onCheckedChange={(v) => setStoreData({...storeData, settings: {...storeData.settings, inventory: {...storeData.settings.inventory, trackBatches: v}}})}
                        />
                    </div>
                </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: VENTAS Y POS */}
          <TabsContent value="sales" className="space-y-4">
            <Card className="border-2">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle className="text-sm font-black uppercase">Experiencia en Punto de Venta</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase opacity-60">Vista Predeterminada POS</Label>
                            <Select 
                                value={storeData.settings.pos.defaultView} 
                                onValueChange={(v) => setStoreData({...storeData, settings: {...storeData.settings, pos: {...storeData.settings.pos, defaultView: v}}})}
                            >
                                <SelectTrigger className="font-bold"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="list" className="font-bold uppercase text-[10px]">Lista Rápida (Escáner)</SelectItem>
                                    <SelectItem value="grid" className="font-bold uppercase text-[10px]">Cuadrícula Visual (Fotos)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase opacity-60">Ancho de Ticket</Label>
                            <Select 
                                value={String(storeData.settings.pos.ticketWidth)} 
                                onValueChange={(v) => setStoreData({...storeData, settings: {...storeData.settings, pos: {...storeData.settings.pos, ticketWidth: parseInt(v)}}})}
                            >
                                <SelectTrigger className="font-bold"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="58" className="font-bold">58mm (Estándar)</SelectItem>
                                    <SelectItem value="80" className="font-bold">80mm (Empresarial)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between p-4 rounded-xl border bg-white">
                        <div className="space-y-0.5">
                            <Label className="text-xs font-black uppercase">Habilitar Apartados (Layaway)</Label>
                            <p className="text-[10px] text-muted-foreground italic">Permite reservar productos con un abono inicial.</p>
                        </div>
                        <Switch 
                            checked={storeData.settings.sales.allowLayaway}
                            onCheckedChange={(v) => setStoreData({...storeData, settings: {...storeData.settings, sales: {...storeData.settings.sales, allowLayaway: v}}})}
                        />
                    </div>
                </CardContent>
            </Card>
          </TabsContent>
          
          {/* TAB FISCAL REUTILIZADA */}
          <TabsContent value="fiscal">
            <Card className="border-2 shadow-lg">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle className="text-lg font-black uppercase italic tracking-tighter">Identidad Legal</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase opacity-60">Razón Social</Label>
                            <Input value={storeData.name} onChange={(e) => setStoreData({...storeData, name: e.target.value})} className="font-bold h-11" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase opacity-60">RIF Principal</Label>
                            <Input placeholder="J-00000000-0" value={storeData.rif} onChange={(e) => setStoreData({...storeData, rif: e.target.value})} className="font-mono font-bold h-11" />
                        </div>
                    </div>
                </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="pt-6 border-t flex justify-end">
            <Button onClick={handleSaveStore} disabled={saving} className="w-full sm:w-auto font-black uppercase h-14 px-12 shadow-2xl shadow-primary/20">
                {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                Guardar Configuración Global
            </Button>
        </div>
      </main>
    </div>
  );
}

const VENEZUELAN_BANKS = [
    { code: '0102', name: 'Banco de Venezuela' },
    { code: '0134', name: 'Banesco' },
    { code: '0105', name: 'Mercantil' },
    { code: '0108', name: 'Provincial' },
    { code: '0172', name: 'Bancamiga' },
    { code: '0174', name: 'Banplus' },
    { code: '0191', name: 'BNC' },
    { code: '0114', name: 'Bancaribe' },
    { code: '0163', name: 'Banco del Tesoro' },
];
