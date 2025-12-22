const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

class PDFService {
    constructor(pool) {
        this.pool = pool;
        this.templatePath = path.join(__dirname, '../templates/quote.hbs');
        this.registerHelpers();
    }

    registerHelpers() {
        handlebars.registerHelper('formatCurrency', (value) => {
            if (value === undefined || value === null) return '0';
            return Number(value).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
        });

        handlebars.registerHelper('formatDate', (date) => {
            if (!date) return '';
            const d = new Date(date);
            return d.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        });

        handlebars.registerHelper('showStrikeThrough', (original, discounted) => {
            return Number(original) > Number(discounted);
        });
    }

    async generateQuotePDF(quoteId) {
        let browser;
        try {
            // 1. Fetch Quote Data
            const query = `
                SELECT q.*, c.company_name, c.contact_person, c.vat_number, c.address
                FROM quotations q
                JOIN clients c ON q.client_id = c.id
                WHERE q.id = ?
            `;
            const [quoteRows] = await this.pool.query(query, [quoteId]);
            if (quoteRows.length === 0) throw new Error('Quote not found');
            const quote = quoteRows[0];

            // 2. Fetch Items (Explicitly excluding snapshots for privacy)
            const [items] = await this.pool.query(
                'SELECT item_name, description_override, unit_of_measure, quantity, original_unit_price, discounted_unit_price, row_total, image_url FROM quotation_items WHERE quote_id = ? ORDER BY id ASC',
                [quoteId]
            );

            // 3. Prepare Template Data
            const logoPath = path.resolve(__dirname, '../uploads/logo.png');
            let logoBase64 = '';
            try {
                const logoBuffer = await fs.readFile(logoPath);
                logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
                console.log(`✅ PDF Logo loaded: ${logoPath} (${logoBuffer.length} bytes)`);
            } catch (err) {
                console.error(`❌ PDF Logo NOT found at: ${logoPath}`);
            }

            const templateData = {
                ...quote,
                items,
                logoBase64,
                isDraft: quote.status === 'Draft',
                generated_at: new Date()
            };

            // 4. Render HTML
            const templateHtml = await fs.readFile(this.templatePath, 'utf8');
            const template = handlebars.compile(templateHtml);
            const html = template(templateData);

            // 5. Generate PDF with Puppeteer
            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();

            // Set content and wait for images to load
            await page.setContent(html, { waitUntil: 'networkidle0' });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    bottom: '20px',
                    left: '20px',
                    right: '20px'
                }
            });

            return {
                buffer: pdfBuffer,
                filename: `Sirkap_Quote_${quote.quote_number}_v${quote.version_number}.pdf`
            };

        } catch (error) {
            console.error('PDF Generation Error:', error);
            throw error;
        } finally {
            if (browser) await browser.close();
        }
    }
}

module.exports = PDFService;
