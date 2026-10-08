
import dbConnect from './dbConnect';
import StoreModel from '@/models/Store';

/**
 * Middleware de Autenticación para API de Bots.
 * Valida x-api-key y x-tenant-id contra la Base Maestra.
 */
export async function validateBotRequest(req: Request) {
    const apiKey = req.headers.get('x-api-key');
    const tenantId = req.headers.get('x-tenant-id');

    if (!apiKey || !tenantId) return null;

    try {
        await dbConnect();
        const store = await StoreModel.findOne({ 
            _id: tenantId, 
            'botApi.apiKey': apiKey, 
            'botApi.enabled': true 
        });
        
        return store || null;
    } catch (e) {
        return null;
    }
}

/**
 * Utilidad de enmascaramiento de datos para bots (Privacidad).
 */
export function maskName(name: string) {
    if (!name) return "Cliente";
    const parts = name.split(' ');
    if (parts.length === 1) return name;
    return `${parts[0]} ${parts[1].charAt(0)}.`;
}
