
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
    if (!Array.isArray(items) || items.length === 0) throw new Error("La lista de productos está vacía.");
    
    // 1. Obtener número de factura con contador único por tienda
    const counter = await SaleCounterV2Model.findOneAndUpdate(
        { storeId: storeId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, session, setDefaultsOnInsert: true }
    );
    
    if (!counter) throw new Error('No se pudo generar el número de factura correlativo.');
    const newInvoiceNumber = counter.seq;

    // 2. Validar stock y descontar inventario
    for (const item of items) {
      const product = await ProductModel.findById(item.productId).session(session);
      if (!product) {
        throw new Error(`El producto ${item.name} ya no existe en el catálogo.`);
      }
      
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
    
    // Determinar estado de la venta
    const finalStatus = (paymentMethod === 'Efectivo' || paymentMethod === 'Tarjeta') ? 'Pagado' : 'Pendiente';

    // Cálculos financieros para auditoría
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

    // 3. Crear el documento de venta
    // Validamos que el customerId sea un ObjectId válido para evitar errores de casteo en el futuro
    const validCustomerId = (customerId && mongoose.Types.ObjectId.isValid(customerId)) ? customerId : null;

    const newSale = new SaleModel({
      store: storeId,
      invoiceNumber: newInvoiceNumber,
      customer: validCustomerId,
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

    // 4. Crear cuenta por cobrar automática si el pago no es inmediato
    if (newSale.status === 'Pendiente') {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // Crédito por defecto 30 días
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
    if (session.inTransaction()) {
        await session.abortTransaction();
    }
    console.error('Fallo al procesar la venta:', error);
    return NextResponse.json({ 
        message: error.message || 'Error interno al procesar la transacción bancaria/inventario.' 
    }, { status: 500 });
  } finally {
    session.endSession();
  }
}
