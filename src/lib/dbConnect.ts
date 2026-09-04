import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Importar modelos para asegurar su registro inicial
import '@/models/Store';
import '@/models/User';
import '@/models/Role';
import '@/models/SystemConfig';
import '@/models/SaaSPayment';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Por favor, define la variable de entorno MONGODB_URI dentro de .env'
  );
}

let cachedConnection: typeof mongoose | null = null;

async function dbConnect() {
  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    // Evitar advertencias de Mongoose 7+
    mongoose.set('strictQuery', true);
    
    const conn = await mongoose.connect(MONGODB_URI, {
        bufferCommands: false,
    });
    
    cachedConnection = conn;
    console.log('--- CONEXIÓN EXITOSA: NÚCLEO KREA ESTABLECIDO ---');
    return conn;
  } catch (error) {
    console.error('Error crítico al conectar a MongoDB:', error);
    throw new Error('Fallo de infraestructura: No se pudo conectar a la base de datos maestra.');
  }
}

export default dbConnect;
