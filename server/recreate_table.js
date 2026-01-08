const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function cleanAndRecreate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'sirkap_quotations',
    });

    try {
        console.log('Dropping and recreating quotation_items table...');
        await connection.execute('DROP TABLE IF EXISTS quotation_items');

        await connection.execute(`
            CREATE TABLE quotation_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                quote_id INT NOT NULL,
                product_id INT NULL,
                item_name VARCHAR(255),
                description_override TEXT,
                origin_snapshot VARCHAR(100),
                unit_of_measure VARCHAR(50),
                quantity DECIMAL(15, 2) NOT NULL,
                original_unit_price DECIMAL(15, 2) NOT NULL,
                discounted_unit_price DECIMAL(15, 2) NOT NULL,
                cost_price_snapshot DECIMAL(15, 2) DEFAULT 0,
                row_total DECIMAL(15, 2) NOT NULL,
                image_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (quote_id) REFERENCES quotations(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Table recreated successfully.');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

cleanAndRecreate();
