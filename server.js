const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database');

const app = express();
app.use(bodyParser.json()); // Parse JSON request bodies

// Test endpoint
app.get('/', (req, res) => {
    res.send('Welcome to the E-Commerce API!');
});

// User Registration
app.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    const query = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`;
    db.run(query, [name, email, password], function (err) {
        if (err) {
            res.status(500).json({ error: "Failed to register user.", details: err.message });
        } else {
            res.status(200).json({ message: "User registered successfully!", userId: this.lastID });
        }
    });
});

// Get All Products
app.get('/products', (req, res) => {
    db.all(`SELECT * FROM products`, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: "Failed to fetch products.", details: err.message });
        } else {
            res.status(200).json(rows);
        }
    });
});

// Create a New Product
app.post('/products', (req, res) => {
    const { name, description, price, stock } = req.body;
    const query = `INSERT INTO products (name, description, price, stock) VALUES (?, ?, ?, ?)`;
    db.run(query, [name, description, price, stock], function (err) {
        if (err) {
            res.status(500).json({ error: "Failed to create product.", details: err.message });
        } else {
            res.status(200).json({ message: "Product created successfully!", productId: this.lastID });
        }
    });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});