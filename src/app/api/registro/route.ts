import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import StoreModel from '@/models/Store';
import RoleModel, { IRole } from '@/models/Role';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

/**
 * Inicializador de Roles Estratégicos.
 */
async function getOrCreateRole(storeId: mongoose.Types.ObjectId | null, session: mongoose.ClientSession, roleName: string, isMaster: boolean): Promise<IRole> {
    let role = await RoleModel.findOne({ store: storeId, name: roleName }).session(session);
    
    if (!role) {
        let permissions = ['view_dashboard'];
        
        // Asignación de permisos por jerarquía
        if (isMaster || roleName === 'SUPER_ADMIN_MASTER' || roleName === 'Administrador Principal') {
            permissions = ['all'];
        } else if (roleName.includes('Ventas')) {
            permissions = ['view_dashboard', 'manage_sales', 'view_reports'];
        } else if (roleName.includes('Inventario')) {
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

    if (!email || !password || !name) {
      return NextResponse.json({ message: 'Todos los campos de identidad son obligatorios.' }, { status: 400 });
    }

    let storeId = null;

    // 1. Gestión de Empresa (Tenants)
    if (!isGlobalAdmin) {
        if (!businessName) {
            return NextResponse.json({ message: 'El nombre del negocio es obligatorio.' }, { status: 400 });
        }
        
        const newStore = new StoreModel({
          name: businessName,
          address: 'Ubicación por definir',
          seniatCondition: 'Contribuyente Ordinario',
          status: 'Demo'
        });
        
        await newStore.save({ session });
        storeId = newStore._id as mongoose.Types.ObjectId;
    }

    // 2. Creación de Rol
    const finalRoleName = isGlobalAdmin ? 'SUPER_ADMIN_MASTER' : (roleName || 'Administrador Principal');
    const role = await getOrCreateRole(storeId, session, finalRoleName, !!isGlobalAdmin);

    // 3. Seguridad de Acceso
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Registro de Usuario
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
      message: isGlobalAdmin ? 'Perfil de Desarrollador Maestro activado.' : 'Empresa y administrador registrados exitosamente.',
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        store: newUser.store?.toString() || 'SYSTEM_MASTER',
        isGlobalAdmin: newUser.isGlobalAdmin
      }
     }, { status: 201 });

  } catch (error: any) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error('REGISTRATION FAILURE:', error);
    
    if (error.code === 11000) {
      return NextResponse.json({ message: 'El nombre de usuario o email ya existe en el sistema.' }, { status: 409 });
    }
    
    return NextResponse.json({ message: 'Fallo en la creación de cuenta.' }, { status: 500 });
  } finally {
    session.endSession();
  }
}
