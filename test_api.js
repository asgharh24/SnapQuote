const fetch = require('node-fetch');

async function test() {
    try {
        const res = await fetch('http://localhost:5000/api/products');
        const data = await res.json();
        console.log('Product 0:', data[0]);
    } catch (e) {
        console.error(e);
    }
}

test();
