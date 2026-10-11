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
    Calculator,
    ArrowRightLeft,
    CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface Payment {
    method: string;
    amount: number;
    currency: 'USD' | 'VES' | 'COP';
    reference?: string;
    bank?: string;
    amountReceived?: number;
    changeGiven?: number;
}

interface PaymentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    totalVES: number;
    totalUSD: number;
    totalCOP: number;
    tasaBCV: number;
    tasaCOP: number;
    onConfirm: (payments: Payment[]) => void;
    isSubmitting: boolean;
}

export function PaymentDialog({ isOpen, onClose, totalVES, totalUSD, totalCOP, tasaBCV, tasaCOP, onConfirm, isSubmitting }: PaymentDialogProps) {
    const { toast } = useToast();
    const [payments, setPayments] = useState<Payment[]>([]);
    
    // Estado para el pago actual
    const [currentAmount, setCurrentAmount] = useState(''); 
    const [receivedAmount, setReceivedAmount] = useState(''); 
    const [currentMethod, setCurrentMethod] = useState('Efectivo');
    const [currentCurrency, setCurrentCurrency] = useState<'USD' | 'VES' | 'COP'>('USD');
    const [reference, setReference] = useState('');
    const [bank, setBank] = useState('');

    // Cálculo de totales liquidados en VES (Moneda de control fiscal)
    const paidVES = useMemo(() => {
        return payments.reduce((acc, p) => {
            if (p.currency === 'VES') return acc + p.amount;
            if (p.currency === 'USD') return acc + (p.amount * tasaBCV);
            // COP -> USD -> VES
            const inUSD = p.amount / tasaCOP;
            return acc + (inUSD * tasaBCV);
        }, 0);
    }, [payments, tasaBCV, tasaCOP]);

    const remainingVES = Math.max(0, totalVES - paidVES);
    const remainingUSD = tasaBCV > 0 ? remainingVES / tasaBCV : 0;
    const remainingCOP = remainingUSD * tasaCOP;

    // Cálculo de vuelto
    const currentChange = useMemo(() => {
        const received = parseFloat(receivedAmount);
        const toPay = parseFloat(currentAmount);
        if (isNaN(received) || isNaN(toPay) || received <= toPay) return 0;
        return received - toPay;
    }, [receivedAmount, currentAmount]);

    // Autocompletar saldo restante al cambiar moneda o abrir
    useEffect(() => {
        if (isOpen && remainingVES > 0.01) {
            if (currentCurrency === 'USD') setCurrentAmount(remainingUSD.toFixed(2));
            else if (currentCurrency === 'COP') setCurrentAmount(Math.ceil(remainingCOP).toString());
            else setCurrentAmount(remainingVES.toFixed(2));
            
            setReceivedAmount(currentAmount);
        }
    }, [isOpen, currentCurrency, remainingVES, remainingUSD, remainingCOP]);

    const handleAddPayment = () => {
        const amount = parseFloat(currentAmount);
        const received = parseFloat(receivedAmount) || amount;
        
        if (isNaN(amount) || amount <= 0) {
            toast({ variant: 'destructive', title: "Monto inválido" });
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

        // Reset
        setCurrentAmount('');
        setReceivedAmount('');
        setReference('');
        setBank('');
    };

    const removePayment = (index: number) => {
        setPayments(payments.filter((_, i) => i !== index));
    };

    const canFinalize = paidVES >= (totalVES - 0.1);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[850px] border-4 rounded-[2.5rem] p-0 overflow-hidden flex flex-col md:max-h-[95vh]">
                
                {/* CABECERA DINÁMICA */}
                <div className="bg-slate-900 p-8 text-white shrink-0">
                    <DialogHeader>
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3 text-primary">
                                    <ShieldCheck className="h-8 w-8" /> Liquidación Multimoneda
                                </DialogTitle>
                                <DialogDescription className="text-white/40 font-bold uppercase text-[10px] tracking-widest">
                                    Soporte para pagos mixtos en USD, VES y COP
                                </DialogDescription>
                            </div>
                            <div className="text-right bg-white/5 p-4 rounded-2xl border border-white/10 shadow-inner">
                                <p className="text-[10px] font-black uppercase opacity-40 mb-1">Total a Recaudar (Factura)</p>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-2xl font-black text-primary">Bs. {totalVES.toLocaleString('es-VE')}</span>
                                    <div className="flex justify-end gap-3 text-[11px] font-bold opacity-60">
                                        <span>$ {totalUSD.toFixed(2)} USD</span>
                                        <span>|</span>
                                        <span>{totalCOP.toLocaleString('es-CO')} COP</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10 overflow-y-auto bg-slate-50/30">
                    
                    {/* COLUMNA 1: CONFIGURACIÓN DEL ABONO */}
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                                <Plus className="h-3 w-3" /> 1. Método y Divisa
                            </Label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Efectivo', 'Pago Móvil', 'Tarjeta', 'Zelle', 'Pesos Cash', 'Transferencia'].map((m) => (
                                    <Button 
                                        key={m} 
                                        variant={currentMethod === m ? 'default' : 'outline'} 
                                        className={cn("h-12 font-black uppercase text-[9px] rounded-xl border-2 transition-all", currentMethod === m ? "bg-primary border-primary shadow-lg" : "bg-white hover:bg-primary/5")}
                                        onClick={() => {
                                            setCurrentMethod(m);
                                            if (m === 'Efectivo' || m === 'Zelle') setCurrentCurrency('USD');
                                            else if (m === 'Pesos Cash') setCurrentCurrency('COP');
                                            else setCurrentCurrency('VES');
                                        }}
                                    >
                                        {m}
                                    </Button>
                                ))}
                            </div>
                            
                            <div className="flex gap-2 p-1 bg-white rounded-xl border-2 border-slate-100 shadow-sm">
                                {['USD', 'VES', 'COP'].map((curr) => (
                                    <Button
                                        key={curr}
                                        variant={currentCurrency === curr ? 'secondary' : 'ghost'}
                                        className={cn("flex-1 h-9 font-black text-[10px] uppercase rounded-lg transition-all", currentCurrency === curr ? "bg-slate-900 text-white shadow-md" : "text-slate-400")}
                                        onClick={() => setCurrentCurrency(curr as any)}
                                    >
                                        {curr}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-5 p-6 bg-white rounded-3xl border-2 border-slate-100 shadow-xl relative overflow-hidden">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-primary">Monto Recibido</Label>
                                    <div className="relative">
                                        <Input 
                                            type="number" 
                                            className="h-14 font-black text-2xl pl-10 border-2 rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all" 
                                            value={receivedAmount}
                                            onChange={e => setReceivedAmount(e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                        />
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-primary/30 text-lg">{currentCurrency === 'USD' ? '$' : currentCurrency === 'COP' ? '$' : 'Bs'}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Abono Neto</Label>
                                    <div className="relative">
                                        <Input 
                                            type="number" 
                                            className="h-14 font-black text-2xl pl-10 bg-slate-50 border-2 rounded-2xl" 
                                            value={currentAmount}
                                            onChange={e => setCurrentAmount(e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                        />
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300 text-lg">{currentCurrency === 'USD' ? '$' : currentCurrency === 'COP' ? '$' : 'Bs'}</span>
                                    </div>
                                </div>
                            </div>

                            {currentChange > 0 && (
                                <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl flex items-center justify-between animate-in zoom-in-95">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/30"><Calculator className="h-5 w-5" /></div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-amber-800 tracking-tight">Vuelto a Entregar</p>
                                            <p className="text-[8px] font-bold text-amber-600 uppercase">Procesado en {currentCurrency}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-amber-900 tracking-tighter">
                                            {currentCurrency === 'USD' ? '$' : currentCurrency === 'COP' ? '' : 'Bs.'} {currentChange.toLocaleString()} {currentCurrency === 'COP' ? 'COP' : ''}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {(currentMethod !== 'Efectivo' && currentMethod !== 'Pesos Cash') && (
                                <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase opacity-40 ml-1">Origen / Banco</Label>
                                        <Input placeholder="Ej: Zelle / Mercantil" className="h-10 text-xs font-bold rounded-xl border-2" value={bank} onChange={e => setBank(e.target.value.toUpperCase())} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase opacity-40 ml-1"># Referencia</Label>
                                        <Input placeholder="Lote / Confirmación" className="h-10 text-xs font-bold rounded-xl border-2" value={reference} onChange={e => setReference(e.target.value)} />
                                    </div>
                                </div>
                            )}

                            <Button className="w-full h-14 font-black uppercase shadow-2xl rounded-2xl bg-slate-900 hover:bg-black transition-all text-sm tracking-widest" onClick={handleAddPayment} disabled={!currentAmount || parseFloat(currentAmount) <= 0}>
                                <CheckCircle2 className="mr-2 h-5 w-5" /> Confirmar Abono
                            </Button>
                        </div>
                    </div>

                    {/* COLUMNA 2: MONITOR DE LIQUIDACIÓN */}
                    <div className="flex flex-col gap-6">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                            <Coins className="h-4 w-4 text-primary" /> 2. Resumen de Ingresos
                        </Label>
                        
                        <div className="flex-1 space-y-3 overflow-y-auto max-h-[350px] min-h-[200px] pr-2 scrollbar-hide border-4 border-dashed rounded-[2rem] p-4 bg-white/50">
                            {payments.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center gap-3">
                                    <Banknote className="h-16 w-16" />
                                    <p className="text-[11px] font-black uppercase tracking-widest">Esperando primer abono...</p>
                                </div>
                            ) : (
                                payments.map((p, idx) => (
                                    <div key={idx} className="bg-white border-2 border-slate-100 rounded-2xl p-4 flex justify-between items-center group hover:border-primary/30 transition-all shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-all">
                                                {p.method === 'Efectivo' || p.method === 'Pesos Cash' ? <Banknote className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase leading-none mb-1 text-slate-400">{p.method}</p>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="font-black text-base text-slate-900">{p.currency === 'USD' ? '$' : p.currency === 'COP' ? '' : 'Bs.'} {p.amount.toLocaleString()} {p.currency === 'COP' ? 'COP' : ''}</span>
                                                    {p.changeGiven! > 0 && <Badge className="bg-amber-100 text-amber-800 border-none text-[7px] font-black uppercase h-4 px-1.5">VUELTO</Badge>}
                                                </div>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-300 hover:bg-rose-50 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all" onClick={() => removePayment(idx)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="space-y-4 bg-primary p-7 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute -top-10 -right-10 opacity-10 rotate-12"><Calculator className="h-40 w-40" /></div>
                            
                            <div className="flex justify-between items-center relative z-10">
                                <span className="text-[10px] font-black uppercase text-white/50 tracking-widest">Saldo Pendiente</span>
                                <div className="text-right">
                                    <p className={cn("text-3xl font-black tracking-tighter", remainingVES > 0.1 ? "text-white" : "text-emerald-400 animate-pulse")}>
                                        {remainingVES > 0.1 ? `Bs. ${remainingVES.toLocaleString('es-VE')}` : 'OPERACIÓN PAGADA'}
                                    </p>
                                    {remainingVES > 0.1 && (
                                        <div className="flex justify-end gap-2 text-[10px] font-bold text-white/60 uppercase mt-1">
                                            <span>$ {remainingUSD.toFixed(2)} USD</span>
                                            <span>|</span>
                                            <span>{Math.ceil(remainingCOP).toLocaleString()} COP</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <Separator className="bg-white/10" />
                            
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider relative z-10">
                                <span className="text-white/40 italic">Total Abonado:</span>
                                <span className="text-emerald-400 font-mono">Bs. {paidVES.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-8 bg-white border-t shrink-0 flex flex-row justify-between items-center gap-6">
                    <Button variant="ghost" className="font-black uppercase text-[10px] h-12 text-slate-400" onClick={onClose}>Cancelar Transacción</Button>
                    <div className="flex-1 flex gap-3">
                        <Button 
                            className="h-16 px-12 text-xl font-black uppercase shadow-2xl rounded-[1.5rem] flex-1 bg-primary hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] group"
                            disabled={!canFinalize || isSubmitting}
                            onClick={() => onConfirm(payments)}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-7 w-7" /> : <ShieldCheck className="mr-3 h-8 w-8 group-hover:animate-bounce" />}
                            FINALIZAR Y FACTURAR
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
