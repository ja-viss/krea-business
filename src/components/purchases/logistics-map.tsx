
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, Store, MapPin, Loader2, Factory, PackageCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// Importación dinámica de Leaflet para evitar errores de SSR en Next.js
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });

interface LogisticsMapProps {
  status: 'Factory' | 'In Transit' | 'Delivered';
  storeCoords: { lat: number; lng: number };
  providerCoords: { lat: number; lng: number };
  vendorName: string;
}

export function LogisticsMap({ status, storeCoords, providerCoords, vendorName }: LogisticsMapProps) {
  const [L, setL] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet);
      setMounted(true);
    });
  }, []);

  if (!mounted || !L) return <div className="h-full w-full flex items-center justify-center bg-muted/20 animate-pulse rounded-xl"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  // Iconos personalizados de Leaflet (Fix para marcadores rotos en React)
  const storeIcon = L.divIcon({
    html: `<div class="p-2 bg-primary text-white rounded-full shadow-lg border-2 border-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  });

  const providerIcon = L.divIcon({
    html: `<div class="p-2 bg-red-600 text-white rounded-full shadow-lg border-2 border-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  });

  const truckIcon = L.divIcon({
    html: `<div class="p-2 bg-amber-500 text-white rounded-full shadow-lg border-2 border-white animate-bounce"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-5h-4v5a1 1 0 0 0 1 1Z"/><path d="M16 8h4.586a1 1 0 0 1 .707.293l2.414 2.414a1 1 0 0 1 .293.707V14h-4V8Z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg></div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  });

  // Calcular posición actual del camión (Simulación)
  const truckPos = status === 'In Transit' 
    ? { lat: (storeCoords.lat + providerCoords.lat) / 2, lng: (storeCoords.lng + providerCoords.lng) / 2 } 
    : status === 'Delivered' ? storeCoords : providerCoords;

  const routeColor = status === 'Delivered' ? '#22c55e' : status === 'In Transit' ? '#f59e0b' : '#ef4444';

  return (
    <Card className="border-2 shadow-xl overflow-hidden h-[450px] flex flex-col">
      <CardHeader className="bg-muted/5 border-b py-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" />
          <CardTitle className="text-xs font-black uppercase tracking-tight">Rastreo Logístico en Vivo</CardTitle>
        </div>
        <Badge className={cn(
          "uppercase font-black text-[9px] px-3",
          status === 'Factory' ? "bg-red-100 text-red-700 border-red-200" :
          status === 'In Transit' ? "bg-amber-100 text-amber-800 border-amber-200 animate-pulse" :
          "bg-green-100 text-green-800 border-green-200"
        )}>
          {status === 'Factory' ? 'En Planta' : status === 'In Transit' ? 'En Ruta' : 'Entregado'}
        </Badge>
      </CardHeader>
      <CardContent className="p-0 flex-1 relative">
        <MapContainer 
            center={[ (storeCoords.lat + providerCoords.lat) / 2, (storeCoords.lng + providerCoords.lng) / 2 ]} 
            zoom={12} 
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Marcadores */}
          <Marker position={[providerCoords.lat, providerCoords.lng]} icon={providerIcon}>
            <Popup><span className="font-bold uppercase text-[10px]">Origen: {vendorName}</span></Popup>
          </Marker>

          <Marker position={[storeCoords.lat, storeCoords.lng]} icon={storeIcon}>
            <Popup><span className="font-bold uppercase text-[10px]">Tu Almacén Central</span></Popup>
          </Marker>

          {status !== 'Delivered' && (
            <Marker position={[truckPos.lat, truckPos.lng]} icon={truckIcon}>
                <Popup><span className="font-bold uppercase text-[10px]">Carga en Movimiento</span></Popup>
            </Marker>
          )}

          {/* Línea de Ruta */}
          <Polyline 
            positions={[ [providerCoords.lat, providerCoords.lng], [storeCoords.lat, storeCoords.lng] ]} 
            color={routeColor} 
            dashArray={status === 'Delivered' ? '' : "10, 10"}
            weight={4}
            opacity={0.8}
          />
        </MapContainer>

        {/* Infografía de Estado Superior */}
        <div className="absolute top-4 left-4 right-4 z-[500] flex gap-2">
            <div className={cn(
                "flex-1 p-3 rounded-xl border-2 flex items-center gap-3 shadow-lg transition-all",
                status === 'Factory' ? "bg-white border-red-500 scale-105" : "bg-white/80 opacity-60"
            )}>
                <Factory className={cn("h-5 w-5", status === 'Factory' ? "text-red-600" : "text-slate-400")} />
                <div>
                    <p className="text-[10px] font-black uppercase leading-none">Fábrica</p>
                    <p className="text-[9px] font-bold text-muted-foreground">Empacando...</p>
                </div>
            </div>

            <div className={cn(
                "flex-1 p-3 rounded-xl border-2 flex items-center gap-3 shadow-lg transition-all",
                status === 'In Transit' ? "bg-white border-amber-500 scale-105" : "bg-white/80 opacity-60"
            )}>
                <Truck className={cn("h-5 w-5", status === 'In Transit' ? "text-amber-600" : "text-slate-400")} />
                <div>
                    <p className="text-[10px] font-black uppercase leading-none">En Tránsito</p>
                    <p className="text-[9px] font-bold text-muted-foreground">ETA: 45 min</p>
                </div>
            </div>

            <div className={cn(
                "flex-1 p-3 rounded-xl border-2 flex items-center gap-3 shadow-lg transition-all",
                status === 'Delivered' ? "bg-white border-green-500 scale-105" : "bg-white/80 opacity-60"
            )}>
                <PackageCheck className={cn("h-5 w-5", status === 'Delivered' ? "text-green-600" : "text-slate-400")} />
                <div>
                    <p className="text-[10px] font-black uppercase leading-none">Entregado</p>
                    <p className="text-[9px] font-bold text-muted-foreground">En Stock</p>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
