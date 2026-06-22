
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';

/**
 * Ping de Seguridad (Heartbeat).
 * Detecta si la licencia offline sigue siendo válida.
 */

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const { hardwareId, storeId } = await req.json();

        const store = await StoreModel.findById(storeId);
        
        if (!store || store.offlineHardwareId !== hardwareId) {
            return NextResponse.json({ action: 'LOCK', reason: 'Vínculo de hardware inválido.' });
        }

        if (store.status === 'Suspended' || store.status === 'Expired') {
            return NextResponse.json({ 
                action: 'LOCK', 
                reason: `Licencia ${store.status === 'Suspended' ? 'Suspendida por falta de pago' : 'Expirada'}.` 
            });
        }

        return NextResponse.json({ 
            action: 'SYNC', 
            status: store.status,
            expiryDate: store.expiryDate
        });

    } catch (e: any) {
        // Si el servidor falla, el cliente local debe permitir seguir trabajando en modo offline 
        // (Grace period) a menos que haya pasado mucho tiempo sin reportar.
        return NextResponse.json({ action: 'CONTINUE' });
    }
}
