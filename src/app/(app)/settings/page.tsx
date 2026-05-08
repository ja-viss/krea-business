'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeData, setStoreData] = useState({
    name: '',
    rif: '',
    address: '',
    phone: '',
    email: '',
    seniatCondition: '',
    footerMessage: '',
  });

  useEffect(() => {
    async function fetchStore() {
      try {
        const storeId = localStorage.getItem('storeId');
        if (!storeId) return;

        const response = await fetch(`/api/settings/store?storeId=${storeId}`);
        if (response.ok) {
          const data = await response.json();
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
      } catch (error) {
        console.error("Error fetching store data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStore();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const storeId = localStorage.getItem('storeId');
      const response = await fetch('/api/settings/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, ...storeData }),
      });

      if (!response.ok) throw new Error('No se pudo guardar la configuración.');

      toast({
        title: "Configuración Guardada",
        description: "Los datos de la empresa han sido actualizados correctamente.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col p-4 md:p-8 space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader 
          title="Configuración" 
          description="Gestiona los datos fiscales de tu empresa para la facturación SENIAT." 
        />

        <div className="max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Datos de la Empresa</CardTitle>
              <CardDescription>Esta información aparecerá en el encabezado de tus facturas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Razón Social / Nombre</Label>
                  <Input 
                    id="name" 
                    value={storeData.name} 
                    onChange={(e) => setStoreData({...storeData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rif">RIF (Ej: J-12345678-9)</Label>
                  <Input 
                    id="rif" 
                    placeholder="J-00000000-0"
                    value={storeData.rif} 
                    onChange={(e) => setStoreData({...storeData, rif: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono de Contacto</Label>
                  <Input 
                    id="phone" 
                    value={storeData.phone} 
                    onChange={(e) => setStoreData({...storeData, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seniat">Condición SENIAT</Label>
                  <Input 
                    id="seniat" 
                    placeholder="Contribuyente Ordinario"
                    value={storeData.seniatCondition} 
                    onChange={(e) => setStoreData({...storeData, seniatCondition: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección Fiscal</Label>
                <Textarea 
                  id="address" 
                  value={storeData.address} 
                  onChange={(e) => setStoreData({...storeData, address: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footer">Mensaje al pie de factura</Label>
                <Input 
                  id="footer" 
                  value={storeData.footerMessage} 
                  onChange={(e) => setStoreData({...storeData, footerMessage: e.target.value})}
                />
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4 flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Cambios
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
