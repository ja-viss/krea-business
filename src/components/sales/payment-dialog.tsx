
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    CreditCard, 
    Banknote, 
    Smartphone, 
    Plus, 
    Trash2, 
    ShieldCheck,
    Coins,
    Zap,
    Loader2,
    Calculator
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface Payment {
    method: string;
    amount: number;
    currency: string;
    reference?: string;
    bank?: string;
    amountReceived?: number; // Lo que entregó el cliente físicamente
    changeGiven?: number;    // Vuelto entregado
}

interface PaymentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    totalVES: number;
    totalUSD: number;
    tasaBCV: number;
    onConfirm: (payments: Payment[]) => void;
    isSubmitting: boolean;
}

export function PaymentDialog({ isOpen, onClose, totalVES, totalUSD, tasaBCV, onConfirm, isSubmitting }: PaymentDialogProps) {
    const { toast } = useToast();
    const [payments, setPayments] = useState<Payment[]>([]);
    
    // Estado para el pago actual que se está configurando
    const [currentAmount, setCurrentAmount] = useState(''); // El monto que VA a la deuda
    const [receivedAmount, setReceivedAmount] = useState(''); // El monto que el cliente ENTREGA (para vuelto)
    const [currentMethod, setCurrentMethod] = useState('Efectivo');
    const [currentCurrency, setCurrentCurrency] = useState('USD');
    const [reference, setReference] = useState('');
    const [bank, setBank] = useState('');

    // Cálculo de totales liquidados
    const paidVES = useMemo(() => {
        return payments.reduce((acc, p) => {
            if (p.currency === 'VES') return acc + p.amount;
            return acc + (p.amount * tasaBCV);
        }, 0);
    }, [payments, tasaBCV]);

    const remainingVES = Math.max(0, totalVES - paidVES);
    const remainingUSD = tasaBCV > 0 ? remainingVES / tasaBCV : 0;

    // Cálculo de vuelto para el pago actual (antes de añadirlo)
    const currentChange = useMemo(() => {
        const received = parseFloat(receivedAmount);
        const toPay = parseFloat(currentAmount);
        if (isNaN(received) || isNaN(toPay) || received <= toPay) return 0;
        return received - toPay;
    }, [receivedAmount, currentAmount]);

    // Al abrir o cambiar el monto restante, sugerir el pago completo
    useEffect(() => {
        if (isOpen && remainingVES > 0 && currentAmount === '') {
            if (currentCurrency === 'USD') {
                setCurrentAmount(remainingUSD.toFixed(2));
                setReceivedAmount(remainingUSD.toFixed(2));
            } else {
                setCurrentAmount(remainingVES.toFixed(2));
                setReceivedAmount(remainingVES.toFixed(2));
            }
        }
    }, [isOpen, remainingVES, currentCurrency, remainingUSD]);

    const handleAddPayment = () => {
        const amount = parseFloat(currentAmount);
        const received = parseFloat(receivedAmount) || amount;
        
        if (isNaN(amount) || amount <= 0) {
            toast({ variant: 'destructive', title: "Monto inválido" });
            return;
        }

        if (received < amount) {
            toast({ variant: 'destructive', title: "Error", description: "El monto recibido no puede ser menor al monto a abonar." });
            return;
        }

        setPayments([...payments, {
            method: currentMethod,
            amount,
            currency: currentCurrency,
            reference: reference || undefined,
            bank: bank || undefined,
            amountReceived: received,
            changeGiven: received - amount
        }]);

        // Limpiar campos para el siguiente método
        setCurrentAmount('');
        setReceivedAmount('');
        setReference('');
        setBank('');
    };

    const removePayment = (index: number) => {
        setPayments(payments.filter((_, i) => i !== index));
    };

    const canFinalize = paidVES >= (totalVES - 0.01);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[800px] border-4 rounded-3xl p-0 overflow-hidden flex flex-col md:max-h-[90vh]">
                <div className="bg-slate-900 p-6 text-white shrink-0">
                    <DialogHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2 text-primary">
                                    <ShieldCheck className="h-6 w-6" /> Liquidación y Vueltos
                                </DialogTitle>
                                <DialogDescription className="text-white/40 font-bold uppercase text-[10px]">
                                    Control de cobro multimoneda v92.0
                                </DialogDescription>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase opacity-40">Deuda Total</p>
                                <p className="text-3xl font-black tracking-tighter">Bs. {totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                                <p className="text-xs font-bold text-primary">$ {totalUSD.toFixed(2)}</p>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto">
                    {/* COLUMNA 1: ENTRADA DE DINERO */}
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">1. Seleccionar Método</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'Efectivo', icon: Banknote },
                                    { id: 'Pago Móvil', icon: Smartphone },
                                    { id: 'Tarjeta', icon: CreditCard },
                                    { id: 'Zelle', icon: Zap },
                                ].map((m) => (
                                    <Button 
                                        key={m.id} 
                                        type="button"
                                        variant={currentMethod === m.id ? 'default' : 'outline'} 
                                        className={cn(
                                            "h-14 font-black uppercase text-[10px] flex flex-col gap-1 rounded-xl transition-all", 
                                            currentMethod === m.id ? "ring-4 ring-primary/20 bg-primary" : "hover:bg-primary/5"
                                        )}
                                        onClick={() => {
                                            setCurrentMethod(m.id);
                                            setCurrentCurrency(m.id === 'Efectivo' || m.id === 'Zelle' ? 'USD' : 'VES');
                                        }}
                                    >
                                        <m.icon className="h-4 w-4" />
                                        {m.id}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 p-4 bg-muted/30 rounded-2xl border-2 border-dashed">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-primary">Monto Recibido</Label>
                                    <div className="relative">
                                        <Input 
                                            type="number" 
                                            className="h-12 font-black text-xl pl-10 border-2" 
                                            placeholder="0.00"
                                            value={receivedAmount}
                                            onChange={e => {
                                                setReceivedAmount(e.target.value);
                                                // Por defecto, lo recibido es lo que se abona a menos que se cambie
                                                if (currentMethod === 'Efectivo') {
                                                    // No autocompletar abono si es efectivo para permitir cálculo de vuelto
                                                } else {
                                                    setCurrentAmount(e.target.value);
                                                }
                                            }}
                                            onFocus={(e) => e.target.select()}
                                        />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-primary/50">{currentCurrency === 'USD' ? '$' : 'Bs'}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Abonar a Deuda</Label>
                                    <div className="relative">
                                        <Input 
                                            type="number" 
                                            className="h-12 font-black text-xl pl-10 bg-white" 
                                            placeholder="0.00"
                                            value={currentAmount}
                                            onChange={e => setCurrentAmount(e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                        />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-muted-foreground/50">{currentCurrency === 'USD' ? '$' : 'Bs'}</span>
                                    </div>
                                </div>
                            </div>

                            {currentChange > 0 && currentMethod === 'Efectivo' && (
                                <div className="bg-amber-50 border-2 border-amber-200 p-3 rounded-xl flex items-center justify-between animate-in zoom-in-95">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-amber-500 text-white rounded-lg"><Calculator className="h-4 w-4" /></div>
                                        <span className="text-[10px] font-black uppercase text-amber-800">Vuelto Sugerido</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-amber-900 leading-none">
                                            {currentCurrency === 'USD' ? '$' : 'Bs.'} {currentChange.toLocaleString()}
                                        </p>
                                        <p className="text-[8px] font-bold text-amber-700 uppercase">
                                            Eq: Bs. {(currentCurrency === 'USD' ? currentChange * tasaBCV : currentChange).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {(currentMethod !== 'Efectivo') && (
                                <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2">
                                    <div className="space-y-1">
                                        <Label className="text-[8px] font-black uppercase opacity-50 ml-1">Banco / Origen</Label>
                                        <Input placeholder="Ej: Mercantil" className="h-9 text-xs font-bold" value={bank} onChange={e => setBank(e.target.value.toUpperCase())} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[8px] font-black uppercase opacity-50 ml-1">Referencia / Lote</Label>
                                        <Input placeholder="Últimos 4-6" className="h-9 text-xs font-bold" value={reference} onChange={e => setReference(e.target.value)} />
                                    </div>
                                </div>
                            )}

                            <Button className="w-full h-12 font-black uppercase shadow-lg" onClick={handleAddPayment} disabled={!currentAmount || parseFloat(currentAmount) <= 0}>
                                <Plus className="mr-2 h-4 w-4" /> Registrar Abono
                            </Button>
                        </div>
                    </div>

                    {/* COLUMNA 2: LISTA DE PAGOS Y RESUMEN FINAL */}
                    <div className="flex flex-col gap-4">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                            <Coins className="h-3 w-3" /> Resumen de Liquidación
                        </Label>
                        
                        <div className="flex-1 space-y-2 overflow-y-auto max-h-[300px] min-h-[150px] pr-2 scrollbar-hide border-2 border-dashed rounded-2xl p-2 bg-slate-50/50">
                            {payments.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
                                    <Banknote className="h-10 w-10 mb-2" />
                                    <p className="text-[10px] font-black uppercase">Esperando pagos...</p>
                                </div>
                            ) : (
                                payments.map((p, idx) => (
                                    <div key={idx} className="bg-white border-2 rounded-xl p-3 flex justify-between items-center group hover:border-primary transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                                                {p.method === 'Efectivo' ? <Banknote className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase leading-none mb-1">{p.method}</p>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="font-black text-sm">{p.currency === 'USD' ? '$' : 'Bs.'} {p.amount.toLocaleString()}</span>
                                                    {p.changeGiven! > 0 && <Badge variant="outline" className="text-[7px] font-black uppercase border-amber-200 bg-amber-50 text-amber-700">VUELTO ENTREGADO</Badge>}
                                                </div>
                                                {p.reference && <p className="text-[8px] font-mono opacity-60">Ref: {p.reference} {p.bank ? `(${p.bank})` : ''}</p>}
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removePayment(idx)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="space-y-3 bg-slate-900 text-white p-5 rounded-2xl shadow-xl">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase opacity-40">Suma Recibida:</span>
                                <span className="text-sm font-black text-green-400">Bs. {paidVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <Separator className="bg-white/10" />
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase opacity-40 italic">Resta por Cobrar:</span>
                                <span className={cn("text-xl font-black tracking-tighter", remainingVES > 0.01 ? "text-red-400" : "text-primary animate-pulse")}>
                                    {remainingVES > 0.01 ? `Bs. ${remainingVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}` : 'SALDO CUBIERTO'}
                                </span>
                            </div>
                            {remainingVES > 0.01 && (
                                <p className="text-right text-[9px] font-bold text-red-400/60 uppercase">Equiv: $ {remainingUSD.toFixed(2)}</p>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-slate-50 border-t shrink-0">
                    <Button variant="ghost" className="font-bold uppercase text-xs" onClick={onClose}>Cancelar</Button>
                    <Button 
                        className="h-16 px-12 text-lg font-black uppercase shadow-2xl rounded-2xl flex-1 bg-primary hover:bg-primary/90"
                        disabled={!canFinalize || isSubmitting}
                        onClick={() => onConfirm(payments)}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : <ShieldCheck className="mr-2 h-6 w-6" />}
                        PROCESAR DESPACHO
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
