
'use client';

import { useState, useEffect } from 'react';
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
    ArrowRightLeft, 
    Plus, 
    Trash2, 
    ShieldCheck,
    Coins,
    Zap,
    Loader2
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
    const [currentAmount, setCurrentAmount] = useState('');
    const [currentMethod, setCurrentMethod] = useState('Efectivo');
    const [currentCurrency, setCurrentCurrency] = useState('USD');
    const [reference, setReference] = useState('');
    const [bank, setBank] = useState('');

    const paidVES = payments.reduce((acc, p) => {
        if (p.currency === 'VES') return acc + p.amount;
        return acc + (p.amount * tasaBCV);
    }, 0);

    const remainingVES = Math.max(0, totalVES - paidVES);
    const changeVES = paidVES > totalVES ? paidVES - totalVES : 0;

    const handleAddPayment = () => {
        const amount = parseFloat(currentAmount);
        if (isNaN(amount) || amount <= 0) return;

        setPayments([...payments, {
            method: currentMethod,
            amount,
            currency: currentCurrency,
            reference: reference || undefined,
            bank: bank || undefined
        }]);

        setCurrentAmount('');
        setReference('');
        setBank('');
    };

    const removePayment = (index: number) => {
        setPayments(payments.filter((_, i) => i !== index));
    };

    const canFinalize = paidVES >= (totalVES - 0.01);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[700px] border-4 rounded-3xl p-0 overflow-hidden">
                <div className="bg-primary p-6 text-white shrink-0">
                    <DialogHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                                    <ShieldCheck className="h-6 w-6" /> Liquidación Mixta
                                </DialogTitle>
                                <DialogDescription className="text-white/70 font-bold uppercase text-[10px]">
                                    Procesando pago multimoneda conforme a ley.
                                </DialogDescription>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase opacity-60">Total a Pagar</p>
                                <p className="text-3xl font-black tracking-tighter">Bs. {totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                                <p className="text-xs font-bold opacity-80">$ {totalUSD.toFixed(2)}</p>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* FORMULARIO DE PAGO */}
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
                                        className={cn("h-14 font-black uppercase text-[10px] flex flex-col gap-1 rounded-xl", currentMethod === m.id && "ring-4 ring-primary/20")}
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

                        <div className="space-y-4 pt-2">
                            <div className="flex gap-2">
                                <div className="flex-1 space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Monto a Abonar</Label>
                                    <div className="relative">
                                        <Input 
                                            type="number" 
                                            className="h-12 font-black text-lg pl-12" 
                                            placeholder="0.00"
                                            value={currentAmount}
                                            onChange={e => setCurrentAmount(e.target.value)}
                                        />
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-primary">{currentCurrency === 'USD' ? '$' : 'Bs'}</span>
                                    </div>
                                </div>
                                <div className="w-24 space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Moneda</Label>
                                    <Button variant="outline" className="w-full h-12 font-black" onClick={() => setCurrentCurrency(currentCurrency === 'USD' ? 'VES' : 'USD')}>
                                        {currentCurrency}
                                    </Button>
                                </div>
                            </div>

                            {(currentMethod !== 'Efectivo') && (
                                <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2">
                                    <Input placeholder="Banco" className="h-10 text-xs font-bold" value={bank} onChange={e => setBank(e.target.value.toUpperCase())} />
                                    <Input placeholder="Ref / Lote" className="h-10 text-xs font-bold" value={reference} onChange={e => setReference(e.target.value)} />
                                </div>
                            )}

                            <Button className="w-full h-12 font-black uppercase bg-slate-900 text-white rounded-xl" onClick={handleAddPayment} disabled={!currentAmount}>
                                <Plus className="mr-2 h-4 w-4" /> Añadir Pago
                            </Button>
                        </div>
                    </div>

                    {/* RESUMEN DE ABONOS */}
                    <div className="flex flex-col">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground mb-4">2. Resumen de Abonos</Label>
                        <div className="flex-1 space-y-2 overflow-y-auto max-h-[250px] pr-2 scrollbar-hide">
                            {payments.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-2xl opacity-30 text-center p-6">
                                    <Coins className="h-10 w-10 mb-2" />
                                    <p className="text-[10px] font-black uppercase">Esperando pagos...</p>
                                </div>
                            ) : (
                                payments.map((p, idx) => (
                                    <div key={idx} className="bg-muted/50 border-2 rounded-xl p-3 flex justify-between items-center group">
                                        <div>
                                            <p className="text-[10px] font-black uppercase leading-none mb-1">{p.method}</p>
                                            <p className="font-black text-sm">{p.currency === 'USD' ? '$' : 'Bs.'} {p.amount.toLocaleString()}</p>
                                            {p.reference && <p className="text-[8px] font-mono opacity-60">Ref: {p.reference}</p>}
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removePayment(idx)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-6 space-y-3 bg-slate-50 p-4 rounded-2xl border-2">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase opacity-60">Suma Recibida:</span>
                                <span className="text-sm font-black text-primary">Bs. {paidVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase opacity-60">Restante / Saldo:</span>
                                <span className={cn("text-lg font-black", remainingVES > 0 ? "text-red-500" : "text-green-600")}>
                                    {remainingVES > 0 ? `Bs. ${remainingVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}` : 'PAGADO'}
                                </span>
                            </div>
                            {changeVES > 0 && (
                                <div className="bg-amber-100 p-2 rounded-lg text-center animate-pulse">
                                    <p className="text-[9px] font-black text-amber-800 uppercase">Cambio (Vuelto) Sugerido</p>
                                    <p className="text-lg font-black text-amber-900">Bs. {changeVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                                    <p className="text-[9px] font-bold text-amber-800 italic">($ {(changeVES / tasaBCV).toFixed(2)})</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-slate-100 border-t">
                    <Button variant="ghost" className="font-bold uppercase text-xs" onClick={onClose}>Cancelar</Button>
                    <Button 
                        className="h-16 px-12 text-lg font-black uppercase shadow-2xl rounded-2xl flex-1"
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
