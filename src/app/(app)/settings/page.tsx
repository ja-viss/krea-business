
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ShieldAlert, KeyRound, Lock, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isGlobal, setIsGlobal] = useState(false);
  
  // Store Data
  const [storeData, setStoreData] = useState({
    name: '',
    rif: '',
    address: '',
    phone: '',
    email: '',
    seniatCondition: '',
    footerMessage: '',
  });

  // Master Security Data
  const [masterSecurity, setMasterSecurity] = useState({
    newPassword: '',
    masterUser: '',
    masterKeyAlpha: '',
    masterKeyBeta: '',
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const storeId = localStorage.getItem('storeId');
        const isMaster = localStorage.getItem('isGlobalAdmin') === 'true';
        setIsGlobal(isMaster);

        if (!storeId) return;

        // Cargar datos de la tienda
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
          });
        }

        // Si es master, cargar las llaves actuales (opcional para pre-llenar)
        // Por seguridad no las mostramos directamente al cargar, el admin debe saberlas para editarlas.
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
      const response = await fetch('/api/settings/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, ...storeData }),
      });

      if (!response.ok) throw new Error('No se pudo guardar la configuración fiscal.');

      toast({ title: "Configuración Guardada", description: "Datos fiscales actualizados." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMasterSecurity = async () => {
    setSaving(true);
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch('/api/admin/master-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...masterSecurity }),
      });

      if (!response.ok) throw new Error('Error al actualizar seguridad.');

      toast({ title: "Seguridad Actualizada", description: "Las llaves maestras han sido modificadas." });
      setMasterSecurity(prev => ({ ...prev, newPassword: '' })); // Limpiar campo pass
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error crítico", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 space-y-6"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-[400px] w-full" /></div>;

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader 
          title="Configuración de Sistema" 
          description={isGlobal ? "Gestión global de identidad y fiscalidad." : "Gestiona los datos fiscales de tu empresa."} 
        />

        <Tabs defaultValue="fiscal" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 border-2">
            <TabsTrigger value="fiscal" className="font-black text-xs uppercase">Datos Fiscales</TabsTrigger>
            <TabsTrigger value="security" className="font-black text-xs uppercase">Seguridad Acceso</TabsTrigger>
          </TabsList>

          {/* TAB 1: DATOS FISCALES (STORE) */}
          <TabsContent value="fiscal">
            <div className="max-w-3xl">
              <Card className="border-2 shadow-md">
                <CardHeader className="bg-muted/10 border-b">
                  <CardTitle className="text-lg font-black uppercase">Información de la Empresa</CardTitle>
                  <CardDescription>Estos datos aparecerán en el encabezado de las facturas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase">Razón Social</Label>
                      <Input value={storeData.name} onChange={(e) => setStoreData({...storeData, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase">RIF</Label>
                      <Input placeholder="J-00000000-0" value={storeData.rif} onChange={(e) => setStoreData({...storeData, rif: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase">Teléfono</Label>
                      <Input value={storeData.phone} onChange={(e) => setStoreData({...storeData, phone: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase">Condición SENIAT</Label>
                      <Input value={storeData.seniatCondition} onChange={(e) => setStoreData({...storeData, seniatCondition: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase">Dirección Fiscal</Label>
                    <Textarea value={storeData.address} onChange={(e) => setStoreData({...storeData, address: e.target.value})} />
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4 flex justify-end bg-muted/5">
                  <Button onClick={handleSaveStore} disabled={saving} className="font-black uppercase">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Fiscal
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: SEGURIDAD (USER & MASTER KEYS) */}
          <TabsContent value="security">
             <div className="max-w-3xl space-y-6">
                {/* Primer Login: Perfil Personal */}
                <Card className="border-2">
                    <CardHeader className="bg-muted/10 border-b">
                        <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                            <User className="h-5 w-5" /> Acceso Nivel 1 (Login Krea)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase">Nueva Contraseña del Perfil</Label>
                            <Input 
                                type="password" 
                                placeholder="Dejar en blanco para no cambiar" 
                                value={masterSecurity.newPassword}
                                onChange={e => setMasterSecurity({...masterSecurity, newPassword: e.target.value})}
                            />
                            <p className="text-[10px] text-muted-foreground italic">Cambia la clave que ingresas al entrar por /login.</p>
                        </div>
                    </CardContent>
                    {!isGlobal && (
                        <CardFooter className="border-t py-4 justify-end">
                            <Button onClick={handleSaveMasterSecurity} disabled={saving} className="font-black uppercase">
                                Actualizar Perfil
                            </Button>
                        </CardFooter>
                    )}
                </Card>

                {/* Segundo Login: Exclusivo Super Admin */}
                {isGlobal && (
                    <Card className="border-4 border-primary/20 bg-primary/5">
                        <CardHeader className="bg-primary/10 border-b border-primary/20">
                            <CardTitle className="text-lg font-black uppercase flex items-center gap-2 text-primary">
                                <ShieldAlert className="h-6 w-6" /> Núcleo de Seguridad Maestra (Nivel 2)
                            </CardTitle>
                            <CardDescription className="text-primary/70 font-bold italic">
                                Modifica las llaves del desafío de los 40 segundos. ¡Precaución Extrema!
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">Identificador Maestro</Label>
                                    <Input 
                                        className="bg-background font-mono font-bold"
                                        placeholder="Ej: javistech"
                                        value={masterSecurity.masterUser}
                                        onChange={e => setMasterSecurity({...masterSecurity, masterUser: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">Master Key Alpha</Label>
                                    <Input 
                                        className="bg-background font-mono"
                                        type="password"
                                        placeholder="Nueva llave Alpha"
                                        value={masterSecurity.masterKeyAlpha}
                                        onChange={e => setMasterSecurity({...masterSecurity, masterKeyAlpha: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">Master Key Beta</Label>
                                    <Input 
                                        className="bg-background font-mono"
                                        type="password"
                                        placeholder="Nueva llave Beta"
                                        value={masterSecurity.masterKeyBeta}
                                        onChange={e => setMasterSecurity({...masterSecurity, masterKeyBeta: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="p-4 bg-amber-50 border-2 border-amber-500 rounded-xl flex items-start gap-3">
                                <Lock className="h-5 w-5 text-amber-600 shrink-0 mt-1" />
                                <p className="text-[10px] font-bold text-amber-800 leading-tight">
                                    Al guardar, estas serán las nuevas credenciales requeridas para pasar la pantalla de verificación maestra. 
                                    Asegúrese de anotarlas en un lugar seguro antes de aplicarlas.
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t border-primary/20 py-4 justify-end bg-primary/10">
                             <Button onClick={handleSaveMasterSecurity} disabled={saving} className="font-black uppercase shadow-lg shadow-primary/30">
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                                Aplicar Cambios Maestros
                            </Button>
                        </CardFooter>
                    </Card>
                )}
             </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
