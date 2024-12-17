const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database');
const path = require('path');
const bcrypt = require('bcrypt');  //password hashing/authentication
const session = require('express-session');

const app = express();
app.use(bodyParser.json()); // Parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'your_secret_key',  // Replace with a strong secret key
    resave: false,              // Prevents unnecessary session saving
    saveUninitialized: true,    // Saves sessions even if uninitialized
    cookie: { maxAge: 3600000 } // Session expires after 1 hour
}));

// Middleware to check if the user is logged in
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next(); // Proceed to the next middleware or route handler
    } else {
        res.status(401).send("Unauthorized: Please log in to access this page.");
    }
}

// Test endpoint
app.get('/', (req, res) => {
    res.send('Welcome to the E-Commerce API!');
});

app.get('/registration', (req, res) => {
    // Serve the registration.html file from the 'public' folder
    res.sendFile(path.join(__dirname, 'public', 'registration.html'));
});

app.get('/checkout', isAuthenticated, (req, res) => {
    // Serve the registration.html file from the 'public' folder
    res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});

app.get('/faq', (req, res) => {
    // Serve the registration.html file from the 'public' folder
    res.sendFile(path.join(__dirname, 'public', 'faq.html'));
});

app.get('/login', (req, res) => {
    // Serve the registration.html file from the 'public' folder
    res.sendFile(path.join(__dirname, 'public', 'log_in.html'));
});

app.get('/productpage', isAuthenticated, (req, res) => {
    // Serve the registration.html file from the 'public' folder
    res.sendFile(path.join(__dirname, 'public', 'productpage.html'));
});

app.get('/settings', isAuthenticated, (req, res) => {
    // Serve the registration.html file from the 'public' folder
    res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});
app.get('/home', isAuthenticated, (req, res) => {
    // Serve the registration.html file from the 'public' folder
    res.sendFile(path.join(__dirname, 'public', 'store_home.html'));
});

// User Registration
// Get all users
app.get('/users', (req, res) => {
    const query = `SELECT id, first_name, last_name, email FROM users`; // Exclude passwords for security
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: "Failed to fetch users.", details: err.message });
        } else {
            res.status(200).json(rows);
        }
    });
});

app.post('/register', async (req, res) => {
    const { first_name, last_name, email, password } = req.body;

    // Basic validation for empty fields
    if (!first_name || !last_name || !email || !password) {
        return res.status(400).json({ error: "All input fields are required." });
    }

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Correct SQL query with 4 placeholders
        const query = `INSERT INTO users (first_name, last_name, email, password) VALUES (?, ?, ?, ?)`;
        db.run(query, [first_name, last_name, email, hashedPassword], function (err) {
            if (err) {
                res.status(500).json({ error: "Failed to register user.", details: err.message });
            } else {
                res.status(200).json({ message: "User registered successfully!", userId: this.lastID });
            }
        });
    } catch (error) {
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
                    // Create a session for the logged-in user
                    req.session.userId = user.id;
                    req.session.userName = `${user.first_name} ${user.last_name}`;
                    req.session.email = user.email;

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

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: "Failed to log out." });
        }
        res.clearCookie('connect.sid'); // Clears session cookie
        res.status(200).json({ message: "Logged out successfully!" });
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