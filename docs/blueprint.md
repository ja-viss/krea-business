# **App Name**: Krea Business Suite

## Core Features:

- User Authentication and Roles: Secure authentication system with email/password and security questions for account recovery. Five user roles (Admin, Sales Manager, Inventory Manager, Salesperson, Warehouse Manager) with role-based access control (RBAC).
- Dashboard: Display key metrics like total sales, expenses, number of clients/products, monthly profit summary, recent sales table, and expense distribution chart. Quick access buttons for adding sales and exporting summaries.
- Point of Sale (POS): Interface to register new sales, search/register clients, add products by name/QR/SKU, adjust quantities, calculate totals, select payment currency/method, and update inventory stock. Generates PDF invoices.
- Inventory Management: List products with image, name, status, stock, and price. Add, edit, and delete products with details like SKU, category, stock, price, and image URL. Generate/show QR and barcode codes for each product. Export inventory list to PDF.
- Expense Tracking: Table to list expenses with date, description, category, and amount. Functionality to add, edit, and delete expenses. Export expenses list to PDF.
- AI-Powered Insights: Leverage Genkit to analyze sales and inventory data. Recommends optimal stock levels and reorder quantities for inventory optimization, providing summaries of top-selling products as a tool.
- Settings and Configuration: User profile editing, password changes, security question setup, and financial settings (tax rates and currency exchange rates - admin only).

## Style Guidelines:

- Primary color: A saturated blue (#29ABE2) evokes trust and reliability suitable for business applications.
- Background color: A desaturated light blue (#E5F6FD), visually very close in hue to the primary color, provides a clean and professional backdrop.
- Accent color: A purple hue (#A259FF), placed to the "left" of the blue in the color wheel, and with great differences in brightness and saturation, draws attention to important interactive elements.
- Body and headline font: 'Inter', a sans-serif font, gives a clean, modern, objective and neutral look, which is versatile enough for both headlines and body text.
- Use modern, minimalist icons from Lucide React to represent different modules and actions.
- Implement a responsive grid layout using Tailwind CSS to ensure optimal viewing experience across desktop and mobile devices.
- Subtle transitions and animations using ShadCN/UI components for a smooth and engaging user experience.