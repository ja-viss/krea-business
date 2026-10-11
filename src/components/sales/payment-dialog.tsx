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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
    Calculator,
    ArrowRightLeft,
    CheckCircle2,
    Loader2,
    Fingerprint,
    Hash
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
    holderName?: string;
    phone?: string;
    batchNumber?: string;
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

const METHODS = [
    { id: 'Efectivo', label: 'Efectivo', icon: Banknote },
    { id: 'Pago Móvil', label: 'Pago Móvil', icon: Smartphone },
    { id: 'Tarjeta', label: 'Punto (Tarjeta)', icon: CreditCard },
    { id: 'Zelle', label: 'Zelle', icon: ShieldCheck },
    { id: 'Binance Pay', label: 'Binance', icon: Coins },
    { id: 'Pesos Cash', label: 'Pesos COP', icon: ArrowRightLeft },
    { id: 'Biopago', label: 'Biopago BDV', icon: Fingerprint },
    { id: 'Transferencia', label: 'Transferencia', icon: Hash },
];

export function PaymentDialog({ isOpen, onClose, totalVES, totalUSD, totalCOP, tasaBCV, tasaCOP, onConfirm, isSubmitting }: PaymentDialogProps) {
    const { toast } = useToast();
    const [payments, setPayments] = useState<Payment[]>([]);
    
    const [currentMethod, setCurrentMethod] = useState('Efectivo');
    const [currentCurrency, setCurrentCurrency] = useState<'USD' | 'VES' | 'COP'>('USD');
    const [amountToPay, setAmountToPay] = useState(''); 
    const [amountReceived, setAmountReceived] = useState('');
    
    // Metadata fields
    const [reference, setReference] = useState('');
    const [bank, setBank] = useState('');
    const [holderName, setHolderName] = useState('');
    const [phone, setPhone] = useState('');
    const [batchNumber, setBatchNumber] = useState('');

    const paidVES = useMemo(() => {
        return payments.reduce((acc, p) => {
            if (p.currency === 'VES') return acc + p.amount;
            if (p.currency === 'USD') return acc + (p.amount * tasaBCV);
            if (p.currency === 'COP') return acc + ((p.amount / tasaCOP) * tasaBCV);
            return acc;
        }, 0);
    }, [payments, tasaBCV, tasaCOP]);

    const remainingVES = Math.max(0, totalVES - paidVES);
    const remainingUSD = remainingVES / tasaBCV;
    const remainingCOP = (remainingVES / tasaBCV) * tasaCOP;

    useEffect(() => {
        if (isOpen) {
            if (currentCurrency === 'USD') setAmountToPay(remainingUSD.toFixed(2));
            else if (currentCurrency === 'COP') setAmountToPay(Math.ceil(remainingCOP).toString());
            else setAmountToPay(remainingVES.toFixed(2));
            setAmountReceived(amountToPay);
        }
    }, [isOpen, currentCurrency, remainingVES, remainingUSD, remainingCOP]);

    const handleAddPayment = () => {
        const netAmount = parseFloat(amountToPay);
        const received = parseFloat(amountReceived) || netAmount;

        if (isNaN(netAmount) || netAmount <= 0) {
            toast({ variant: 'destructive', title: "Monto inválido" });
            return;
        }

        setPayments([...payments, {
            method: currentMethod,
            amount: netAmount,
            currency: currentCurrency,
            reference,
            bank,
            holderName,
            phone,
            batchNumber,
            amountReceived: received,
            changeGiven: Math.max(0, received - netAmount)
        }]);

        // Reset fields
        setReference('');
        setBank('');
        setHolderName('');
        setPhone('');
        setBatchNumber('');
        setAmountToPay('');
        setAmountReceived('');
    };

    const removePayment = (index: number) => {
        setPayments(payments.filter((_, i) => i !== index));
    };

    const isFullyPaid = remainingVES <= 0.05;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[900px] border-4 rounded-[2rem] p-0 overflow-hidden flex flex-col md:max-h-[90vh] bg-white">
                <div className="bg-slate-900 p-6 text-white shrink-0 flex justify-between items-center">
                    <div className="space-y-1">
                        <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-primary flex items-center gap-3">
                            <ShieldCheck className="h-7 w-7" /> Liquidación Venezolana
                        </DialogTitle>
                        <p className="text-[10px] font-bold uppercase opacity-50 tracking-widest text-white">Pagos Mixtos y Multidivisa Activos</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase opacity-40 mb-1">Cuenta Total</p>
                        <p className="text-2xl font-black">Bs. {totalVES.toLocaleString('es-VE')}</p>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden">
                    {/* LADO IZQUIERDO: CONFIGURADOR DE ABONO */}
                    <div className="p-6 space-y-6 border-r overflow-y-auto">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">1. Selección de Método</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {METHODS.map((m) => (
                                    <Button 
                                        key={m.id}
                                        variant={currentMethod === m.id ? 'default' : 'outline'}
                                        className={cn(
                                            "h-12 justify-start font-black uppercase text-[9px] rounded-xl border-2 transition-all",
                                            currentMethod === m.id ? "bg-primary border-primary shadow-lg" : "bg-white hover:bg-slate-50"
                                        )}
                                        onClick={() => {
                                            setCurrentMethod(m.id);
                                            if (['Zelle', 'Binance Pay'].includes(m.id)) setCurrentCurrency('USD');
                                            else if (m.id === 'Pesos Cash') setCurrentCurrency('COP');
                                            else setCurrentCurrency('VES');
                                        }}
                                    >
                                        <m.icon className="mr-2 h-4 w-4" /> {m.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border-2 border-dashed">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase opacity-60">Moneda Abono</Label>
                                    <Select value={currentCurrency} onValueChange={(v:any) => setCurrentCurrency(v)}>
                                        <SelectTrigger className="h-11 font-black bg-white"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="USD" className="font-bold">Dólares ($)</SelectItem>
                                            <SelectItem value="VES" className="font-bold">Bolívares (Bs)</SelectItem>
                                            <SelectItem value="COP" className="font-bold">Pesos (COP)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-primary">Monto a Abonar</Label>
                                    <Input 
                                        type="number" 
                                        className="h-11 font-black text-lg border-2 text-center"
                                        value={amountToPay}
                                        onChange={e => {
                                            setAmountToPay(e.target.value);
                                            setAmountReceived(e.target.value);
                                        }}
                                    />
                                </div>
                            </div>

                            {/* CAMPOS ESPECÍFICOS POR MÉTODO */}
                            <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
                                {(['Pago Móvil', 'Tarjeta', 'Transferencia', 'Biopago'].includes(currentMethod)) && (
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-black uppercase opacity-50">Banco Origen</Label>
                                        <Input placeholder="Ej: Banesco" className="h-9 text-xs font-bold" value={bank} onChange={e => setBank(e.target.value.toUpperCase())} />
                                    </div>
                                )}
                                {(['Pago Móvil', 'Tarjeta', 'Zelle', 'Binance Pay', 'Transferencia', 'Biopago'].includes(currentMethod)) && (
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-black uppercase opacity-50"># Referencia / Lote</Label>
                                        <Input placeholder="Confirmación" className="h-9 text-xs font-bold" value={reference} onChange={e => setReference(e.target.value)} />
                                    </div>
                                )}
                                {currentMethod === 'Tarjeta' && (
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-black uppercase opacity-50"># Terminal / Punto</Label>
                                        <Input placeholder="0001" className="h-9 text-xs font-bold" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} />
                                    </div>
                                )}
                                {currentMethod === 'Zelle' && (
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-black uppercase opacity-50">Titular de Cuenta</Label>
                                        <Input placeholder="Nombre" className="h-9 text-xs font-bold" value={holderName} onChange={e => setHolderName(e.target.value)} />
                                    </div>
                                )}
                            </div>

                            <Button className="w-full h-12 font-black uppercase shadow-xl" onClick={handleAddPayment} disabled={!amountToPay}>
                                <Plus className="mr-2 h-4 w-4" /> Agregar Abono
                            </Button>
                        </div>
                    </div>

                    {/* LADO DERECHO: MONITOR DE SALDO Y LISTA */}
                    <div className="p-6 bg-slate-50/50 flex flex-col">
                        <div className="bg-primary p-6 rounded-3xl text-white shadow-2xl relative overflow-hidden mb-6">
                            <div className="absolute top-0 right-0 p-3 opacity-10"><Calculator className="h-20 w-20" /></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Saldo por Cobrar</p>
                                <p className={cn("text-4xl font-black tracking-tighter", isFullyPaid ? "text-emerald-400 animate-pulse" : "text-white")}>
                                    {isFullyPaid ? "CUENTA LIQUIDADA" : `Bs. ${remainingVES.toLocaleString('es-VE')}`}
                                </p>
                                {!isFullyPaid && (
                                    <div className="flex gap-3 mt-2 text-[11px] font-bold opacity-70 uppercase">
                                        <span>$ {remainingUSD.toFixed(2)} USD</span>
                                        <span>|</span>
                                        <span>{Math.ceil(remainingCOP).toLocaleString()} COP</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                            <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Desglose de Recaudación</Label>
                            {payments.length === 0 ? (
                                <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl opacity-20 text-center p-4">
                                    <Coins className="h-10 w-10 mb-2" />
                                    <p className="text-[10px] font-black uppercase">Esperando ingresos...</p>
                                </div>
                            ) : (
                                payments.map((p, i) => (
                                    <div key={i} className="bg-white border-2 border-slate-100 rounded-2xl p-4 flex justify-between items-center shadow-sm animate-in slide-in-from-right-2">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary"><CheckCircle2 className="h-5 w-5" /></div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase leading-none mb-1 text-slate-400">{p.method}</p>
                                                <p className="font-black text-sm text-slate-900">{p.currency === 'USD' ? '$' : ''} {p.amount.toLocaleString()} {p.currency}</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-600" onClick={() => removePayment(i)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="pt-6 border-t mt-6">
                            <Button 
                                className="w-full h-16 text-lg font-black uppercase shadow-2xl rounded-2xl bg-primary hover:bg-primary/90 transition-all hover:scale-[1.02]"
                                disabled={!isFullyPaid || isSubmitting}
                                onClick={() => onConfirm(payments)}
                            >
                                {isSubmitting ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : <ShieldCheck className="mr-3 h-8 w-8" />}
                                Emitir Factura Final
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}