
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SaleModel, { SaleCounterModel } from '@/models/Sale';
import ProductModel from '@/models/Product';
import AccountReceivableModel from '@/models/AccountReceivable';
import mongoose from 'mongoose';
import { z } from 'zod';


const saleSchema = z.object({
  storeId: z.string(),
  customerId: z.string().optional(),
  customerName: z.string(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1),
    price: z.number(), // Price in VES
    name: z.string(),
    stock: z.number(),
    taxRate: z.number(),
  })).min(1),
  paymentMethod: z.string(),
  paymentReference: z.string().optional(),
  status: z.string().optional(),
});


export async function POST(req: NextRequest) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const body = await req.json();
    const validation = saleSchema.safeParse(body);

    if (!validation.success) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ message: 'Datos de venta inválidos', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { storeId, customerId, customerName, items, paymentMethod, status: saleStatus, paymentReference } = validation.data;
    
    // Calculate subtotals and taxes
    const subtotals = {
        exempt: 0,   // taxRate === 0
        general: 0,  // taxRate === 0.16
        reduced: 0   // taxRate === 0.08
    };

    for (const item of items) {
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
    
    const finalStatus = saleStatus ? saleStatus : 
        (paymentMethod === 'Efectivo' || paymentMethod === 'Tarjeta') ? 'Pagado' : 'Pendiente';

    // 2. Create the sale
    const newSale = new SaleModel({
      store: storeId,
      invoiceNumber: invoiceNumber,
      customer: customerId,
      customerName: customerName,
      subtotals: subtotals,
      taxDetails: taxDetails,
      totalAmount: totalAmount,
      items: items.map(i => ({ 
          product: i.productId, 
          quantity: i.quantity, 
          price: i.price, 
          name: i.name,
          taxRate: i.taxRate,
        })),
      paymentMethod,
      paymentReference,
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
    const errorMessage = error.message || 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al crear la venta.', error: errorMessage }, { status: 500 });
  }
}
