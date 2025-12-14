
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

    // --- Classic Manual Validation ---
    const { storeId, customerId, customerName, items, paymentMethod, paymentReference } = body;

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
    // --- End Classic Validation ---

    // Calculate subtotals and taxes on the backend to ensure data integrity
    const subtotals = {
        exempt: 0,   // taxRate === 0
        general: 0,  // taxRate === 0.16
        reduced: 0   // taxRate === 0.08
    };

    for (const item of items) {
        if (typeof item.price !== 'number' || typeof item.quantity !== 'number' || typeof item.taxRate !== 'number') {
            throw new Error(`El artículo '${item.name}' contiene datos inválidos.`);
        }
        const itemTotal = item.price * item.quantity;
        if (item.taxRate === 0) {
            subtotals.exempt += itemTotal;
        } else if (item.taxRate === 0.08) {
            subtotals.reduced += itemTotal;
        } else { // Default to 16% if not 0 or 8
            subtotals.general += itemTotal;
        }
    }

    const taxDetails = {
        general: subtotals.general * 0.16,
        reduced: subtotals.reduced * 0.08
    };

    const totalAmount = subtotals.exempt + subtotals.general + subtotals.reduced + taxDetails.general + taxDetails.reduced;

    // Get next invoice number
    const counter = await SaleCounterModel.findOneAndUpdate(
      { storeId: storeId },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, session }
    );
    const invoiceNumber = counter.seq;


    // 1. Update product stock
    for (const item of items) {
      const product = await ProductModel.findById(item.productId).session(session);
      if (!product || product.stock < item.quantity) {
        throw new Error(`Stock insuficiente para el producto: ${item.name}`);
      }

      const newStock = product.stock - item.quantity;
      let newStatus: 'En Stock' | 'Stock Bajo' | 'Sin Stock' = 'En Stock';
      if (newStock <= 0) {
        newStatus = 'Sin Stock';
      } else if (newStock <= product.minStock) {
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

    // 2. Create the sale
    const newSale = new SaleModel({
      store: storeId,
      invoiceNumber: invoiceNumber,
      customer: customerId,
      customerName: customerName,
      subtotals: subtotals,
      taxDetails: taxDetails,
      totalAmount: totalAmount,
      items: items.map((i: any) => ({ 
          product: i.productId, 
          quantity: i.quantity, 
          price: i.price, 
          name: i.name,
          taxRate: i.taxRate,
        })),
      paymentMethod,
      paymentReference: paymentReference || '',
      status: finalStatus,
    });
    await newSale.save({ session });

    // 3. Create account receivable if payment is not immediate
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

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json(newSale, { status: 201 });

  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error al crear la venta:', error);
    // Return the specific error message
    const errorMessage = error.message || 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
