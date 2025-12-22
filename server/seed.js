const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const seed = async () => {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'sirkap_quotations',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to database');

        const password = 'password123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', ['admin@sirkap.com']);

        if (rows.length > 0) {
            console.log('⚠️  Admin user already exists');
        } else {
            await connection.execute(
                'INSERT INTO users (full_name, email, password_hash, user_role) VALUES (?, ?, ?, ?)',
                ['Admin User', 'admin@sirkap.com', hashedPassword, 'admin']
            );
            console.log('🎉 Admin user created successfully');
            console.log('📧 Email: admin@sirkap.com');
            console.log('🔑 Password: password123');
        }

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

seed();
