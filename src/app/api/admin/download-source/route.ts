
import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import fs from 'fs/promises';
import path from 'path';

/**
 * Motor de Extracción de Código Fuente Reforzado.
 * Genera un binario ZIP real escaneando el sistema de archivos del proyecto.
 */

async function addFilesRecursively(zip: JSZip, dirPath: string, rootDir: string) {
    const items = await fs.readdir(dirPath);
    
    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const relPath = path.relative(rootDir, fullPath);
        
        // Filtros de exclusión estrictos para evitar archivos basura o pesados
        if (
            item === 'node_modules' || 
            item === '.next' || 
            item === '.git' || 
            item === '.env' || 
            item === '.DS_Store' ||
            item === '.turbo' ||
            item === 'dist' ||
            item === 'build'
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
        
        // Agregar Nota Técnica de Despliegue
        zip.file("INSTRUCCIONES_OFFLINE.txt", `
KREA BUSINESS v2.0 - PROTOCOLO DE DESPLIEGUE LOCAL
-------------------------------------------------
Este paquete contiene el código fuente real del sistema preparado para
entornos de ejecución Node.js v20+.

PASOS PARA LA INSTALACIÓN:
1. Descomprimir el archivo en el servidor local.
2. Ejecutar: npm install --production
3. Ejecutar: npm run build
4. Iniciar: npm start
5. Activación: Acceda a la URL local (puerto 3000) e ingrese el 
   TOKEN DE ACTIVACIÓN generado desde su panel central de Krea Cloud.

SEGURIDAD:
Este código requiere Handshake con el servidor maestro para funcionar.
`);

        // Escaneo real del proyecto
        await addFilesRecursively(zip, rootDir, rootDir);
        
        // Generación del binario ZIP con compresión máxima
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
        console.error('Error Crítico en Extracción de Código:', e);
        return NextResponse.json({ 
            message: 'No se pudo generar el paquete de código fuente.',
            error: e.message 
        }, { status: 500 });
    }
}
