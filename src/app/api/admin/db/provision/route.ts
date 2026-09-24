
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { createLog } from '@/app/api/audit-logs/route';

/**
 * API de Aprovisionamiento Físico de Base de Datos en Atlas.
 * Conecta a un clúster remoto, crea la base de datos y una colección inicial.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { atlasUri, user, password, dbName, collectionName, userId, userName } = body;

        if (!atlasUri || !user || !password || !dbName || !collectionName) {
            return NextResponse.json({ message: 'Todos los parámetros son obligatorios.' }, { status: 400 });
        }

        // 1. Extraer el HOST de forma robusta
        // Si el usuario pega una URI completa (mongodb+srv://user:pass@host/db), 
        // extraemos solo la parte del host después del '@'.
        let host = atlasUri
            .replace('mongodb+srv://', '')
            .replace('mongodb://', '')
            .split('/')[0];
        
        if (host.includes('@')) {
            host = host.split('@').pop() || host;
        }

        // 2. Construir URI Dinámica Limpia
        // Usamos encodeURIComponent para manejar caracteres especiales en el password
        const finalUri = `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}/${dbName}?retryWrites=true&w=majority`;

        console.log(`[ATLAS PROVISION] Intentando conectar a: mongodb+srv://${user}:****@${host}/${dbName}`);

        // 3. Establecer Conexión Temporal
        const connection = mongoose.createConnection(finalUri, {
            serverSelectionTimeoutMS: 8000, // Timeout de 8 segundos para feedback rápido
        });
        
        try {
            await connection.asPromise();
        } catch (connErr: any) {
            console.error('[ATLAS CONNECTION ERROR]', connErr.message);
            return NextResponse.json({ 
                message: 'Error de autenticación o red en Atlas.', 
                details: connErr.message 
            }, { status: 401 });
        }

        // 4. Crear Base de Datos y Colección (Efecto Lazy)
        const db = connection.db;
        if (!db) throw new Error("No se pudo obtener el descriptor de base de datos");

        const collection = db.collection(collectionName);
        
        // Insertar documento de inicialización del sistema Krea
        await collection.insertOne({
            _krea_init: true,
            createdAt: new Date(),
            description: "Base de datos aprovisionada por Krea Data Studio",
            provisionedBy: userName || 'Super Admin',
            version: "2.0"
        });

        // 5. Registro de Auditoría Maestra
        await createLog({
            store: 'SYSTEM_MASTER',
            user: userId || 'SYSTEM',
            userName: userName || 'Super Admin',
            action: 'ATLAS_DB_PROVISIONED',
            module: 'Infraestructura',
            details: `Creación exitosa de base de datos '${dbName}' en cluster remoto '${host}'.`
        });

        // Cerrar conexión efímera inmediatamente
        await connection.close();

        return NextResponse.json({ 
            message: 'Base de datos creada exitosamente en Atlas.',
            uriSuggested: finalUri 
        }, { status: 201 });

    } catch (e: any) {
        console.error('Error Atlas Provision:', e);
        return NextResponse.json({ 
            message: 'Fallo catastrófico al intentar aprovisionar en Atlas.', 
            error: e.message 
        }, { status: 500 });
    }
}
