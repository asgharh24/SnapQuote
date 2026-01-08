const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkData() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'sirkap_quotations'
    });

    try {
        const [rows] = await connection.query('SELECT item_name, image_url FROM products');
        fs.writeFileSync('db_data_check.txt', JSON.stringify(rows, null, 2));
    } catch (e) {
        fs.writeFileSync('db_data_check.txt', 'ERROR: ' + e.message);
    } finally {
        await connection.end();
        process.exit(0);
    }
}

checkData();
