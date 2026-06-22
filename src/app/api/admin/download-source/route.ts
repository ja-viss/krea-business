
import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import fs from 'fs/promises';
import path from 'path';

/**
 * Endpoint de Extracción de Código Fuente Real.
 * Genera un archivo ZIP recorriendo el sistema de archivos del proyecto, 
 * omitiendo dependencias instaladas y archivos sensibles.
 */

async function addDirectoryToZip(zip: JSZip, dirPath: string, rootDir: string) {
    const files = await fs.readdir(dirPath);
    
    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const relPath = path.relative(rootDir, fullPath);
        
        // Criterios de Exclusión (Seguridad y Rendimiento)
        if (
            file === 'node_modules' || 
            file === '.next' || 
            file === '.git' || 
            file === '.env' || 
            file === '.DS_Store'
        ) continue;
        
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
            // Recursión para carpetas
            const folder = zip.folder(relPath);
            if (folder) await addDirectoryToZip(zip, fullPath, rootDir);
        } else {
            // Lectura de archivo binario o texto
            const content = await fs.readFile(fullPath);
            zip.file(relPath, content);
        }
    }
}

export async function GET(req: NextRequest) {
    try {
        const zip = new JSZip();
        const rootDir = process.cwd();
        
        // Añadir una nota de README específica para la versión offline
        zip.file("README_OFFLINE.txt", `
            KREA BUSINESS v2.0 - PAQUETE FUENTE OFFLINE
            -------------------------------------------
            Instrucciones de Despliegue Local:
            1. Instale Node.js v20 o superior.
            2. Ejecute 'npm install' en esta carpeta.
            3. Inicie el sistema con 'npm run dev' o 'npm run build && npm start'.
            4. Realice el Handshake de activación con su token maestro.
        `);

        // Generar el paquete recorriendo el proyecto
        await addDirectoryToZip(zip, rootDir, rootDir);
        
        // Generar el binario final
        const zipBuffer = await zip.generateAsync({ 
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 }
        });
        
        return new NextResponse(zipBuffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename=krea-business-source-v2.zip',
                'Cache-Control': 'no-cache'
            },
        });

    } catch (e: any) {
        console.error('Error al empaquetar código:', e);
        return NextResponse.json({ 
            message: 'Fallo al generar el paquete de código fuente real.',
            error: e.message 
        }, { status: 500 });
    }
}
