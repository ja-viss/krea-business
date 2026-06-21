import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SaleModel from '@/models/Sale';
import ExpenseModel from '@/models/Expense';
import ProductModel from '@/models/Product';
import StoreModel from '@/models/Store';
import UserModel from '@/models/User';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const storeIdStr = req.nextUrl.searchParams.get('storeId');
    const isGlobal = storeIdStr === 'SYSTEM_MASTER';

    // --- DASHBOARD PARA EL SUPER DESARROLLADOR (SISTEMA COMPLETO) ---
    if (isGlobal) {
        const totalStores = await StoreModel.countDocuments();
        const totalUsers = await UserModel.countDocuments({ isGlobalAdmin: false });
        
        // Ventas Totales en toda la plataforma
        const globalSalesData = await SaleModel.aggregate([
            { $match: { status: 'Pagado' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]);
        const totalGlobalSales = globalSalesData[0]?.total || 0;

        // Historial de ventas mensuales global (últimos 6 meses)
        const monthlyProfit: { month: string, profit: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            const start = startOfMonth(date);
            const end = endOfMonth(date);

            const salesInMonth = await SaleModel.aggregate([
                { $match: { status: 'Pagado', createdAt: { $gte: start, $lte: end }}},
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]);

            monthlyProfit.push({
                month: format(date, 'MMM', { locale: es }),
                profit: salesInMonth[0]?.total || 0,
            });
        }

        return NextResponse.json({
            totalSales: totalGlobalSales,
            salesChange: 0,
            totalExpenses: totalStores, // Reutilizado para contar tiendas en la UI si es necesario
            customerCount: totalUsers,
            productCount: totalStores,
            recentSales: [],
            monthlyProfit,
            expenseDistribution: [],
            isSystemMaster: true
        }, { status: 200 });
    }

    // --- DASHBOARD NORMAL PARA TIENDAS ---
    if (!storeIdStr || !mongoose.Types.ObjectId.isValid(storeIdStr)) {
      return NextResponse.json({ message: 'ID de tienda inválido.' }, { status: 400 });
    }

    const storeId = new mongoose.Types.ObjectId(storeIdStr);

    const totalSalesData = await SaleModel.aggregate([
      { $match: { store: storeId, status: 'Pagado' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalSales = totalSalesData[0]?.total || 0;
    
    const oneMonthAgo = subMonths(new Date(), 1);
    const lastMonthSalesData = await SaleModel.aggregate([
        { $match: { store: storeId, status: 'Pagado', createdAt: { $gte: oneMonthAgo } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const lastMonthSales = lastMonthSalesData[0]?.total || 0;
    const salesChange = 0; // Simplificado

    const totalExpensesData = await ExpenseModel.aggregate([
      { $match: { store: storeId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalExpenses = totalExpensesData[0]?.total || 0;

    const customerCount = await SaleModel.distinct('customerName', { store: storeId }).then(res => res.length);
    const productCount = await ProductModel.countDocuments({ store: storeId });

    const recentSales = await SaleModel.find({ store: storeId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('customerName totalAmount');

    const monthlyProfit: { month: string, profit: number }[] = [];
    for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date);
        const end = endOfMonth(date);
        const salesInMonth = await SaleModel.aggregate([
            { $match: { store: storeId, status: 'Pagado', createdAt: { $gte: start, $lte: end }}},
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const expensesInMonth = await ExpenseModel.aggregate([
            { $match: { store: storeId, date: { $gte: start, $lte: end }}},
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const profit = (salesInMonth[0]?.total || 0) - (expensesInMonth[0]?.total || 0);
        monthlyProfit.push({ month: format(date, 'MMM', { locale: es }), profit: Math.max(0, profit) });
    }
    
    return NextResponse.json({
      totalSales,
      salesChange,
      totalExpenses,
      customerCount,
      productCount,
      recentSales,
      monthlyProfit,
      expenseDistribution: [],
      isSystemMaster: false
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error dashboard:', error);
    return NextResponse.json({ message: 'Error interno dashboard.', error: error.message }, { status: 500 });
  }
}
