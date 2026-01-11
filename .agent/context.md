# SnapQuote Project Context

## Overview

SnapQuote is a quote building tool designed for a stone and marble company. It allows sales staff to create professional quotations, manage clients, and maintain a product catalog.

## Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Lucide React.
- **Backend**: Node.js, Express, MySQL (mysql2/promise).
- **Database**: MySQL 8.0 running in Docker.
- **Hosting**: Linux server with Nginx as a reverse proxy.
- **CI/CD**: GitHub Actions deploying to Staging (`staging.sirkap.ae`) and Live (`snapquote.sirkap.ae`) environments.
- **Process Management**: PM2 on the production server.

## Database Schema Highlights

- `users`: RBAC (Admin/Sales).
- `clients`: Customer details and project tracking.
- `products`: Master catalog with SKU, origin, and pricing.
- `quotations`: Version-controlled quotes with status tracking (Draft, Sent, Approved, etc.).
- `quotation_items`: Snapshots of items at the time of quote generation.

## Key Features Implemented

- **CSV Import**: Bulk product upload via CSV.
- **PDF Generation**: Professional PDF quotes for clients.
- **Revision System**: Versioning of quotations.
- **Terminal Fix**: Specific `.bashrc` early-return logic for agent toolchain access.

## Dev Environment Setup

- **Database**: `docker compose up -d db` (Port 3307 locally).
- **Backend**: `cd server && npm install && node index.js`.
- **Frontend**: `cd client && npm install && npm run dev`.
- **Reset Admin**: `node server/reset_password.js admin@sirkap.com password123`.
