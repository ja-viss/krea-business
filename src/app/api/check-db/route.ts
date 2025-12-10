
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

export async function GET(req: NextRequest) {
  if (!MONGODB_URI) {
    return NextResponse.json({ message: 'La variable de entorno MONGODB_URI no está definida.' }, { status: 500 });
  }

  try {
    // Intenta crear una nueva conexión para verificar.
    // Usamos createConnection para no interferir con la conexión principal de Mongoose.
    const connection = await mongoose.createConnection(MONGODB_URI).asPromise();
    
    // Si llegamos aquí, la conexión fue exitosa.
    // Cierra la conexión de prueba inmediatamente.
    await connection.close();

    return NextResponse.json({ message: 'La conexión a la base de datos se ha establecido correctamente.' }, { status: 200 });

  } catch (error) {
    console.error('Error al verificar la conexión a MongoDB:', error);
    
    let errorMessage = 'Error desconocido al conectar a la base de datos.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }

    return NextResponse.json({ message: 'No se pudo conectar a la base de datos.', error: errorMessage }, { status: 500 });
  }
}
