
'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, MapPin, Loader2, Navigation, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// Importación dinámica de Leaflet para evitar errores de SSR en Next.js
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });
const SetView = dynamic(() => import('react-leaflet').then(mod => {
  const { useMap } = mod;
  return function SetView({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
  };
}), { ssr: false });

interface LogisticsMapProps {
  status: 'Factory' | 'In Transit' | 'Delivered';
  storeCoords: { lat: number; lng: number };
  providerCoords: { lat: number; lng: number };
  vendorName: string;
}

export function LogisticsMap({ status, storeCoords, providerCoords, vendorName }: LogisticsMapProps) {
  const [L, setL] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0); 

  useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet);
      setMounted(true);
    });
  }, []);

  useEffect(() => {
    if (status === 'In Transit') {
        const interval = setInterval(() => {
            setProgress(prev => (prev >= 100 ? 0 : prev + 0.2));
        }, 50);
        return () => clearInterval(interval);
    } else if (status === 'Delivered') {
        setProgress(100);
    } else {
        setProgress(0);
    }
  }, [status]);

  const telemetria = useMemo(() => {
    if (!storeCoords || !providerCoords) return { distance: 0, time: 0, currentLat: 0, currentLng: 0 };
    
    const R = 6371; 
    const dLat = (storeCoords.lat - providerCoords.lat) * Math.PI / 180;
    const dLon = (storeCoords.lng - providerCoords.lng) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(providerCoords.lat * Math.PI / 180) * Math.cos(storeCoords.lat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    const hours = distance / 60;
    const minutes = Math.round(hours * 60);

    const currentLat = providerCoords.lat + (storeCoords.lat - providerCoords.lat) * (progress / 100);
    const currentLng = providerCoords.lng + (storeCoords.lng - providerCoords.lng) * (progress / 100);

    return { 
        distance: Math.round(distance), 
        time: minutes,
        currentLat,
        currentLng
    };
  }, [storeCoords, providerCoords, progress]);

  if (!mounted || !L) return <div className="h-full min-h-[300px] w-full flex items-center justify-center bg-muted/20 animate-pulse rounded-xl"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const storeIcon = L.divIcon({
    html: `<div class="p-2 bg-primary text-white rounded-full shadow-lg border-2 border-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>`,
    className: '', iconSize: [32, 32], iconAnchor: [16, 32]
  });

  const providerIcon = L.divIcon({
    html: `<div class="p-2 bg-red-600 text-white rounded-full shadow-lg border-2 border-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
    className: '', iconSize: [32, 32], iconAnchor: [16, 32]
  });

  const truckIcon = L.divIcon({
    html: `<div class="p-2 bg-amber-500 text-white rounded-full shadow-lg border-2 border-white animate-bounce"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-5h-4v5a1 1 0 0 0 1 1Z"/><path d="M16 8h4.586a1 1 0 0 1 .707.293l2.414 2.414a1 1 0 0 1 .293.707V14h-4V8Z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg></div>`,
    className: '', iconSize: [32, 32], iconAnchor: [16, 16]
  });

  const centerPos: [number, number] = [ (storeCoords.lat + providerCoords.lat) / 2, (storeCoords.lng + providerCoords.lng) / 2 ];

  return (
    <Card className="border-2 shadow-xl overflow-hidden h-[500px] flex flex-col relative group rounded-2xl">
      <CardHeader className="bg-muted/5 border-b py-3 flex flex-row items-center justify-between z-10 bg-white/90 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" />
          <CardTitle className="text-xs font-black uppercase tracking-tight">Previsualización de Ruta</CardTitle>
        </div>
        <div className='flex gap-2'>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-black text-[8px] uppercase">
                <Navigation className='mr-1 h-2.5 w-2.5'/> {telemetria.distance} KM
            </Badge>
            <Badge className="uppercase font-black text-[9px] px-3 bg-amber-100 text-amber-800 border-amber-200 animate-pulse">
                Sincronizando
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 relative z-0">
        <MapContainer 
            center={centerPos}
            zoom={7} 
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <SetView center={centerPos} zoom={telemetria.distance > 400 ? 6 : 7} />

          <Marker position={[providerCoords.lat, providerCoords.lng]} icon={providerIcon}>
            <Popup><span className="font-bold text-[10px] uppercase">ORIGEN: {vendorName}</span></Popup>
          </Marker>

          <Marker position={[storeCoords.lat, storeCoords.lng]} icon={storeIcon}>
            <Popup><span className="font-bold text-[10px] uppercase">DESTINO: TU EMPRESA</span></Popup>
          </Marker>

          {(status === 'In Transit' || status === 'Delivered') && (
            <Marker position={[telemetria.currentLat, telemetria.currentLng]} icon={truckIcon}>
                <Popup><span className="font-bold text-[10px] uppercase">TRANSITO ESTIMADO</span></Popup>
            </Marker>
          )}

          <Polyline 
            positions={[ [providerCoords.lat, providerCoords.lng], [storeCoords.lat, storeCoords.lng] ]} 
            color='#f59e0b' 
            dashArray="10, 10"
            weight={3}
            opacity={0.6}
          />
        </MapContainer>

        <div className="absolute bottom-4 left-4 right-4 z-[500] grid grid-cols-2 gap-2 animate-in slide-in-from-bottom-2 duration-700">
            <div className="bg-white/95 backdrop-blur p-3 rounded-xl border-2 border-primary/20 shadow-xl flex items-center gap-3">
                <div className='bg-primary/10 p-2 rounded-lg'><Clock className='h-4 w-4 text-primary'/></div>
                <div>
                    <p className='text-[8px] font-black uppercase opacity-50 leading-none'>ETA Estimado</p>
                    <p className='text-xs font-black uppercase'>
                        {telemetria.time > 60 ? `${Math.floor(telemetria.time/60)}h ${telemetria.time%60}min` : `${telemetria.time} min`}
                    </p>
                </div>
            </div>
            <div className="bg-black/90 text-white p-3 rounded-xl border-2 border-white/10 shadow-xl flex items-center gap-3">
                <div className='bg-white/10 p-2 rounded-lg'><Navigation className='h-4 w-4 text-primary'/></div>
                <div>
                    <p className='text-[8px] font-black uppercase opacity-50 leading-none'>Distancia Total</p>
                    <p className='text-xs font-black uppercase'>{telemetria.distance} KM</p>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}

