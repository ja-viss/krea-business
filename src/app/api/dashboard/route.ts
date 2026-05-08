import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SaleModel from '@/models/Sale';
import ExpenseModel from '@/models/Expense';
import ProductModel from '@/models/Product';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const storeId = req.nextUrl.searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ message: 'El ID de la tienda es obligatorio.' }, { status: 400 });
    }

    // KPI: Total Sales
    const totalSalesData = await SaleModel.aggregate([
      { $match: { store: storeId, status: 'Pagado' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalSales = totalSalesData[0]?.total || 0;
    
    // KPI: Sales Change
    const oneMonthAgo = subMonths(new Date(), 1);
    const twoMonthsAgo = subMonths(new Date(), 2);

    const lastMonthSalesData = await SaleModel.aggregate([
        { $match: { store: storeId, status: 'Pagado', createdAt: { $gte: oneMonthAgo } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const lastMonthSales = lastMonthSalesData[0]?.total || 0;

    const previousMonthSalesData = await SaleModel.aggregate([
        { $match: { store: storeId, status: 'Pagado', createdAt: { $gte: twoMonthsAgo, $lt: oneMonthAgo } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const previousMonthSales = previousMonthSalesData[0]?.total || 0;

    const salesChange = previousMonthSales > 0 ? ((lastMonthSales - previousMonthSales) / previousMonthSales) * 100 : (lastMonthSales > 0 ? 100 : 0);

    // KPI: Total Expenses
    const totalExpensesData = await ExpenseModel.aggregate([
      { $match: { store: storeId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalExpenses = totalExpensesData[0]?.total || 0;

    // KPI: Customer Count (Fix: distinct returns array, get length)
    const customers = await SaleModel.distinct('customerName', { store: storeId });
    const customerCount = customers.length;

    // KPI: Product Count
    const productCount = await ProductModel.countDocuments({ store: storeId });

    // Recent Sales
    const recentSales = await SaleModel.find({ store: storeId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('customerName totalAmount');

    // Monthly Profit Chart
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
        monthlyProfit.push({
            month: format(date, 'MMM', { locale: es }),
            profit: Math.max(0, profit),
        });
    }
    
    // Expense Distribution
    const expenseDistributionData = await ExpenseModel.aggregate([
        { $match: { store: storeId } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
        { $limit: 5 }
    ]);
    
    const chartColors = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)'];

    const expenseDistribution = expenseDistributionData.map((item, index) => ({
        name: item._id,
        value: item.total,
        fill: chartColors[index % chartColors.length]
    }));

    return NextResponse.json({
      totalSales,
      salesChange,
      totalExpenses,
      customerCount,
      productCount,
      recentSales,
      monthlyProfit,
      expenseDistribution
    }, { status: 200 });
  } catch (error) {
    console.error('Error dashboard:', error);
    return NextResponse.json({ message: 'Error interno.' }, { status: 500 });
  }
}
