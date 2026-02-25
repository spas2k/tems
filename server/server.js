require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/accounts',     require('./routes/accounts'));
app.use('/api/contracts',    require('./routes/contracts'));
app.use('/api/circuits',     require('./routes/circuits'));
app.use('/api/orders',       require('./routes/orders'));
app.use('/api/invoices',     require('./routes/invoices'));
app.use('/api/line-items',   require('./routes/lineItems'));
app.use('/api/allocations',  require('./routes/allocations'));
app.use('/api/cost-savings', require('./routes/costSavings'));
app.use('/api/search',       require('./routes/search'));

// Dashboard summary
app.get('/api/dashboard', async (req, res) => {
  try {
    const [[{ totalAccounts }]]          = await db.query('SELECT COUNT(*) AS totalAccounts FROM accounts');
    const [[{ activeContracts }]]        = await db.query("SELECT COUNT(*) AS activeContracts FROM contracts WHERE status='Active'");
    const [[{ activeCircuits }]]         = await db.query("SELECT COUNT(*) AS activeCircuits FROM circuits WHERE status='Active'");
    const [[{ openInvoices }]]           = await db.query("SELECT COUNT(*) AS openInvoices FROM invoices WHERE status IN ('Open','Disputed')");
    const [[{ totalBilled }]]            = await db.query('SELECT COALESCE(SUM(total_amount),0) AS totalBilled FROM invoices');
    const [[{ totalVariance }]]          = await db.query('SELECT COALESCE(SUM(variance),0) AS totalVariance FROM line_items WHERE variance IS NOT NULL');
    const [[{ totalSavingsIdentified }]] = await db.query("SELECT COALESCE(SUM(projected_savings),0) AS totalSavingsIdentified FROM cost_savings WHERE status != 'Resolved'");
    const [[{ pendingOrders }]]          = await db.query("SELECT COUNT(*) AS pendingOrders FROM orders WHERE status='In Progress'");
    const [recentInvoices]               = await db.query('SELECT i.*, a.name AS account_name FROM invoices i LEFT JOIN accounts a ON i.account_id=a.id ORDER BY invoice_date DESC LIMIT 5');
    const [savingsOpportunities]         = await db.query("SELECT cs.*, a.name AS account_name FROM cost_savings cs LEFT JOIN accounts a ON cs.account_id=a.id WHERE cs.status != 'Resolved' ORDER BY cs.identified_date DESC");
    res.json({ totalAccounts, activeContracts, activeCircuits, openInvoices, totalBilled, totalVariance, totalSavingsIdentified, pendingOrders, recentInvoices, savingsOpportunities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`TEMS API server running on port ${PORT}`));
