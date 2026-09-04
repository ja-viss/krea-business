
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Registro forzado de todos los modelos para evitar errores de compilación en producción/demo
import '@/models/Store';
import '@/models/User';
import '@/models/Role';
import '@/models/SystemConfig';
import '@/models/SaaSPayment';
import '@/models/AuditLog';
import '@/models/CashSession';
import '@/models/Sale';
import '@/models/Product';
import '@/models/Customer';
import '@/models/Expense';
import '@/models/Return';
import '@/models/Quotation';
import '@/models/AccountPayable';
import '@/models/AccountReceivable';
import '@/models/CreditNote';

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
