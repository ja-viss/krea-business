
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
    CreditCard, 
    Banknote, 
    Coins, 
    QrCode, 
    Loader2, 
    CheckCircle2, 
    Wallet, 
    ArrowRight, 
    Smartphone,
    Zap,
    History
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  totals: { ves: number; usd: number; cop: number };
  rates: { usd: number; cop: number };
  pagoMovil: { bankCode: string; phone: string; idNumber: string };
  onConfirm: (paymentData: any) => void;
  isSubmitting: boolean;
}

export function PaymentDialog({ isOpen, onOpenChange, totals, rates, pagoMovil, onConfirm, isSubmitting }: PaymentDialogProps) {
  const [method, setMethod] = useState<'Efectivo' | 'Tarjeta' | 'Pago Móvil' | 'Transferencia' | 'Zelle' | 'Binance'>('Efectivo');
  const [currency, setCurrency] = useState<'VES' | 'USD' | 'COP'>('USD');
  const [amountReceived, setAmountReceived] = useState<string>('');
  
  const formatCurrency = (val: number, curr: string) => 
    new Intl.NumberFormat(curr === 'COP' ? 'es-CO' : 'es-VE', { 
        style: 'currency', 
        currency: curr === 'VES' ? 'VES' : curr === 'USD' ? 'USD' : 'COP',
        maximumFractionDigits: curr === 'COP' ? 0 : 2
    }).format(val);

  const receivedNum = parseFloat(amountReceived) || 0;
  
  // Determinar el objetivo según la moneda de pago
  const targetAmount = useMemo(() => {
    if (currency === 'VES') return totals.ves;
    if (currency === 'USD') return totals.usd;
    return totals.cop;
  }, [currency, totals]);

  const change = useMemo(() => {
    return Math.max(0, receivedNum - targetAmount);
  }, [receivedNum, targetAmount]);

  // Billetes comunes para acceso rápido (Especialmente para USD en Venezuela)
  const quickBills = useMemo(() => {
    if (currency === 'USD') return [1, 5, 10, 20, 50, 100];
    return []; // Para VES y COP el monto suele ser exacto por medios digitales
  }, [currency]);

  const qrString = useMemo(() => {
    if (!pagoMovil.phone || !pagoMovil.idNumber) return '';
    const cleanId = pagoMovil.idNumber.replace(/[^0-9VJEG]/g, '');
    const cleanPhone = pagoMovil.phone.replace(/[^0-9]/g, '');
    const amountStr = totals.ves.toFixed(2);
    return `PM:${pagoMovil.bankCode}:${cleanPhone}:${cleanId}:${amountStr}`;
  }, [pagoMovil, totals]);

  const handleConfirm = () => {
      onConfirm({
          paymentMethod: method,
          paymentCurrency: currency,
          amountReceived: receivedNum,
          change: change
      });
  };

  const handleExactAmount = () => {
      setAmountReceived(targetAmount.toFixed(2));
  };

  const handleQuickAmount = (val: number) => {
      setAmountReceived(val.toString());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] border-4 p-0 overflow-hidden bg-white shadow-2xl">
        <div className="grid lg:grid-cols-12 min-h-[500px]">
            {/* PANEL IZQUIERDO: ESTADO DE LA CUENTA */}
            <div className="lg:col-span-5 bg-slate-950 text-white p-8 flex flex-col justify-between">
                <div className="space-y-8">
                    <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase text-primary tracking-[0.2em]">Total a Recaudar</Label>
                        <div className="text-5xl font-black tracking-tighter text-primary animate-in fade-in slide-in-from-left-4 duration-500">
                            {formatCurrency(totals.usd, 'USD')}
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <Badge className="bg-primary/20 text-primary border-none font-black text-[9px] uppercase tracking-wider">Monto Sujeto a Cambio</Badge>
                        </div>
                    </div>
                    
                    <Separator className="bg-white/10" />
                    
                    <div className="space-y-6">
                        <div className="flex justify-between items-center group">
                            <span className="text-[10px] font-black uppercase opacity-40 group-hover:opacity-100 transition-opacity">Bolívares (BCV)</span>
                            <span className="font-bold text-xl">{formatCurrency(totals.ves, 'VES')}</span>
                        </div>
                        <div className="flex justify-between items-center group">
                            <span className="text-[10px] font-black uppercase opacity-40 group-hover:opacity-100 transition-opacity">Pesos (Cúcuta/Ref)</span>
                            <span className="font-bold text-xl">{formatCurrency(totals.cop, 'COP')}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-auto space-y-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase opacity-40">
                            <span>Tipo de Cambio</span>
                            <Zap className="h-3 w-3 text-primary animate-pulse" />
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs font-bold">1 USD =</span>
                            <span className="text-lg font-black text-primary">{rates.usd.toFixed(2)} Bs.</span>
                        </div>
                    </div>
                    <p className="text-[9px] text-center opacity-30 italic">Precios calculados según tasa oficial del BCV vigente.</p>
                </div>
            </div>

            {/* PANEL DERECHO: INTERFAZ DE COBRO HÍBRIDA */}
            <div className="lg:col-span-7 p-8 space-y-8 overflow-y-auto max-h-[90vh]">
                {/* 1. SELECCIÓN DE MÉTODO (MOUSE FRIENDLY) */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Forma de Pago</Label>
                        <Badge variant="outline" className="text-[9px] font-black border-primary/20 text-primary uppercase">{method}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { id: 'Efectivo', icon: Banknote, color: 'bg-green-500' },
                            { id: 'Tarjeta', icon: CreditCard, color: 'bg-blue-500' },
                            { id: 'Pago Móvil', icon: QrCode, color: 'bg-purple-500' },
                            { id: 'Zelle', icon: CheckCircle2, color: 'bg-indigo-500' },
                            { id: 'Transferencia', icon: ArrowRight, color: 'bg-slate-500' },
                            { id: 'Binance', icon: Coins, color: 'bg-yellow-500' },
                        ].map((m) => (
                            <button 
                                key={m.id}
                                className={cn(
                                    "group h-20 flex flex-col items-center justify-center gap-2 border-2 rounded-2xl transition-all duration-200 font-black text-[10px] uppercase shadow-sm",
                                    method === m.id 
                                        ? "border-primary bg-primary/5 text-primary scale-[1.02] shadow-md" 
                                        : "border-muted opacity-60 hover:opacity-100 hover:border-slate-300"
                                )}
                                onClick={() => {
                                    setMethod(m.id as any);
                                    if (m.id === 'Pago Móvil' || m.id === 'Tarjeta') setCurrency('VES');
                                    if (m.id === 'Zelle' || m.id === 'Binance') setCurrency('USD');
                                }}
                            >
                                <m.icon className={cn("h-6 w-6 transition-transform group-hover:scale-110", method === m.id ? "text-primary" : "text-slate-400")} />
                                {m.id}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. CONFIGURACIÓN DE MONEDA Y MONTO */}
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase opacity-60 flex items-center gap-2">
                                <History className="h-3 w-3" /> Moneda del Pago
                            </Label>
                            <div className="flex gap-2 h-14 bg-muted/30 p-1 rounded-2xl border-2">
                                {['USD', 'VES', 'COP'].map((curr) => (
                                    <Button 
                                        key={curr}
                                        variant="ghost"
                                        className={cn(
                                            "flex-1 rounded-xl font-black text-xs h-full transition-all",
                                            currency === curr ? "bg-white shadow-md text-primary" : "text-slate-400"
                                        )}
                                        onClick={() => setCurrency(curr as any)}
                                    >
                                        {curr}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase opacity-60">Monto Percibido</Label>
                            <div className="relative">
                                <Input 
                                    type="number" 
                                    className="h-14 text-2xl font-black border-2 border-slate-200 focus:border-primary bg-white px-4 pr-12 rounded-2xl shadow-inner" 
                                    value={amountReceived}
                                    onChange={(e) => setAmountReceived(e.target.value)}
                                    placeholder="0.00"
                                    autoFocus
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-300 text-sm">
                                    {currency}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ACCESOS RÁPIDOS PARA MOUSE (IMPORTANT) */}
                    <div className="flex flex-wrap gap-2 animate-in fade-in duration-300">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-9 px-4 rounded-full font-black text-[10px] uppercase bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                            onClick={handleExactAmount}
                        >
                            <Zap className="mr-1.5 h-3 w-3 fill-primary" /> Monto Exacto
                        </Button>
                        {quickBills.map(val => (
                            <Button 
                                key={val}
                                variant="outline" 
                                size="sm" 
                                className="h-9 px-4 rounded-full font-black text-[10px] uppercase border-2 hover:bg-slate-50"
                                onClick={() => handleQuickAmount(val)}
                            >
                                Billetes {currency === 'USD' ? '$' : ''}{val}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* 3. VUELTO Y ACCIONES FINALES */}
                <div className="space-y-4">
                    <div className={cn(
                        "p-6 rounded-3xl border-2 border-dashed flex justify-between items-center transition-all duration-500",
                        change > 0 ? "bg-green-50 border-green-500/50 shadow-green-100 shadow-xl" : "bg-slate-50 border-slate-200"
                    )}>
                        <div className="space-y-1">
                            <p className={cn("text-[10px] font-black uppercase tracking-widest", change > 0 ? "text-green-700" : "text-slate-400")}>
                                {change > 0 ? 'Vuelto a Entregar' : 'Saldo Pendiente'}
                            </p>
                            <p className={cn("text-3xl font-black leading-none tracking-tighter", change > 0 ? "text-green-900" : "text-slate-900")}>
                                {formatCurrency(change, currency)}
                            </p>
                        </div>
                        {change > 0 && (
                            <div className="flex flex-col items-end gap-2">
                                <Badge className="bg-green-600 text-white font-black text-[10px] uppercase px-3 py-1 animate-bounce">
                                    ¡Vuelto Disponible!
                                </Badge>
                                <span className="text-[9px] font-bold text-green-700/50 uppercase italic">Favor entregar en {currency}</span>
                            </div>
                        )}
                        {receivedNum < targetAmount * 0.99 && (
                            <Badge variant="destructive" className="font-black text-[10px] uppercase px-3 py-1">Incompleto</Badge>
                        )}
                    </div>

                    {method === 'Pago Móvil' && (
                        <div className="bg-purple-50 p-5 rounded-3xl border-2 border-purple-200 flex items-center gap-6 animate-in zoom-in-95">
                            {pagoMovil.phone ? (
                                <>
                                    <div className="bg-white p-3 border-4 border-slate-950 rounded-2xl shadow-xl shrink-0 group transition-transform hover:scale-105">
                                        <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrString)}&ecc=L`} 
                                            alt="QR Suiche 7B"
                                            className="w-28 h-24"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Smartphone className="h-4 w-4 text-purple-600" />
                                            <p className="text-[11px] font-black text-purple-700 uppercase tracking-tighter">Cobro QR Dinámico (Bs.)</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-black leading-none">{pagoMovil.phone}</p>
                                            <p className="text-[10px] font-bold opacity-60 leading-none uppercase">{pagoMovil.idNumber}</p>
                                            <p className="text-[10px] font-bold opacity-60 leading-none">Cód: {pagoMovil.bankCode}</p>
                                        </div>
                                        <Badge className="bg-purple-600 font-black text-[9px] uppercase">Monto Auto-Cargado</Badge>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center w-full py-4 text-amber-600 font-bold text-xs uppercase italic">
                                    <Smartphone className="h-6 w-6 mx-auto mb-2 opacity-50" />
                                    Configure los datos de Pago Móvil en Ajustes
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="pt-2">
                    <Button 
                        className="w-full h-24 text-2xl font-black uppercase shadow-2xl rounded-[2.5rem] bg-slate-950 hover:bg-slate-900 text-white border-b-8 border-slate-800 active:border-b-0 active:translate-y-1 transition-all"
                        disabled={isSubmitting || receivedNum < targetAmount * 0.99}
                        onClick={handleConfirm}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin mr-3 h-8 w-8" /> : <CheckCircle2 className="mr-3 h-8 w-8 text-primary" />}
                        Cerrar y Facturar (Enter)
                    </Button>
                    <p className="text-center text-[10px] font-black uppercase text-slate-400 mt-4 tracking-widest">
                        Krea POS Suite • Operación Blindada
                    </p>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
