
'use client';

import { useState } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Zap, Star, Crown, Save, Users, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function SaasPlansPage() {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);

    const [plans, setPlans] = useState({
        basic: { price: 19.99, users: 3, invoices: 100 },
        pro: { price: 49.99, users: 10, invoices: 1000 },
        premium: { price: 99.99, users: 99, invoices: 10000 }
    });

    const handleSave = async () => {
        setSaving(true);
        // Simulación de guardado de configuración global
        setTimeout(() => {
            setSaving(false);
            toast({ title: "Planes Actualizados", description: "Los nuevos límites y tarifas ya están vigentes." });
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
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Precio Mensual ($)</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">$</span>
                        <Input 
                            type="number" 
                            className="pl-7 font-black text-lg h-12"
                            value={data.price}
                            onChange={e => setPlans({...plans, [keyName]: { ...data, price: parseFloat(e.target.value) || 0 }})}
                        />
                    </div>
                </div>
                
                <Separator className="my-2" />
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase flex items-center gap-1">
                            <Users className="h-3 w-3" /> Max. Usuarios
                        </Label>
                        <Input 
                            type="number" 
                            className="font-bold"
                            value={data.users}
                            onChange={e => setPlans({...plans, [keyName]: { ...data, users: parseInt(e.target.value) || 0 }})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase flex items-center gap-1">
                            <FileText className="h-3 w-3" /> Docs / Mes
                        </Label>
                        <Input 
                            type="number" 
                            className="font-bold"
                            value={data.invoices}
                            onChange={e => setPlans({...plans, [keyName]: { ...data, invoices: parseInt(e.target.value) || 0 }})}
                        />
                    </div>
                </div>
            </CardContent>
            <CardFooter className="bg-muted/5 border-t py-3">
                <p className="text-[9px] text-muted-foreground font-medium italic">
                    * Estos límites se aplicarán automáticamente a todos los clientes bajo este plan.
                </p>
            </CardFooter>
        </Card>
    );

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Estructura de Planes y Tarifas" 
                    description="Configura la oferta comercial y los candados del sistema."
                    actions={
                        <Button onClick={handleSave} disabled={saving} className="font-black uppercase shadow-xl shadow-primary/20">
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Guardar Cambios Globales
                        </Button>
                    }
                />

                <div className="grid gap-6 md:grid-cols-3">
                    <PlanCard 
                        title="Plan Básico" 
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
                        title="Krea Premium" 
                        icon={Crown} 
                        color="border-amber-200 bg-amber-50/10 shadow-amber-50" 
                        data={plans.premium} 
                        keyName="premium"
                    />
                </div>

                <Card className="border-2 border-dashed bg-muted/20">
                    <CardHeader>
                        <CardTitle className="text-sm font-black uppercase">Consideraciones del Sistema</CardTitle>
                        <CardDescription className="text-xs">
                            Krea Business utiliza estos valores para bloquear funciones en el frontend y backend de los clientes. 
                            Cualquier cambio aquí se reflejará en el próximo ciclo de facturación o de forma inmediata si fuerzas una purga de cache global.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </main>
        </div>
    );
}
