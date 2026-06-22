
import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import fs from 'fs/promises';
import path from 'path';

/**
 * Motor Real de Extracción de Código Fuente.
 * Recorre recursivamente el proyecto y genera un paquete ZIP comprimido.
 */

async function addFilesRecursively(zip: JSZip, dirPath: string, rootDir: string) {
    const items = await fs.readdir(dirPath);
    
    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const relPath = path.relative(rootDir, fullPath);
        
        // Filtros de seguridad y optimización
        if (
            item === 'node_modules' || 
            item === '.next' || 
            item === '.git' || 
            item === '.env' || 
            item === '.DS_Store' ||
            item === '.turbo'
        ) continue;
        
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
            await addFilesRecursively(zip, fullPath, rootDir);
        } else {
            const content = await fs.readFile(fullPath);
            zip.file(relPath, content);
        }
    }
}

export async function GET(req: NextRequest) {
    try {
        const zip = new JSZip();
        const rootDir = process.cwd();
        
        // Agregar Nota Técnica
        zip.file("LEEME_PRIMERO.txt", `
KREA BUSINESS v2.0 - DISTRIBUCIÓN OFFLINE
------------------------------------------
Instrucciones de Despliegue en Servidor Local:

1. Requisitos: Node.js v20+ y MongoDB Local o Atlas.
2. Instalación:
   $ unzip krea-business.zip
   $ npm install
   $ npm run build
   $ npm start
3. Activación:
   Acceda a /login y siga el protocolo de Handshake con el token generado 
   en el Panel Maestro de Krea Business Cloud.
        `);

        // Ejecutar escaneo real
        await addFilesRecursively(zip, rootDir, rootDir);
        
        // Generar buffer binario
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
        console.error('Fallo Crítico en Extracción:', e);
        return NextResponse.json({ 
            message: 'No se pudo generar el paquete de código fuente real.',
            error: e.message 
        }, { status: 500 });
    }
}
