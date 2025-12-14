import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SaleModel from '@/models/Sale';
import ProductModel from '@/models/Product';
import AccountReceivableModel from '@/models/AccountReceivable';
import mongoose from 'mongoose';
import { z } from 'zod';


const saleSchema = z.object({
  storeId: z.string(),
  customerId: z.string().optional(),
  customerName: z.string(),
  amount: z.number(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1),
    price: z.number(),
    name: z.string(),
    stock: z.number(),
  })).min(1),
  paymentMethod: z.string(),
  paymentCurrency: z.string().optional(),
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

    const { storeId, customerId, customerName, amount, items, paymentMethod, status: saleStatus } = validation.data;

    // 1. Update product stock
    for (const item of items) {
      const product = await ProductModel.findById(item.productId).session(session);
      if (!product || product.stock < item.quantity) {
        throw new Error(`Stock insuficiente para el producto: ${item.name}`);
      }

      // Determine the new status
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
    
    // 2. Create the sale
    const newSale = new SaleModel({
      store: storeId,
      customer: customerId,
      customerName: customerName,
      customerEmail: 'placeholder@email.com', // Placeholder, adjust as needed
      amount,
      items: items.map(i => ({ product: i.productId, quantity: i.quantity, price: i.price })),
      paymentMethod,
      status: saleStatus || (paymentMethod === 'Efectivo' || paymentMethod === 'Tarjeta' ? 'Pagado' : 'Pendiente'),
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
            amount,
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
