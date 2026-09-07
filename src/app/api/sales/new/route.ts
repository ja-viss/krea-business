
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SaleModel, { SaleCounterV2Model } from '@/models/Sale';
import ProductModel from '@/models/Product';
import CashSessionModel from '@/models/CashSession';
import StoreModel from '@/models/Store';
import mongoose from 'mongoose';
import { startOfMonth, endOfMonth } from 'date-fns';

export async function POST(req: NextRequest) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const body = await req.json();
    const { storeId, customerId, customerName, items, paymentMethod, paymentReference, paymentCurrency } = body;

    if (!storeId) throw new Error("El ID de la tienda es obligatorio.");

    // 0. VALIDACIÓN DE LÍMITES SAAS Y CONTROL DE CAJA
    const store = await StoreModel.findById(storeId).session(session);
    if (!store) throw new Error("Tienda no encontrada.");

    // VALIDACIÓN DE CAJA (Si está habilitado en configuración)
    let activeCashSessionId = null;
    if (store.enforceCashControl) {
        const activeSession = await CashSessionModel.findOne({ 
            store: storeId, 
            status: 'Abierta' 
        }).session(session);

        if (!activeSession) {
            throw new Error("OPERACIÓN BLOQUEADA: No hay un turno de caja abierto. Por favor, realice la apertura de caja antes de facturar.");
        }
        activeCashSessionId = activeSession._id;
    }

    // Contar facturas emitidas este mes para límites del plan
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    const invoicesThisMonth = await SaleModel.countDocuments({
        store: storeId,
        createdAt: { $gte: monthStart, $lte: monthEnd }
    }).session(session);

    if (invoicesThisMonth >= store.maxInvoicesPerMonth) {
        throw new Error(`Límite de plan alcanzado (${store.maxInvoicesPerMonth} facturas/mes). Por favor, contacte a soporte.`);
    }

    if (!customerName) throw new Error("El nombre del cliente es obligatorio.");
    if (!Array.isArray(items) || items.length === 0) throw new Error("La lista de productos está vacía.");
    
    // 1. Obtener número de factura
    const counter = await SaleCounterV2Model.findOneAndUpdate(
        { storeId: storeId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, session, setDefaultsOnInsert: true }
    );
    
    if (!counter) throw new Error('No se pudo generar el correlativo.');
    const newInvoiceNumber = counter.seq;

    // 2. Validar stock y descontar
    for (const item of items) {
      const product = await ProductModel.findById(item.productId).session(session);
      if (!product) throw new Error(`El producto ${item.name} no existe.`);
      
      if (product.stock < item.quantity) {
        throw new Error(`Stock insuficiente para: ${item.name}. Disponible: ${product.stock}`);
      }

      const newStock = product.stock - item.quantity;
      let newStatus: 'En Stock' | 'Stock Bajo' | 'Sin Stock' = 'En Stock';
      if (newStock <= 0) newStatus = 'Sin Stock';
      else if (newStock <= product.minStock) newStatus = 'Stock Bajo';

      await ProductModel.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity }, $set: { status: newStatus } },
        { session }
      );
    }
    
    const finalStatus = (paymentMethod === 'Efectivo' || paymentMethod === 'Tarjeta' || paymentMethod === 'Pago Móvil') ? 'Pagado' : 'Pendiente';

    // Cálculos fiscales
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

    // 3. Crear venta
    const newSale = new SaleModel({
      store: storeId,
      cashSession: activeCashSessionId,
      invoiceNumber: newInvoiceNumber,
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
      status: finalStatus,
    });
    
    await newSale.save({ session });

    await session.commitTransaction();
    return NextResponse.json(newSale, { status: 201 });

  } catch (error: any) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error('POS ERROR:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  } finally {
    session.endSession();
  }
}
