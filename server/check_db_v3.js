const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const fs = require('fs');
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
        const qFields = rows.map(r => r.Field);

        const [rows2] = await connection.query('DESCRIBE products');
        const pFields = rows2.map(r => r.Field);

        fs.writeFileSync('db_schema_check.txt',
            `QUOTATION_ITEMS: ${qFields.join(', ')}\nPRODUCTS: ${pFields.join(', ')}`
        );
    } catch (e) {
        fs.writeFileSync('db_schema_check.txt', 'ERROR: ' + e.message);
    } finally {
        await connection.end();
        process.exit(0);
    }
}

checkSchema();
