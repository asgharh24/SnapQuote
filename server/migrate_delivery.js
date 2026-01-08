const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'sirkap_quotations'
    });

    try {
        console.log('Adding delivery charge columns to quotations table...');
        await connection.execute(`
            ALTER TABLE quotations 
            ADD COLUMN is_delivery_applicable TINYINT(1) DEFAULT 0, 
            ADD COLUMN delivery_charges_aed DECIMAL(15,2) DEFAULT 0.00;
        `);
        console.log('✅ Migration successful');
    } catch (error) {
        if (error.code === 'ER_DUP_COLUMN_NAME') {
            console.log('⚠️ Columns already exist, skipping.');
        } else {
            console.error('❌ Migration failed:', error.message);
        }
    } finally {
        await connection.end();
    }
}

migrate();
