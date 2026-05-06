
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SaleModel, { SaleCounterModel } from '@/models/Sale';
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

    // Manual validations
    if (!storeId) {
      throw new Error("El ID de la tienda es obligatorio.");
    }
    if (!customerName) {
      throw new Error("El nombre del cliente es obligatorio.");
    }
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error("La lista de artículos es obligatoria y no puede estar vacía.");
    }
     if (!paymentMethod) {
      throw new Error("El método de pago es obligatorio.");
    }
    
    // 1. Get the next invoice number atomically within the transaction
    // Se usa storeId para coincidir con el índice existente en la DB
    const counter = await SaleCounterModel.findOneAndUpdate(
        { storeId: storeId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, session }
    );
    if (!counter) {
        throw new Error('No se pudo generar el número de factura.');
    }
    const newInvoiceNumber = counter.seq;


    // 2. Update product stock within the transaction
    for (const item of items) {
      const product = await ProductModel.findById(item.productId).session(session);
      if (!product || product.stock < item.quantity) {
        throw new Error(`Stock insuficiente para el producto: ${item.name}`);
      }

      const newStock = product.stock - item.quantity;
      let newStatus: 'En Stock' | 'Stock Bajo' | 'Sin Stock' = product.status;
      
      if (newStock <= 0) {
        newStatus = 'Sin Stock';
      } else if (newStock > 0 && newStock <= product.minStock) {
        newStatus = 'Stock Bajo';
      }

      await ProductModel.findByIdAndUpdate(
        item.productId,
        { 
          $inc: { stock: -item.quantity },
          $set: { status: newStatus }
        },
        { session }
      );
    }
    
    const finalStatus = (paymentMethod === 'Efectivo' || paymentMethod === 'Tarjeta') ? 'Pagado' : 'Pendiente';

    // SERVER-SIDE CALCULATION
    const subtotals = { exempt: 0, general: 0, reduced: 0 };
    for (const item of items) {
        const itemTotal = item.price * item.quantity;
        if (item.taxRate === 0) {
            subtotals.exempt += itemTotal;
        } else if (item.taxRate === 0.08) {
            subtotals.reduced += itemTotal;
        } else {
            subtotals.general += itemTotal;
        }
    }
    const taxDetails = {
        general: subtotals.general * 0.16,
        reduced: subtotals.reduced * 0.08
    };
    const totalAmount = subtotals.exempt + subtotals.general + subtotals.reduced + taxDetails.general + taxDetails.reduced;

    // 3. Create the sale with the new invoice number
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
    // Save the new sale within the transaction
    await newSale.save({ session });


    // 4. Create account receivable if payment is not immediate
    if (newSale.status === 'Pendiente') {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // Example: due in 30 days
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

    // If all operations succeed, commit the transaction
    await session.commitTransaction();
    
    return NextResponse.json(newSale, { status: 201 });

  } catch (error: any) {
    // If any operation fails, abort the transaction
    await session.abortTransaction();
    console.error('Error al crear la venta:', error);
    const errorMessage = error.message || 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  } finally {
    session.endSession();
  }
}
