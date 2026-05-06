
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SaleModel, { SaleCounterV2Model } from '@/models/Sale';
import ProductModel from '@/models/Product';
import AccountReceivableModel from '@/models/AccountReceivable';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const body = await req.json();
    const { storeId, customerId, customerName, items, paymentMethod, paymentReference } = body;

    if (!storeId) throw new Error("El ID de la tienda es obligatorio.");
    if (!customerName) throw new Error("El nombre del cliente es obligatorio.");
    if (!Array.isArray(items) || items.length === 0) throw new Error("La lista de artículos está vacía.");
    if (!paymentMethod) throw new Error("El método de pago es obligatorio.");
    
    // 1. Obtener número de factura usando el nuevo modelo V2
    const counter = await SaleCounterV2Model.findOneAndUpdate(
        { storeId: storeId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, session, setDefaultsOnInsert: true }
    );
    
    if (!counter) throw new Error('No se pudo generar el número de factura.');
    const newInvoiceNumber = counter.seq;

    // 2. Actualizar stock
    for (const item of items) {
      const product = await ProductModel.findById(item.productId).session(session);
      if (!product || product.stock < item.quantity) {
        throw new Error(`Stock insuficiente para: ${item.name}`);
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
    
    const finalStatus = (paymentMethod === 'Efectivo' || paymentMethod === 'Tarjeta') ? 'Pagado' : 'Pendiente';

    // Cálculos de montos
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

    // 3. Crear la venta
    const newSale = new SaleModel({
      store: storeId,
      invoiceNumber: newInvoiceNumber,
      customer: customerId,
      customerName: customerName,
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
      status: finalStatus,
    });
    await newSale.save({ session });

    // 4. Cuenta por cobrar si aplica
    if (newSale.status === 'Pendiente') {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        const newReceivable = new AccountReceivableModel({
            store: storeId,
            customer: customerName,
            sale: newSale._id,
            amount: totalAmount,
            dueDate,
            status: 'Pendiente',
        });
        await newReceivable.save({ session });
    }

    await session.commitTransaction();
    return NextResponse.json(newSale, { status: 201 });

  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error al crear la venta:', error);
    return NextResponse.json({ message: error.message || 'Error interno' }, { status: 500 });
  } finally {
    session.endSession();
  }
}
