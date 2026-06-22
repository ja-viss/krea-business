
'use client';

import { useState } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Zap, Star, Crown, Save, Users, FileText, HardDrive, Clock, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function SaasPlansPage() {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);

    const [plans, setPlans] = useState({
        basic: { price: 19.99, users: 3, invoices: 500, label: 'Pequeño (Abasto)', duration: '21 meses' },
        pro: { price: 49.99, users: 10, invoices: 2000, label: 'Mediano (Supermercado)', duration: '5 meses' },
        premium: { price: 99.99, users: 99, invoices: 10000, label: 'Grande (Mayorista)', duration: '1 mes' }
    });

    const handleSave = async () => {
        setSaving(true);
        setTimeout(() => {
            setSaving(false);
            toast({ title: "Planes Actualizados", description: "Los nuevos límites y tarifas ya están vigentes para el provisionamiento." });
        }, 1000);
    };

    const PlanCard = ({ title, icon: Icon, color, data, keyName }: any) => (
        <Card className={`border-2 overflow-hidden transition-all hover:shadow-lg ${color}`}>
            <CardHeader className="bg-muted/10 border-b pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        <CardTitle className="text-lg font-black uppercase tracking-tight">{title}</CardTitle>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-primary uppercase">{data.label}</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black">${data.price}</span>
                        <span className="text-[10px] font-bold text-muted-foreground">/ mes</span>
                    </div>
                </div>

                <Separator className="my-2" />
                
                <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-bold uppercase">Facturas / Mes</span>
                        </div>
                        <span className="font-black text-sm">{data.invoices.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-bold uppercase">Usuarios Max.</span>
                        </div>
                        <span className="font-black text-sm">{data.users}</span>
                    </div>
                    <div className="flex items-center justify-between bg-primary/5 p-2 rounded-lg">
                        <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            <span className="text-[10px] font-black uppercase text-primary">Vida útil (500MB)</span>
                        </div>
                        <span className="font-black text-xs text-primary">{data.duration}</span>
                    </div>
                </div>

                <div className="pt-2">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground mb-1 block">Ajuste de Precio ($)</Label>
                    <Input 
                        type="number" 
                        value={data.price}
                        onChange={e => setPlans({...plans, [keyName]: { ...data, price: parseFloat(e.target.value) || 0 }})}
                        className="h-8 font-bold"
                    />
                </div>
            </CardContent>
            <CardFooter className="bg-muted/5 border-t py-3">
                <p className="text-[9px] text-muted-foreground font-medium italic">
                    * Basado en un tamaño promedio de 4KB por factura.
                </p>
            </CardFooter>
        </Card>
    );

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Estructura Comercial" 
                    description="Configura los límites de almacenamiento y facturación de Krea Business."
                    actions={
                        <Button onClick={handleSave} disabled={saving} className="font-black uppercase shadow-xl shadow-primary/20">
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Guardar Tarifario
                        </Button>
                    }
                />

                <div className="grid gap-6 md:grid-cols-3">
                    <PlanCard 
                        title="Básico" 
                        icon={Star} 
                        color="border-blue-100" 
                        data={plans.basic} 
                        keyName="basic"
                    />
                    <PlanCard 
                        title="Profesional" 
                        icon={Zap} 
                        color="border-primary/20 bg-primary/5 shadow-primary/5" 
                        data={plans.pro} 
                        keyName="pro"
                    />
                    <PlanCard 
                        title="Premium" 
                        icon={Crown} 
                        color="border-amber-200 bg-amber-50/10 shadow-amber-50" 
                        data={plans.premium} 
                        keyName="premium"
                    />
                </div>

                <Card className="border-2 border-dashed bg-muted/20">
                    <CardHeader>
                        <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                            <HardDrive className="h-4 w-4" /> Consideraciones de Infraestructura
                        </CardTitle>
                        <CardDescription className="text-xs font-medium">
                            El cálculo de "Vida Útil" asume un provisionamiento de 500MB en MongoDB Atlas. 
                            Cuando un cliente alcanza los 500MB, el sistema le impedirá crear nuevos registros hasta que realice un upgrade de almacenamiento.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </main>
        </div>
    );
}
