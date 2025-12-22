const http = require('http');

http.get('http://localhost:5000/api/products', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        const products = JSON.parse(data);
        if (products.length > 0) {
            console.log('Keys:', Object.keys(products[0]));
            if (products[0].image_url) console.log('image_url:', products[0].image_url);
        }
    });
});
