-- 1. Setup Database
CREATE DATABASE IF NOT EXISTS sirkap_quotations;
USE sirkap_quotations;

-- 2. Users Table
-- Handles Role-Based Access Control (RBAC)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_role ENUM('admin', 'sales') DEFAULT 'sales',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Clients Table
-- Basic CRM for customer and project tracking
CREATE TABLE clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255),
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(50),
    address TEXT,
    vat_number VARCHAR(50), -- TRN for UAE VAT compliance
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Products Table
-- The Master Catalog for Sales to pull from
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(100) NULL, -- Optional for custom items
    origin VARCHAR(100),   -- Visible to all, but excluded from PDF
    product_description TEXT NOT NULL,
    unit ENUM('SQM', 'Running Meter', 'Unit', 'Job') DEFAULT 'SQM',
    base_price DECIMAL(15, 2) NOT NULL, -- Public "Original Price"
    cost_price DECIMAL(15, 2) NOT NULL, -- Admin-only Visibility
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Terms and Conditions Profiles
CREATE TABLE terms_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profile_name VARCHAR(50) NOT NULL, 
    content TEXT NOT NULL
);

-- 6. Quotations Table (The Header)
-- Manages the lifecycle and versioning of the quote
CREATE TABLE quotations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_quote_id INT NULL, -- Links to previous version (v1 -> v2)
    quote_number VARCHAR(50) NOT NULL, 
    version_number INT DEFAULT 1,
    client_id INT NOT NULL,
    project_name VARCHAR(255),
    date_issued DATE NOT NULL,
    status ENUM('Draft', 'Sent', 'Approved', 'Rejected', 'Revised') DEFAULT 'Draft',
    is_vat_applicable TINYINT(1) DEFAULT 1,
    is_delivery_applicable TINYINT(1) DEFAULT 0,
    delivery_charges_aed DECIMAL(15, 2) DEFAULT 0.00,
    terms_id INT,
    terms_content TEXT,
    created_by INT NOT NULL,
    subtotal_aed DECIMAL(15, 2) DEFAULT 0.00,
    vat_amount_aed DECIMAL(15, 2) DEFAULT 0.00,
    grand_total_aed DECIMAL(15, 2) DEFAULT 0.00,
    
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (terms_id) REFERENCES terms_profiles(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (parent_quote_id) REFERENCES quotations(id) ON DELETE SET NULL,
    CONSTRAINT unique_quote_version UNIQUE (quote_number, version_number)
);

-- 7. Quotation Items Table (The Rows)
-- Stores snapshots of data; handles both Catalog and Bespoke items
CREATE TABLE quotation_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quote_id INT NOT NULL,
    product_id INT NULL, -- NULL indicates an Admin-created Bespoke Item
    item_name VARCHAR(255),
    description_override TEXT, -- Holds custom furniture/vanity names
    origin_snapshot VARCHAR(100),
    unit_of_measure VARCHAR(20),
    quantity DECIMAL(15, 2) NOT NULL,
    
    -- Price/Cost Logic
    original_unit_price DECIMAL(15, 2), -- Fetched from 'base_price'
    discounted_unit_price DECIMAL(15, 2), -- The negotiated selling price
    cost_price_snapshot DECIMAL(15, 2), -- Internal cost at time of quote
    
    row_total DECIMAL(15, 2), 
    image_url VARCHAR(255), -- Support for manual slab/furniture photos
    
    FOREIGN KEY (quote_id) REFERENCES quotations(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
