import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import StoreModel from '@/models/Store';
import RoleModel, { IRole } from '@/models/Role';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

/**
 * Obtiene o crea un rol específico para una tienda o para el sistema global.
 */
async function getOrCreateRole(storeId: mongoose.Types.ObjectId | null, session: mongoose.ClientSession, roleName: string, isMaster: boolean): Promise<IRole> {
    // Buscar rol existente para evitar duplicados
    let role = await RoleModel.findOne({ store: storeId, name: roleName }).session(session);
    
    if (!role) {
        // Definir permisos base
        let permissions = ['view_dashboard'];
        
        // El Super Admin Master tiene poder total
        if (isMaster || roleName === 'SUPER_ADMIN_MASTER') {
            permissions = ['all'];
        } else if (roleName === 'Administrador Principal') {
            permissions = ['all'];
        } else if (roleName.includes('Ventas')) {
            permissions = ['view_dashboard', 'manage_sales', 'view_reports'];
        } else if (roleName.includes('Inventario') || roleName.includes('Almacenista')) {
            permissions = ['view_dashboard', 'manage_inventory', 'view_reports'];
        }

        role = new RoleModel({
            name: roleName,
            store: storeId,
            permissions: permissions,
            isSystemRole: isMaster
        });
        await role.save({ session });
    }
    return role;
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { businessName, email, password, name, isGlobalAdmin, roleName } = await req.json();

    // Validaciones básicas
    if (!email || !password || !name) {
      return NextResponse.json({ message: 'Nombre, Email/Usuario y Contraseña son obligatorios.' }, { status: 400 });
    }

    let storeId = null;

    // 1. Manejo de Tienda (Solo si no es Admin Global)
    if (!isGlobalAdmin) {
        if (!businessName) {
            return NextResponse.json({ message: 'El nombre de la tienda es obligatorio para registros locales.' }, { status: 400 });
        }
        
        const newStore = new StoreModel({
          name: businessName,
          address: 'Dirección por completar',
          seniatCondition: 'Contribuyente Ordinario',
        });
        
        await newStore.save({ session });
        storeId = newStore._id as mongoose.Types.ObjectId;
    }

    // 2. Obtener o crear el rol adecuado
    // Si es isGlobalAdmin, forzamos el nombre de rol maestro
    const finalRoleName = isGlobalAdmin ? 'SUPER_ADMIN_MASTER' : (roleName || 'Administrador Principal');
    const role = await getOrCreateRole(storeId, session, finalRoleName, !!isGlobalAdmin);

    // 3. Hashear contraseña de forma segura
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Crear el usuario administrador
    const newUser = new UserModel({
      store: storeId,
      name,
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: role._id,
      active: true,
      isGlobalAdmin: !!isGlobalAdmin
    });
    
    await newUser.save({ session });
    await session.commitTransaction();

    return NextResponse.json({ 
      message: isGlobalAdmin ? 'Super Desarrollador registrado exitosamente.' : 'Tienda y Administrador creados con éxito.',
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        store: newUser.store?.toString() || 'SYSTEM_MASTER',
        isGlobalAdmin: newUser.isGlobalAdmin
      }
     }, { status: 201 });

  } catch (error: any) {
    if (session.inTransaction()) {
        await session.abortTransaction();
    }
    
    console.error('Fallo crítico en el registro:', error);
    
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Este nombre de usuario o email ya está en uso.' }, { status: 409 });
    }
    
    return NextResponse.json({ 
        message: 'Error interno al procesar el registro.', 
        details: error.message 
    }, { status: 500 });
  } finally {
    session.endSession();
  }
}
