const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database');
const bcrypt = require('bcrypt');  //password hashing/authentication

const app = express();
app.use(bodyParser.json()); // Parse JSON request bodies

// Test endpoint
app.get('/', (req, res) => {
    res.send('Welcome to the E-Commerce API!');
});

// User Registration
// Get all users
app.get('/users', (req, res) => {
    const query = `SELECT id, name, email FROM users`; // Exclude passwords for security
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: "Failed to fetch users.", details: err.message });
        } else {
            res.status(200).json(rows);
        }
    });
});

app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    //basic validation for empty fields
    if (!name || !email || !password) {
        return res.status(400).json({ error: "All input fields are required." });
    }

    try{
        //hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`;
        db.run(query, [name, email, hashedPassword], function (err) {
            if (err) {
                res.status(500).json({ error: "Failed to register user.", details: err.message });
            } else {
                res.status(200).json({ message: "User registered successfully!", userId: this.lastID });
            }
        });
    }catch (error){
        res.status(500).json({ error: "Internal server error.", details: error.message });
    }
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
        return res.status(400).json({ error: "All fields are required." });
    }
    //look up users by email
    const query = `SELECT * FROM users WHERE email = ?`;
    db.get(query, [email], async (err, user) => {
        if (err) {
            res.status(500).json({ error: "Failed to log in. Database error", details: err.message });
        } else if (!user) {
            res.status(404).json({ error: "User not found." });
        } else {
            try {
                // Compare the entered password with the hashed password
                const isMatch = await bcrypt.compare(password, user.password);
                if (isMatch) {
                    res.status(200).json({ message: "Login successful!", user: { id: user.id, name: user.name, email: user.email } });
                } else {
                    res.status(401).json({ error: "Invalid password." });
                }
            } catch (error) {
                res.status(500).json({ error: "Internal server error.", details: error.message });
            }
        }
    });
});

//product related endpoints

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

// Get a single product by ID
app.get('/products/:id', (req, res) => {
    const { id } = req.params;
    const query = `SELECT * FROM products WHERE id = ?`;
    db.get(query, [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: "Failed to fetch product.", details: err.message });
        } else if (!row) {
            res.status(404).json({ error: "Product not found." });
        } else {
            res.status(200).json(row);
        }
    });
});

// Create a New Product
app.post('/products', (req, res) => {
    const { name, description, price, stock } = req.body;

    //input validation
    if(!name || price < 0 || stock < 0){
        return res.status(400).json({ error: "Invalid product data. Price & stock must be non-negative." });
    }

    const query = `INSERT INTO products (name, description, price, stock) VALUES (?, ?, ?, ?)`;
    db.run(query, [name, description, price, stock], function (err) {
        if (err) {
            res.status(500).json({ error: "Failed to create product.", details: err.message });
        } else {
            res.status(200).json({ message: "Product created successfully!", productId: this.lastID });
        }
    });
});

// Update a product
app.put('/products/:id', (req, res) => {
    const { id } = req.params;
    const { name, description, price, stock } = req.body;
    const query = `
        UPDATE products 
        SET name = ?, description = ?, price = ?, stock = ?
        WHERE id = ?
    `;
    db.run(query, [name, description, price, stock, id], function (err) {
        if (err) {
            res.status(500).json({ error: "Failed to update product.", details: err.message });
        } else if (this.changes === 0) {
            res.status(404).json({ error: "Product not found." });
        } else {
            res.status(200).json({ message: "Product updated successfully!" });
        }
    });
});

// Delete a product
app.delete('/products/:id', (req, res) => {
    const { id } = req.params;
    const query = `DELETE FROM products WHERE id = ?`;
    db.run(query, [id], function (err) {
        if (err) {
            res.status(500).json({ error: "Failed to delete product.", details: err.message });
        } else if (this.changes === 0) {
            res.status(404).json({ error: "Product not found." });
        } else {
            res.status(200).json({ message: "Product deleted successfully!" });
        }
    });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});