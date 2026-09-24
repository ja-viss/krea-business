
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { createLog } from '@/app/api/audit-logs/route';

/**
 * API de Aprovisionamiento Físico de Base de Datos en Atlas.
 * Conecta a un cluster remoto, crea la base de datos y una colección inicial.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { atlasUri, user, password, dbName, collectionName, userId, userName } = body;

        if (!atlasUri || !user || !password || !dbName || !collectionName) {
            return NextResponse.json({ message: 'Todos los parámetros son obligatorios.' }, { status: 400 });
        }

        // 1. Construir URI Dinámica (Sanitizada)
        // Eliminamos el protocolo original para reconstruirlo con las credenciales
        const host = atlasUri.replace('mongodb+srv://', '').split('/')[0];
        const finalUri = `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}/${dbName}?retryWrites=true&w=majority`;

        // 2. Establecer Conexión Temporal
        const connection = mongoose.createConnection(finalUri);
        
        try {
            await connection.asPromise();
        } catch (connErr: any) {
            return NextResponse.json({ 
                message: 'Error de autenticación o red en Atlas.', 
                details: connErr.message 
            }, { status: 401 });
        }

        // 3. Crear Base de Datos y Colección (Efecto Lazy)
        // En MongoDB, no existe físicamente hasta que insertamos el primer dato.
        const db = connection.db;
        if (!db) throw new Error("No se pudo obtener el descriptor de base de datos");

        const collection = db.collection(collectionName);
        
        // Insertar documento de inicialización del sistema Krea
        await collection.insertOne({
            _krea_init: true,
            createdAt: new Date(),
            description: "Base de datos aprovisionada por Krea Data Studio",
            version: "2.0"
        });

        // 4. Registro de Auditoría Maestra
        await createLog({
            store: 'SYSTEM_MASTER',
            user: userId || 'SYSTEM',
            userName: userName || 'Super Admin',
            action: 'ATLAS_DB_PROVISIONED',
            module: 'Infraestructura',
            details: `Creación exitosa de base de datos '${dbName}' en cluster remoto Atlas.`
        });

        // Cerrar conexión efímera
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
