const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./database/db');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-secret-key-change-in-production'; // Use env variable in production

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend files

// -------------------- Helper Functions --------------------
function generateTransactionId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'TRX-';
    for (let i = 0; i < 7; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function getCurrentTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// JWT middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.userId = user.userId;
        next();
    });
}

// -------------------- Authentication Routes --------------------
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const stmt = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
        stmt.run(username, email, hashedPassword);
        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ error: 'Username or email already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    bcrypt.compare(password, user.password_hash, (err, result) => {
        if (err || !result) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, userId: user.id, username: user.username });
    });
});

// -------------------- Transaction Routes --------------------
app.post('/api/transaction', authenticateToken, (req, res) => {
    const { type, amount, category, description } = req.body;
    if (!type || !amount || !category) {
        return res.status(400).json({ error: 'Type, amount, and category are required' });
    }

    const transactionId = generateTransactionId();
    const timestamp = getCurrentTimestamp();

    const stmt = db.prepare(`
        INSERT INTO transactions (id, user_id, type, amount, category, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(transactionId, req.userId, type, amount, category, description, timestamp);

    // Check warning condition: total expense > total income
    const totals = db.prepare(`
        SELECT 
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as totalIncome,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as totalExpense
        FROM transactions WHERE user_id = ?
    `).get(req.userId);

    const warning = totals.totalExpense > totals.totalIncome ? 'Warning: Expenses exceed income' : null;

    res.status(201).json({ 
        message: 'Transaction saved successfully',
        transactionId,
        warning
    });
});

app.get('/api/transactions', authenticateToken, (req, res) => {
    let { day, month, year } = req.query;
    let query = 'SELECT * FROM transactions WHERE user_id = ?';
    const params = [req.userId];

    if (day && month && year) {
        // Filter by specific day
        const dayStr = String(day).padStart(2, '0');
        const monthStr = String(month).padStart(2, '0');
        const datePrefix = `${year}-${monthStr}-${dayStr}`;
        query += ` AND substr(created_at, 1, 10) = ?`;
        params.push(datePrefix);
    } else if (month && year) {
        // Filter by month
        const monthStr = String(month).padStart(2, '0');
        const monthPrefix = `${year}-${monthStr}`;
        query += ` AND substr(created_at, 1, 7) = ?`;
        params.push(monthPrefix);
    } else if (year) {
        // Filter by year
        query += ` AND substr(created_at, 1, 4) = ?`;
        params.push(year);
    }

    query += ' ORDER BY created_at DESC';

    const transactions = db.prepare(query).all(...params);
    res.json(transactions);
});

app.get('/api/analytics', authenticateToken, (req, res) => {
    const { day, month, year } = req.query;
    let params = [req.userId];
    let dateFilter = '';

    if (day && month && year) {
        const dayStr = String(day).padStart(2, '0');
        const monthStr = String(month).padStart(2, '0');
        dateFilter = ` AND substr(created_at, 1, 10) = '${year}-${monthStr}-${dayStr}'`;
    } else if (month && year) {
        const monthStr = String(month).padStart(2, '0');
        dateFilter = ` AND substr(created_at, 1, 7) = '${year}-${monthStr}'`;
    } else if (year) {
        dateFilter = ` AND substr(created_at, 1, 4) = '${year}'`;
    }

    // Totals
    const totals = db.prepare(`
        SELECT 
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpense
        FROM transactions WHERE user_id = ? ${dateFilter}
    `).get(req.userId);

    // Monthly data for charts (last 6 months)
    const monthlyData = db.prepare(`
        SELECT 
            strftime('%Y-%m', created_at) as month,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
        FROM transactions 
        WHERE user_id = ? 
        GROUP BY month
        ORDER BY month DESC
        LIMIT 6
    `).all(req.userId);

    // Category breakdown for pie chart
    const categoryData = db.prepare(`
        SELECT category, SUM(amount) as total
        FROM transactions 
        WHERE user_id = ? AND type = 'expense'
        GROUP BY category
        ORDER BY total DESC
    `).all(req.userId);

    res.json({
        totals: {
            income: totals.totalIncome,
            expense: totals.totalExpense,
            balance: totals.totalIncome - totals.totalExpense
        },
        monthly: monthlyData.reverse(), // send ascending for chart
        categories: categoryData
    });
});

// -------------------- Start Server --------------------
app.listen(PORT, () => {
    console.log(`Finance Tracker Pro running on http://localhost:${PORT}`);
});
