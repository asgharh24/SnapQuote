const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkSchema() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'sirkap_quotations'
    });

    try {
        const [rows] = await connection.query('DESCRIBE quotation_items');
        console.log('quotation_items:', rows.map(r => r.Field));

        const [rows2] = await connection.query('DESCRIBE products');
        console.log('products:', rows2.map(r => r.Field));
    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
    }
}

checkSchema();
