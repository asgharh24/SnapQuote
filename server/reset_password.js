const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const resetPassword = async () => {
    const email = process.argv[2];
    const newPassword = process.argv[3];

    if (!email || !newPassword) {
        console.log('❌ Usage: node reset_password.js <email> <new_password>');
        process.exit(1);
    }

    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'sirkap_quotations',
        waitForConnections: true,
        connectionLimit: 1,
        queueLimit: 0
    });

    try {
        const connection = await pool.getConnection();
        console.log(`🔍 Searching for user: ${email}...`);

        const [users] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            console.log('⚠️  User not found');
            connection.release();
            process.exit(1);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await connection.execute(
            'UPDATE users SET password_hash = ? WHERE email = ?',
            [hashedPassword, email]
        );

        console.log(`✅ Password for ${email} has been reset successfully!`);
        
        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error resetting password:', error.message);
        process.exit(1);
    }
};

resetPassword();
