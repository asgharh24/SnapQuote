const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const fs = require('fs');
const PDFService = require('./services/PDFService');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(uploadDir));

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// File Upload Route
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    res.json({ imageUrl });
});

// Database Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'sirkap_quotations',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const pdfService = new PDFService(pool);

// Test DB Connection
pool.getConnection()
    .then(connection => {
        console.log('✅ Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
        console.log('⚠️  Please ensure MySQL is running and the schema is imported.');
    });

// Routes Placeholder
app.get('/', (req, res) => {
    res.send('Sirkap Quote Tool API is running');
});

// Auth Route
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.user_role },
            process.env.JWT_SECRET || 'dev_secret',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.full_name,
                email: user.email,
                role: user.user_role
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Product Routes
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching products' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Product not found' });
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching product' });
    }
});

app.post('/api/products', async (req, res) => {
    const { item_name, origin, product_description, unit, base_price, cost_price, image_url } = req.body;

    // Sanitize rich text description
    const sanitizedDescription = sanitizeHtml(product_description || '', {
        allowedTags: ['b', 'i', 'em', 'strong', 'ul', 'ol', 'li', 'p', 'br', 'u', 'span'],
        allowedAttributes: {
            '*': ['class', 'style']
        },
        allowedStyles: {
            '*': {
                'text-decoration': [/underline/],
                'text-align': [/left/, /right/, /center/, /justify/]
            }
        }
    });

    try {
        const [result] = await pool.execute(
            'INSERT INTO products (item_name, origin, product_description, unit, base_price, cost_price, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [item_name, origin, sanitizedDescription, unit, base_price, cost_price, image_url || null]
        );
        res.status(201).json({ id: result.insertId, message: 'Product created' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating product' });
    }
});

app.put('/api/products/:id', async (req, res) => {
    const { item_name, origin, product_description, unit, base_price, cost_price, image_url } = req.body;

    // Sanitize rich text description
    const sanitizedDescription = sanitizeHtml(product_description || '', {
        allowedTags: ['b', 'i', 'em', 'strong', 'ul', 'ol', 'li', 'p', 'br', 'u', 'span'],
        allowedAttributes: {
            '*': ['class', 'style']
        },
        allowedStyles: {
            '*': {
                'text-decoration': [/underline/],
                'text-align': [/left/, /right/, /center/, /justify/]
            }
        }
    });

    try {
        await pool.execute(
            'UPDATE products SET item_name=?, origin=?, product_description=?, unit=?, base_price=?, cost_price=?, image_url=? WHERE id=?',
            [item_name, origin, sanitizedDescription, unit, base_price, cost_price, image_url || null, req.params.id]
        );
        res.json({ message: 'Product updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating product' });
    }
});

// --- Users API ---

app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, full_name, email, user_role, created_at FROM users ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

app.get('/api/users/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, full_name, email, user_role FROM users WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching user' });
    }
});

app.post('/api/users', async (req, res) => {
    const { full_name, email, password, user_role } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await pool.execute(
            'INSERT INTO users (full_name, email, password_hash, user_role) VALUES (?, ?, ?, ?)',
            [full_name, email, hashedPassword, user_role]
        );
        res.status(201).json({ id: result.insertId, message: 'User created' });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Email already exists' });
        }
        res.status(500).json({ message: 'Error creating user' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { full_name, email, password, user_role } = req.body;
    try {
        let query = 'UPDATE users SET full_name = ?, email = ?, user_role = ?';
        let params = [full_name, email, user_role];

        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            query += ', password_hash = ?';
            params.push(hashedPassword);
        }

        query += ' WHERE id = ?';
        params.push(req.params.id);

        await pool.execute(query, params);
        res.json({ message: 'User updated' });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Email already exists' });
        }
        res.status(500).json({ message: 'Error updating user' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: 'User deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting user' });
    }
});

// --- Clients API ---

app.get('/api/clients', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM clients ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching clients' });
    }
});

app.get('/api/clients/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM clients WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Client not found' });
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching client' });
    }
});

app.post('/api/clients', async (req, res) => {
    const { company_name, contact_person, email, phone, address, vat_number } = req.body;
    try {
        const [result] = await pool.execute(
            'INSERT INTO clients (company_name, contact_person, email, phone, address, vat_number) VALUES (?, ?, ?, ?, ?, ?)',
            [company_name, contact_person, email, phone, address, vat_number]
        );
        res.status(201).json({ id: result.insertId, message: 'Client created' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating client' });
    }
});

// --- Terms Profiles API ---

app.get('/api/terms-profiles', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM terms_profiles ORDER BY profile_name ASC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching terms profiles' });
    }
});

app.post('/api/terms-profiles', async (req, res) => {
    const { profile_name, content } = req.body;
    try {
        const [result] = await pool.execute(
            'INSERT INTO terms_profiles (profile_name, content) VALUES (?, ?)',
            [profile_name, content]
        );
        res.status(201).json({ id: result.insertId, message: 'Terms profile created' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating terms profile' });
    }
});

app.put('/api/terms-profiles/:id', async (req, res) => {
    const { profile_name, content } = req.body;
    try {
        await pool.execute(
            'UPDATE terms_profiles SET profile_name = ?, content = ? WHERE id = ?',
            [profile_name, content, req.params.id]
        );
        res.json({ message: 'Terms profile updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating terms profile' });
    }
});

app.delete('/api/terms-profiles/:id', async (req, res) => {
    try {
        await pool.execute('DELETE FROM terms_profiles WHERE id = ?', [req.params.id]);
        res.json({ message: 'Terms profile deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting terms profile' });
    }
});

app.put('/api/clients/:id', async (req, res) => {
    const { company_name, contact_person, email, phone, address, vat_number } = req.body;
    try {
        await pool.execute(
            'UPDATE clients SET company_name=?, contact_person=?, email=?, phone=?, address=?, vat_number=? WHERE id=?',
            [company_name, contact_person, email, phone, address, vat_number, req.params.id]
        );
        res.json({ message: 'Client updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating client' });
    }
});

const { z } = require('zod');

// Quotation Validation Schema
const quotationItemSchema = z.object({
    product_id: z.number().nullable(),
    item_name: z.string().optional(),
    description_override: z.string(),
    origin_snapshot: z.string().nullable(),
    unit_of_measure: z.string(),
    quantity: z.number().min(0.01),
    original_unit_price: z.number().min(0),
    discounted_unit_price: z.number().min(0),
    cost_price_snapshot: z.number().min(0).optional(),
    row_total: z.number().min(0),
    image_url: z.string().nullable().optional()
});

const quotationSchema = z.object({
    parent_quote_id: z.number().nullable().optional(),
    quote_number: z.string(),
    version_number: z.number().int().min(1),
    client_id: z.number().int(),
    project_name: z.string().optional().nullable(),
    date_issued: z.string(),
    status: z.enum(['Draft', 'Sent', 'Approved', 'Rejected', 'Revised']),
    is_vat_applicable: z.boolean(),
    is_delivery_applicable: z.boolean().optional().default(false),
    delivery_charges_aed: z.number().min(0).optional().default(0),
    terms_id: z.number().optional().nullable(),
    terms_content: z.string().optional().nullable(),
    created_by: z.number().int(),
    subtotal_aed: z.number(),
    vat_amount_aed: z.number(),
    grand_total_aed: z.number(),
    items: z.array(quotationItemSchema)
});

// --- Dashboard API ---
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const { user_id, user_role } = req.query;
        let whereClause = '';
        const params = [];

        // If sales user, they might only see their own stats for some metrics
        // but for high level dashboard, usually company overview is better.
        // Let's implement global for now, but allow filtering if needed.

        // 1. Basic Metrics
        const [metricsRows] = await pool.query(`
            SELECT 
                COUNT(*) as total_quotes,
                SUM(CASE WHEN status IN ('Sent', 'Revised', 'Approved') THEN grand_total_aed ELSE 0 END) as pipeline_value,
                SUM(CASE WHEN status = 'Approved' THEN grand_total_aed ELSE 0 END) as revenue_value,
                COUNT(CASE WHEN status NOT IN ('Approved', 'Rejected') THEN 1 END) as active_count,
                COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved_count,
                COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected_count
            FROM quotations
        `);

        const [clientRows] = await pool.query('SELECT COUNT(*) as client_count FROM clients');

        const metrics = metricsRows[0];
        const totalClosed = metrics.approved_count + metrics.rejected_count;
        const conversionRate = totalClosed > 0 ? (metrics.approved_count / totalClosed) * 100 : 0;

        // 2. Revenue Pipeline (Last 6 Months)
        const [pipelineRows] = await pool.query(`
            SELECT 
                DATE_FORMAT(date_issued, '%b') as month,
                SUM(grand_total_aed) as amount,
                DATE_FORMAT(date_issued, '%Y-%m') as month_key
            FROM quotations
            WHERE date_issued >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY month_key, month
            ORDER BY month_key ASC
        `);

        // 3. Recent Quotes
        const [recentRows] = await pool.query(`
            SELECT q.id, q.quote_number, q.status, q.grand_total_aed, c.company_name, c.contact_person
            FROM quotations q
            JOIN clients c ON q.client_id = c.id
            ORDER BY q.id DESC
            LIMIT 5
        `);

        res.json({
            stats: {
                pipeline: metrics.pipeline_value || 0,
                revenue: metrics.revenue_value || 0,
                activeQuotes: metrics.active_count,
                conversionRate: Math.round(conversionRate),
                totalClients: clientRows[0].client_count
            },
            pipelineData: pipelineRows,
            recentQuotes: recentRows
        });
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
});

// --- Quotations API ---

app.get('/api/quotes', async (req, res) => {
    try {
        const query = `
            SELECT q.*, c.company_name, c.contact_person, u.full_name as creator_name
            FROM quotations q
            JOIN clients c ON q.client_id = c.id
            JOIN users u ON q.created_by = u.id
            ORDER BY q.date_issued DESC, q.id DESC
        `;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching quotes' });
    }
});

app.get('/api/quotes/next-number', async (req, res) => {
    try {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const prefix = `SQ-${year}${month}-`;

        const [rows] = await pool.query(
            "SELECT quote_number FROM quotations WHERE quote_number LIKE ? ORDER BY quote_number DESC LIMIT 1",
            [`${prefix}%`]
        );

        let nextSeq = 1;
        if (rows.length > 0) {
            const lastNum = rows[0].quote_number;
            const lastSeq = parseInt(lastNum.split('-').pop());
            nextSeq = lastSeq + 1;
        }

        const nextNumber = `${prefix}${nextSeq.toString().padStart(3, '0')}`;
        res.json({ nextNumber });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error generating next quote number' });
    }
});

app.get('/api/quotes/:id', async (req, res) => {
    try {
        const [quoteRows] = await pool.query('SELECT * FROM quotations WHERE id = ?', [req.params.id]);
        if (quoteRows.length === 0) return res.status(404).json({ message: 'Quote not found' });

        const [itemRows] = await pool.query('SELECT * FROM quotation_items WHERE quote_id = ? ORDER BY id ASC', [req.params.id]);

        // Check if a revision already exists for this quote
        const [revisionRows] = await pool.query('SELECT id FROM quotations WHERE parent_quote_id = ? LIMIT 1', [req.params.id]);

        const quote = quoteRows[0];
        quote.items = itemRows;
        quote.has_revision = revisionRows.length > 0;

        res.json(quote);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching quote details' });
    }
});

app.post('/api/quotes', async (req, res) => {

    const valet = quotationSchema.safeParse(req.body);

    if (!valet.success) {
        console.error('Validation failed:', valet.error.errors);
        return res.status(400).json({ message: 'Validation failed', errors: valet.error.errors });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const data = valet.data;
        const [qResult] = await connection.execute(
            `INSERT INTO quotations 
            (parent_quote_id, quote_number, version_number, client_id, project_name, date_issued, status, is_vat_applicable, is_delivery_applicable, delivery_charges_aed, terms_id, terms_content, created_by, subtotal_aed, vat_amount_aed, grand_total_aed) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.parent_quote_id || null,
                data.quote_number,
                data.version_number,
                data.client_id,
                data.project_name,
                data.date_issued,
                data.status,
                data.is_vat_applicable ? 1 : 0,
                data.is_delivery_applicable ? 1 : 0,
                data.delivery_charges_aed,
                data.terms_id || null,
                data.terms_content || '',
                data.created_by,
                data.subtotal_aed,
                data.vat_amount_aed,
                data.grand_total_aed
            ]
        );

        const quoteId = qResult.insertId;

        for (const item of data.items) {

            const sanitizedDescription = sanitizeHtml(item.description_override || '', {
                allowedTags: ['b', 'i', 'em', 'strong', 'ul', 'ol', 'li', 'p', 'br', 'u', 'span'],
                allowedAttributes: {
                    '*': ['class', 'style']
                },
                allowedStyles: {
                    '*': {
                        'text-decoration': [/underline/],
                        'text-align': [/left/, /right/, /center/, /justify/]
                    }
                }
            });
            await connection.execute(
                `INSERT INTO quotation_items 
                (quote_id, product_id, item_name, description_override, origin_snapshot, unit_of_measure, quantity, original_unit_price, discounted_unit_price, cost_price_snapshot, row_total, image_url) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    quoteId,
                    item.product_id || null,
                    item.item_name || '',
                    sanitizedDescription,
                    item.origin_snapshot || null,
                    item.unit_of_measure,
                    item.quantity,
                    item.original_unit_price,
                    item.discounted_unit_price,
                    item.cost_price_snapshot || 0,
                    item.row_total,
                    item.image_url || null
                ]
            );
        }

        await connection.commit();
        res.status(201).json({ id: quoteId, message: 'Quotation created successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('DB Error creating quote:', error);
        // Handle missing column gracefully for first-time run
        if (error.code === 'ER_BAD_FIELD_ERROR' && error.sqlMessage.includes('item_name')) {
            return res.status(500).json({ message: 'Database schema mismatch. Please run migrations or add item_name to quotation_items.' });
        }
        res.status(500).json({ message: 'Error creating quotation: ' + error.message });
    } finally {
        connection.release();
    }
});

app.put('/api/quotes/:id', async (req, res) => {

    const valet = quotationSchema.safeParse(req.body);

    if (!valet.success) {
        console.error('Validation failed:', valet.error.errors);
        return res.status(400).json({ message: 'Validation failed', errors: valet.error.errors });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const data = valet.data;
        await connection.execute(
            `UPDATE quotations SET 
            client_id=?, project_name=?, date_issued=?, status=?, is_vat_applicable=?, is_delivery_applicable=?, delivery_charges_aed=?, terms_id=?, terms_content=?, subtotal_aed=?, vat_amount_aed=?, grand_total_aed=? 
            WHERE id=?`,
            [
                data.client_id,
                data.project_name,
                data.date_issued,
                data.status,
                data.is_vat_applicable ? 1 : 0,
                data.is_delivery_applicable ? 1 : 0,
                data.delivery_charges_aed,
                data.terms_id || null,
                data.terms_content || '',
                data.subtotal_aed,
                data.vat_amount_aed,
                data.grand_total_aed,
                req.params.id
            ]
        );

        // Simple approach: Delete old items and insert new ones to maintain order and snapshot purity
        await connection.execute('DELETE FROM quotation_items WHERE quote_id = ?', [req.params.id]);

        for (const item of data.items) {
            const sanitizedDescription = sanitizeHtml(item.description_override || '', {
                allowedTags: ['b', 'i', 'em', 'strong', 'ul', 'ol', 'li', 'p', 'br', 'u', 'span'],
                allowedAttributes: {
                    '*': ['class', 'style']
                },
                allowedStyles: {
                    '*': {
                        'text-decoration': [/underline/],
                        'text-align': [/left/, /right/, /center/, /justify/]
                    }
                }
            });
            await connection.execute(
                `INSERT INTO quotation_items 
                (quote_id, product_id, item_name, description_override, origin_snapshot, unit_of_measure, quantity, original_unit_price, discounted_unit_price, cost_price_snapshot, row_total, image_url) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    req.params.id,
                    item.product_id || null,
                    item.item_name || '',
                    sanitizedDescription,
                    item.origin_snapshot || null,
                    item.unit_of_measure,
                    item.quantity,
                    item.original_unit_price,
                    item.discounted_unit_price,
                    item.cost_price_snapshot || 0,
                    item.row_total,
                    item.image_url || null
                ]
            );
        }

        await connection.commit();
        res.json({ message: 'Quotation updated successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('DB Error updating quote:', error);
        res.status(500).json({ message: 'Error updating quotation: ' + error.message });
    } finally {
        connection.release();
    }
});

app.patch('/api/quotes/:id/status', async (req, res) => {
    const { status, user_id, user_role } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status update' });
    }

    try {
        // Fetch quote to check ownership if not admin
        const [rows] = await pool.query('SELECT created_by FROM quotations WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Quote not found' });

        if (user_role !== 'admin' && rows[0].created_by !== user_id) {
            return res.status(403).json({ message: 'Unauthorized to update this quote' });
        }

        await pool.query('UPDATE quotations SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ message: `Quote ${status.toLowerCase()} successfully` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating status' });
    }
});

app.post('/api/quotes/:id/revise', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Fetch current quote
        const [quoteRows] = await connection.query('SELECT * FROM quotations WHERE id = ?', [req.params.id]);
        if (quoteRows.length === 0) return res.status(404).json({ message: 'Quote not found' });
        const current = quoteRows[0];

        // 2. Insert new revision record
        const [qResult] = await connection.execute(
            `INSERT INTO quotations 
            (parent_quote_id, quote_number, version_number, client_id, project_name, date_issued, status, is_vat_applicable, is_delivery_applicable, delivery_charges_aed, terms_id, terms_content, created_by, subtotal_aed, vat_amount_aed, grand_total_aed) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                current.id,
                current.quote_number,
                current.version_number + 1,
                current.client_id,
                current.project_name,
                new Date(), // New date for version
                'Draft',    // Always start as draft
                current.is_vat_applicable,
                current.is_delivery_applicable,
                current.delivery_charges_aed,
                current.terms_id,
                current.terms_content,
                req.body.user_id || current.created_by,
                current.subtotal_aed,
                current.vat_amount_aed,
                current.grand_total_aed
            ]
        );

        const newQuoteId = qResult.insertId;

        // 3. Clone line items
        const [items] = await connection.query('SELECT * FROM quotation_items WHERE quote_id = ?', [req.params.id]);
        for (const item of items) {
            await connection.execute(
                `INSERT INTO quotation_items 
                (quote_id, product_id, item_name, description_override, origin_snapshot, unit_of_measure, quantity, original_unit_price, discounted_unit_price, cost_price_snapshot, row_total, image_url) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    newQuoteId,
                    item.product_id,
                    item.item_name,
                    item.description_override,
                    item.origin_snapshot,
                    item.unit_of_measure,
                    item.quantity,
                    item.original_unit_price,
                    item.discounted_unit_price,
                    item.cost_price_snapshot,
                    item.row_total,
                    item.image_url
                ]
            );
        }

        await connection.commit();
        res.status(201).json({ id: newQuoteId, message: 'Revision created successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error revising quote:', error);
        res.status(500).json({ message: 'Error revising quotation: ' + error.message });
    } finally {
        connection.release();
    }
});

app.get('/api/quotes/:id/download', async (req, res) => {
    try {
        const { buffer, filename } = await pdfService.generateQuotePDF(req.params.id);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(buffer);
    } catch (error) {
        console.error('Download Error:', error);
        res.status(500).json({ message: 'Failed to generate PDF: ' + error.message });
    }
});


// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

module.exports = { app, pool };
