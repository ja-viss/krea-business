
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ShieldAlert, KeyRound, Lock, User, QrCode, Calculator } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

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
    { code: '0128', name: 'Banco Caroní' },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isGlobal, setIsGlobal] = useState(false);
  
  const [storeData, setStoreData] = useState({
    name: '',
    rif: '',
    address: '',
    phone: '',
    email: '',
    seniatCondition: '',
    footerMessage: '',
    enforceCashControl: true,
    pagoMovil: {
        bankCode: '0102',
        phone: '',
        idNumber: ''
    }
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
          setStoreData({
            name: data.name || '',
            rif: data.rif || '',
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || '',
            seniatCondition: data.seniatCondition || 'Contribuyente Ordinario del IVA',
            footerMessage: data.footerMessage || 'Gracias por su compra',
            enforceCashControl: data.enforceCashControl !== false,
            pagoMovil: {
                bankCode: data.pagoMovil?.bankCode || '0102',
                phone: data.pagoMovil?.phone || '',
                idNumber: data.pagoMovil?.idNumber || ''
            }
          });
        }
      } catch (error) {
        console.error("Error fetching settings data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSaveStore = async () => {
    setSaving(true);
    try {
      const storeId = localStorage.getItem('storeId');
      const userId = localStorage.getItem('userId');
      const userName = localStorage.getItem('userName');

      if (!storeId) throw new Error("Sesión no válida.");

      const response = await fetch('/api/settings/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            storeId, 
            userId, 
            userName, 
            ...storeData 
        }),
      });

      if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message || 'No se pudo guardar la configuración.');
      }

      toast({ title: "Configuración Guardada", description: "Datos actualizados correctamente." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al Guardar", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 md:p-8 space-y-6"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-[400px] w-full rounded-2xl" /></div>;

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-5xl mx-auto w-full">
        <PageHeader 
          title="Configuración" 
          description={isGlobal ? "Gestión global del núcleo Krea." : "Parámetros fiscales y de recaudación de tu negocio."} 
        />

        <Tabs defaultValue="fiscal" className="space-y-6">
          <TabsList className="grid grid-cols-3 bg-muted/50 p-1 border-2 w-full lg:w-[500px] h-12">
            <TabsTrigger value="fiscal" className="font-black text-[10px] uppercase">Fiscal / Operación</TabsTrigger>
            <TabsTrigger value="payments" className="font-black text-[10px] uppercase">Cobros QR</TabsTrigger>
            <TabsTrigger value="security" className="font-black text-[10px] uppercase">Acceso</TabsTrigger>
          </TabsList>

          <TabsContent value="fiscal">
            <Card className="border-2 shadow-lg">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle className="text-lg font-black uppercase italic">Identidad y Operación</CardTitle>
                    <CardDescription className="font-bold">Datos legales y modo de trabajo del punto de venta.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Razón Social</Label>
                            <Input value={storeData.name} onChange={(e) => setStoreData({...storeData, name: e.target.value})} className="font-bold" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">RIF Principal</Label>
                            <Input placeholder="J-00000000-0" value={storeData.rif} onChange={(e) => setStoreData({...storeData, rif: e.target.value})} className="font-mono font-bold" />
                        </div>
                    </div>

                    <Separator />

                    <div className="p-4 rounded-xl border-2 border-primary/20 bg-primary/[0.02] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary text-white p-2 rounded-lg">
                                <Calculator className="h-5 w-5" />
                            </div>
                            <div className="space-y-0.5">
                                <Label className="text-xs font-black uppercase">Control de Turnos (Caja Registradora)</Label>
                                <p className="text-[10px] text-muted-foreground font-medium italic">Activa o desactiva la obligación de abrir/cerrar caja para operar.</p>
                            </div>
                        </div>
                        <Switch 
                            checked={storeData.enforceCashControl}
                            onCheckedChange={(checked) => setStoreData({...storeData, enforceCashControl: checked})}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Teléfono de Contacto</Label>
                            <Input value={storeData.phone} onChange={(e) => setStoreData({...storeData, phone: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Condición SENIAT</Label>
                            <Input value={storeData.seniatCondition} onChange={(e) => setStoreData({...storeData, seniatCondition: e.target.value})} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Dirección Fiscal</Label>
                        <Textarea value={storeData.address} onChange={(e) => setStoreData({...storeData, address: e.target.value})} className="min-h-[80px]" />
                    </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4 flex justify-end bg-muted/5">
                    <Button onClick={handleSaveStore} disabled={saving} className="w-full sm:w-auto font-black uppercase shadow-xl">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Actualizar Entidad
                    </Button>
                </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card className="border-2 shadow-xl border-primary/10">
                <CardHeader className="bg-primary/5 border-b">
                    <CardTitle className="text-lg font-black uppercase flex items-center gap-2 text-primary italic">
                        <QrCode className="h-5 w-5" /> Cobros QR (Suiche 7B)
                    </CardTitle>
                    <CardDescription className="font-bold">Datos para la generación automática de Pago Móvil en el POS.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl flex items-start gap-3">
                        <ShieldAlert className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] font-bold text-blue-800 leading-tight">
                            Asegúrese de que el número telefónico y RIF coincidan exactamente con los registrados en su banca en línea.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-primary">Banco Receptor</Label>
                            <Select 
                                value={storeData.pagoMovil.bankCode} 
                                onValueChange={(val) => setStoreData({...storeData, pagoMovil: { ...storeData.pagoMovil, bankCode: val }})}
                            >
                                <SelectTrigger className="font-bold h-11">
                                    <SelectValue placeholder="Elegir banco" />
                                </SelectTrigger>
                                <SelectContent>
                                    {VENEZUELAN_BANKS.map(bank => (
                                        <SelectItem key={bank.code} value={bank.code} className="font-bold text-xs uppercase">
                                            {bank.name} ({bank.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-primary">Teléfono Afiliado</Label>
                            <Input 
                                placeholder="Ej: 04121234567" 
                                value={storeData.pagoMovil.phone}
                                onChange={(e) => setStoreData({...storeData, pagoMovil: { ...storeData.pagoMovil, phone: e.target.value }})}
                                className="font-mono font-bold h-11 border-2"
                            />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                            <Label className="text-[10px] font-black uppercase text-primary">Cédula o RIF del Titular</Label>
                            <Input 
                                placeholder="Ej: J-12345678-9" 
                                value={storeData.pagoMovil.idNumber}
                                onChange={(e) => setStoreData({...storeData, pagoMovil: { ...storeData.pagoMovil, idNumber: e.target.value }})}
                                className="font-mono font-bold uppercase h-11 border-2"
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4 flex justify-end bg-muted/5">
                    <Button onClick={handleSaveStore} disabled={saving} className="w-full sm:w-auto font-black uppercase shadow-lg shadow-primary/20">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Sincronizar Cobros
                    </Button>
                </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="border-2 shadow-md">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle className="text-lg font-black uppercase flex items-center gap-2 italic">
                        <Lock className="h-5 w-5" /> Seguridad de Acceso
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase">Nueva Contraseña del Perfil</Label>
                            <Input 
                                type="password" 
                                placeholder="Solo para cambiar" 
                                className="h-11"
                            />
                            <p className="text-[10px] text-muted-foreground italic font-medium">Recomendamos al menos 8 caracteres con números y símbolos.</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="border-t py-4 justify-end">
                    <Button variant="outline" className="w-full sm:w-auto font-black uppercase">
                        Actualizar Perfil
                    </Button>
                </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
