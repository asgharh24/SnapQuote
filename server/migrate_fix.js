const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function checkAndMigrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'sirkap_quotations',
    });

    try {
        console.log('Checking columns for quotation_items...');
        const [columns] = await connection.execute('SHOW COLUMNS FROM quotation_items');
        const hasItemName = columns.some(col => col.Field === 'item_name');

        if (!hasItemName) {
            console.log('Adding item_name column...');
            await connection.execute('ALTER TABLE quotation_items ADD COLUMN item_name VARCHAR(255) AFTER product_id');
            console.log('✅ Column added successfully.');
        } else {
            console.log('ℹ️ Column item_name already exists.');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

checkAndMigrate();
