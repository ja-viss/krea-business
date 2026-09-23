
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import { getTenantDb } from '@/lib/tenant-manager';
import mongoose from 'mongoose';
import { startOfMonth, endOfMonth } from 'date-fns';

export async function POST(req: NextRequest) {
  await dbConnect(); // Master DB
  
  try {
    const body = await req.json();
    const { storeId, customerId, customerName, items, paymentMethod, paymentReference, paymentCurrency } = body;

    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) throw new Error("ID tienda inválido");

    const store = await StoreModel.findById(storeId);
    if (!store) throw new Error("Tienda no encontrada.");

    // --- CONECTAR AL NODO OPERATIVO ---
    const { connection, models } = await getTenantDb(String(store._id), store.tenantDbUri || '');
    const session = await connection.startSession();
    session.startTransaction();

    try {
        // VALIDACIÓN DE CAJA
        let activeCashSessionId = null;
        if (store.enforceCashControl) {
            const activeSession = await models.CashSession.findOne({ 
                status: 'Abierta' 
            }).session(session);

            if (!activeSession) {
                throw new Error("TURNO CERRADO: Debes abrir caja para facturar.");
            }
            activeCashSessionId = activeSession._id;
        }

        // LÍMITES SAAS
        const monthStart = startOfMonth(new Date());
        const monthEnd = endOfMonth(new Date());
        const invoicesThisMonth = await models.Sale.countDocuments({
            createdAt: { $gte: monthStart, $lte: monthEnd }
        }).session(session);

        if (invoicesThisMonth >= store.maxInvoicesPerMonth) {
            throw new Error(`Límite de plan alcanzado (${store.maxInvoicesPerMonth} facturas/mes).`);
        }

        // DESCUENTO DE STOCK
        for (const item of items) {
          const product = await models.Product.findById(item.productId).session(session);
          if (!product) throw new Error(`El producto ${item.name} no existe.`);
          if (product.stock < item.quantity) {
            throw new Error(`Stock insuficiente para: ${item.name}.`);
          }

          const newStock = product.stock - item.quantity;
          let newStatus: 'En Stock' | 'Stock Bajo' | 'Sin Stock' = 'En Stock';
          if (newStock <= 0) newStatus = 'Sin Stock';
          else if (newStock <= product.minStock) newStatus = 'Stock Bajo';

          await models.Product.findByIdAndUpdate(
            item.productId,
            { $inc: { stock: -item.quantity }, $set: { status: newStatus } },
            { session }
          );
        }

        // CÁLCULOS FISCALES
        const subtotals = { exempt: 0, general: 0, reduced: 0 };
        for (const item of items) {
            const itemTotal = item.price * item.quantity;
            if (item.taxRate === 0) subtotals.exempt += itemTotal;
            else if (item.taxRate === 0.08) subtotals.reduced += itemTotal;
            else subtotals.general += itemTotal;
        }
        const taxDetails = {
            general: subtotals.general * 0.16,
            reduced: subtotals.reduced * 0.08
        };
        const totalAmount = subtotals.exempt + subtotals.general + subtotals.reduced + taxDetails.general + taxDetails.reduced;

        // REGISTRO DE VENTA (NÚMERO CORRELATIVO)
        // Usamos el número de ventas actuales + 1 como correlativo simplificado para el aislamiento
        const lastSale = await models.Sale.findOne().sort({ invoiceNumber: -1 }).session(session);
        const nextInvoice = (lastSale?.invoiceNumber || 0) + 1;

        const newSale = new models.Sale({
          store: storeId,
          cashSession: activeCashSessionId,
          invoiceNumber: nextInvoice,
          customer: (customerId && mongoose.Types.ObjectId.isValid(customerId)) ? customerId : null,
          customerName,
          subtotals,
          taxDetails,
          totalAmount,
          items: items.map((i: any) => ({ 
              product: i.productId,
              name: i.name, 
              quantity: i.quantity, 
              price: i.price, 
              taxRate: i.taxRate,
            })),
          paymentMethod,
          paymentReference: paymentReference || '',
          paymentCurrency: paymentCurrency || 'VES',
          status: (paymentMethod === 'Efectivo' || paymentMethod === 'Tarjeta' || paymentMethod === 'Pago Móvil') ? 'Pagado' : 'Pendiente',
        });
        
        await newSale.save({ session });
        await session.commitTransaction();
        return NextResponse.json(newSale, { status: 201 });

    } catch (innerError: any) {
        await session.abortTransaction();
        throw innerError;
    } finally {
        session.endSession();
    }

  } catch (error: any) {
    console.error('POS ISOLATED ERROR:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
