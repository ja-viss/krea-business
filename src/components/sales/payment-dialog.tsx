
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
import { CreditCard, Banknote, Coins, QrCode, Loader2, CheckCircle2, Wallet, ArrowRight, Smartphone } from 'lucide-react';
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
  
  const change = useMemo(() => {
    let target = 0;
    if (currency === 'VES') target = totals.ves;
    else if (currency === 'USD') target = totals.usd;
    else target = totals.cop;
    
    return Math.max(0, receivedNum - target);
  }, [amountReceived, currency, totals]);

  const qrString = useMemo(() => {
    // Estándar Suiche 7B para QR Dinámico C2B
    // Formato: PM:<BANCO_4_DIGITOS>:<TELEFONO_11_DIGITOS>:<RIF_O_CI_SIN_GUIONES>:<MONTO_2_DECIMALES>
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] border-4 p-0 overflow-hidden bg-white">
        <div className="grid lg:grid-cols-12">
            {/* PANEL IZQUIERDO: TOTALES */}
            <div className="lg:col-span-5 bg-black text-white p-6 flex flex-col justify-between">
                <div className="space-y-6">
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Total a Cobrar</Label>
                        <div className="text-4xl font-black tracking-tighter text-primary">
                            {formatCurrency(totals.usd, 'USD')}
                        </div>
                    </div>
                    
                    <Separator className="bg-white/10" />
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase opacity-60">Bolívares (BCV)</span>
                            <span className="font-bold text-lg">{formatCurrency(totals.ves, 'VES')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase opacity-60">Pesos (Ref.)</span>
                            <span className="font-bold text-lg">{formatCurrency(totals.cop, 'COP')}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
                    <p className="text-[9px] font-black uppercase opacity-40">Tasa Oficial BCV</p>
                    <div className="flex justify-between text-[11px] font-bold">
                        <span>1 USD = {rates.usd.toFixed(2)} Bs</span>
                    </div>
                </div>
            </div>

            {/* PANEL DERECHO: ACCIÓN */}
            <div className="lg:col-span-7 p-6 space-y-6">
                <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Método de Pago</Label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: 'Efectivo', icon: Banknote },
                            { id: 'Tarjeta', icon: CreditCard },
                            { id: 'Pago Móvil', icon: QrCode },
                            { id: 'Transferencia', icon: ArrowRight },
                            { id: 'Zelle', icon: CheckCircle2 },
                            { id: 'Binance', icon: Coins },
                        ].map((m) => (
                            <button 
                                key={m.id}
                                className={cn(
                                    "h-16 flex flex-col items-center justify-center gap-1 border-2 rounded-xl transition-all font-black text-[9px] uppercase",
                                    method === m.id ? "border-primary bg-primary/5 text-primary" : "border-muted opacity-60 hover:opacity-100"
                                )}
                                onClick={() => {
                                    setMethod(m.id as any);
                                    if (m.id === 'Pago Móvil' || m.id === 'Tarjeta') setCurrency('VES');
                                    if (m.id === 'Zelle' || m.id === 'Binance') setCurrency('USD');
                                }}
                            >
                                <m.icon className="h-5 w-5" />
                                {m.id}
                            </button>
                        ))}
                    </div>
                </div>

                {method === 'Pago Móvil' && (
                    <div className="bg-primary/5 p-4 rounded-xl border-2 border-primary/20 border-dashed flex items-center gap-4 animate-in zoom-in-95">
                        {pagoMovil.phone ? (
                            <>
                                <div className="bg-white p-2 border-2 border-black rounded-lg shrink-0">
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrString)}&ecc=L`} 
                                        alt="QR Suiche 7B"
                                        className="w-24 h-24"
                                    />
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <Smartphone className="h-3 w-3 text-primary" />
                                        <p className="text-[10px] font-black text-primary uppercase">Cobro Digital Estándar</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-black leading-none">{pagoMovil.phone}</p>
                                        <p className="text-[10px] font-bold opacity-60 leading-none">{pagoMovil.idNumber}</p>
                                        <p className="text-[10px] font-bold opacity-60 leading-none">Cód: {pagoMovil.bankCode}</p>
                                    </div>
                                    <Badge className="bg-primary font-black text-[8px] uppercase">Monto Incluido</Badge>
                                </div>
                            </>
                        ) : (
                            <div className="text-center w-full py-4 text-amber-600 font-bold text-xs uppercase italic">
                                <Smartphone className="h-6 w-6 mx-auto mb-1" />
                                Configure Pago Móvil en Ajustes
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase">Monto Recibido</Label>
                            <Input 
                                type="number" 
                                className="h-12 text-xl font-black border-2 bg-muted/20" 
                                value={amountReceived}
                                onChange={(e) => setAmountReceived(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase">Moneda del Pago</Label>
                            <div className="flex gap-1 h-12">
                                {['USD', 'VES', 'COP'].map((curr) => (
                                    <Button 
                                        key={curr}
                                        variant="outline"
                                        className={cn(
                                            "flex-1 border-2 font-black text-xs h-full",
                                            currency === curr ? "bg-black text-white border-black" : ""
                                        )}
                                        onClick={() => setCurrency(curr as any)}
                                    >
                                        {curr}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-xl border-2 border-green-200 border-dashed flex justify-between items-center">
                        <div>
                            <p className="text-[9px] font-black text-green-800 uppercase">Vuelto Estimado</p>
                            <p className="text-2xl font-black text-green-900 leading-none">
                                {formatCurrency(change, currency)}
                            </p>
                        </div>
                        {change > 0 && (
                            <Badge className="bg-green-600 font-black text-[9px] uppercase animate-pulse">Entregar Cambio</Badge>
                        )}
                    </div>
                </div>

                <Button 
                    className="w-full h-16 text-xl font-black uppercase shadow-xl"
                    disabled={isSubmitting || receivedNum < (totals[currency.toLowerCase() as keyof typeof totals] || 0) * 0.99}
                    onClick={handleConfirm}
                >
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-6 w-6" />}
                    Cerrar Venta (Enter)
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
