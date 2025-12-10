import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config(); // Carga las variables de entorno desde .env

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Por favor, define la variable de entorno MONGODB_URI dentro de .env'
  );
}

let cachedConnection: typeof mongoose | null = null;

async function dbConnect() {
  if (cachedConnection) {
    console.log('Usando conexión de base de datos existente.');
    return cachedConnection;
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI);
    cachedConnection = conn;
    console.log('Conexión exitosa a MongoDB Atlas.');
    return conn;
  } catch (error) {
    console.error('Error al conectar a MongoDB Atlas:', error);
    throw new Error('Error al conectar a la base de datos.');
  }
}

export default dbConnect;
