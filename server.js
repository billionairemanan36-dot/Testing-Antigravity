const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite database
const db = new sqlite3.Database(':memory:', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite in-memory database.');
        
        db.serialize(() => {
            // Create Inventory Table
            db.run(`CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                quantity TEXT NOT NULL,
                category TEXT,
                expiry_date TEXT
            )`);

            // Create Recipes Table
            db.run(`CREATE TABLE IF NOT EXISTS recipes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                ingredients TEXT NOT NULL,
                image_url TEXT
            )`, () => {
                // Seed recipes
                const stmt = db.prepare("INSERT INTO recipes (title, description, ingredients, image_url) VALUES (?, ?, ?, ?)");
                stmt.run("Tomato Basil Pasta", "A simple and delicious pasta dish.", "Pasta, Tomatoes, Basil, Garlic, Olive Oil", "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=400&q=80");
                stmt.run("Chicken Stir-Fry", "Quick and healthy weeknight dinner.", "Chicken Breast, Broccoli, Soy Sauce, Rice, Garlic", "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=400&q=80");
                stmt.run("Avocado Toast", "A perfect breakfast or snack.", "Bread, Avocado, Salt, Pepper, Lemon Juice", "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?auto=format&fit=crop&w=400&q=80");
                stmt.run("Fruit Smoothie", "Refreshing blend of fruits.", "Banana, Berries, Milk, Honey", "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=400&q=80");
                stmt.finalize();
            });

            // Seed some initial inventory
            db.run(`INSERT INTO inventory (name, quantity, category, expiry_date) VALUES 
                ('Tomatoes', '5 pcs', 'Produce', '2023-12-01'),
                ('Pasta', '1 box', 'Pantry', '2024-05-01'),
                ('Garlic', '2 bulbs', 'Produce', '2023-11-20')
            `);
        });
    }
});

// --- API ROUTES ---

// Get all inventory
app.get('/api/inventory', (req, res) => {
    db.all("SELECT * FROM inventory", [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// Add inventory item
app.post('/api/inventory', (req, res) => {
    const { name, quantity, category, expiry_date } = req.body;
    db.run(`INSERT INTO inventory (name, quantity, category, expiry_date) VALUES (?, ?, ?, ?)`,
        [name, quantity, category, expiry_date],
        function (err) {
            if (err) {
                res.status(400).json({ "error": err.message });
                return;
            }
            res.json({
                "message": "success",
                "data": { id: this.lastID, name, quantity, category, expiry_date }
            });
        });
});

// Delete inventory item
app.delete('/api/inventory/:id', (req, res) => {
    db.run(
        'DELETE FROM inventory WHERE id = ?',
        req.params.id,
        function (err) {
            if (err) {
                res.status(400).json({ "error": res.message });
                return;
            }
            res.json({ "message": "deleted", changes: this.changes });
        });
});

// Get recipes (optionally match with inventory)
app.get('/api/recipes', (req, res) => {
    db.all("SELECT * FROM recipes", [], (err, recipes) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        
        // Basic naive matching: if any inventory item is in the recipe ingredients
        db.all("SELECT name FROM inventory", [], (err, inventoryRows) => {
            if (err) {
                 res.json({ "message": "success", "data": recipes });
                 return;
            }
            
            const inventoryNames = inventoryRows.map(row => row.name.toLowerCase());
            
            recipes.forEach(recipe => {
                let matchCount = 0;
                const ingredientsLower = recipe.ingredients.toLowerCase();
                inventoryNames.forEach(item => {
                    if (ingredientsLower.includes(item)) {
                        matchCount++;
                    }
                });
                recipe.matchScore = matchCount;
            });
            
            // Sort by match score descending
            recipes.sort((a, b) => b.matchScore - a.matchScore);
            
            res.json({
                "message": "success",
                "data": recipes
            });
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
