import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SaleModel from '@/models/Sale';
import ExpenseModel from '@/models/Expense';
import UserModel from '@/models/User';
import ProductModel from '@/models/Product';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // KPI: Total Sales
    const totalSalesData = await SaleModel.aggregate([
      { $match: { status: 'Pagado' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalSales = totalSalesData[0]?.total || 0;
    
    // KPI: Sales Change
    const oneMonthAgo = subMonths(new Date(), 1);
    const twoMonthsAgo = subMonths(new Date(), 2);

    const lastMonthSalesData = await SaleModel.aggregate([
        { $match: { status: 'Pagado', createdAt: { $gte: oneMonthAgo } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const lastMonthSales = lastMonthSalesData[0]?.total || 0;

    const previousMonthSalesData = await SaleModel.aggregate([
        { $match: { status: 'Pagado', createdAt: { $gte: twoMonthsAgo, $lt: oneMonthAgo } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const previousMonthSales = previousMonthSalesData[0]?.total || 0;

    const salesChange = previousMonthSales > 0 ? ((lastMonthSales - previousMonthSales) / previousMonthSales) * 100 : (lastMonthSales > 0 ? 100 : 0);


    // KPI: Total Expenses
    const totalExpensesData = await ExpenseModel.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalExpenses = totalExpensesData[0]?.total || 0;

    // KPI: Customer Count (using distinct emails from sales)
    const customerCount = await SaleModel.distinct('customerEmail').countDocuments();

    // KPI: Product Count
    const productCount = await ProductModel.countDocuments();

    // Recent Sales
    const recentSales = await SaleModel.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('customerName customerEmail amount');

    // Monthly Profit Chart
    const monthlyProfit: { month: string, profit: number }[] = [];
    for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date);
        const end = endOfMonth(date);

        const salesInMonth = await SaleModel.aggregate([
            { $match: { status: 'Pagado', createdAt: { $gte: start, $lte: end }}},
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const expensesInMonth = await ExpenseModel.aggregate([
            { $match: { date: { $gte: start, $lte: end }}},
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const profit = (salesInMonth[0]?.total || 0) - (expensesInMonth[0]?.total || 0);
        monthlyProfit.push({
            month: format(date, 'MMM', { locale: es }),
            profit: Math.max(0, profit), // Avoid negative profit for chart
        });
    }
    
    // Expense Distribution
    const expenseDistributionData = await ExpenseModel.aggregate([
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

    const response = {
      totalSales,
      salesChange,
      totalExpenses,
      customerCount,
      productCount,
      recentSales,
      monthlyProfit,
      expenseDistribution
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error al obtener datos del dashboard:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al obtener datos del dashboard.', error: errorMessage }, { status: 500 });
  }
}
