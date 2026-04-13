require('dotenv').config();
const path = require("path");
const express = require("express");
const app = express();
const db = require("./db");

app.use(express.static("frontend"));
app.use(express.json());

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// ===================== AUTH =====================

app.post("/register", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send("Username and password are required");
    }

    const sql = "INSERT INTO users (username, password) VALUES (?, ?)";

    db.query(sql, [username, password], (error) => {
        if (error) return res.status(500).send("Error");
        res.send("Registered");
    });
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send("Username and password are required");
    }

    const sql = "SELECT * FROM users WHERE username = ? AND password = ?";

    db.query(sql, [username, password], (error, results) => {
        if (error) return res.status(500).send("Error");

        if (results.length === 0) {
            return res.send("Invalid credentials");
        }

        res.json(results[0]);
    });
});

// ===================== CATEGORY =====================

app.get("/categories", (req, res) => {
    const userId = req.query.user_id;

    if (!userId) {
        return res.json([]);
    }

    db.query(
        "SELECT * FROM categories WHERE user_id = ? ORDER BY name ASC",
        [userId],
        (error, results) => {
            if (error) return res.status(500).send(error);
            res.json(results);
        }
    );
});

app.post("/add-category", (req, res) => {
    const { name, user_id } = req.body;

    if (!name || !user_id) {
        return res.status(400).send("Category name and user are required");
    }

    const sql = "INSERT INTO categories (name, user_id) VALUES (?, ?)";

    db.query(sql, [name.trim(), user_id], (error, result) => {
        if (error) return res.status(500).send(error);

        res.json({
            message: "Category added",
            id: result.insertId,
            name: name.trim(),
        });
    });
});

// ===================== EXPENSE =====================

app.post("/add-expense", (req, res) => {
    const {
        amount,
        category_id,
        description,
        date,
        payment_method,
        user_id,
    } = req.body;

    if (!user_id) {
        return res.status(400).send("Missing user");
    }

    if (!amount || Number(amount) <= 0) {
        return res.status(400).send("Invalid amount");
    }

    if (!date) {
        return res.status(400).send("Date is required");
    }

    // FIX FOR ISSUE #3: Verify category exists before inserting
    db.query("SELECT id FROM categories WHERE id = ? AND user_id = ?", [category_id, user_id], (catErr, catRes) => {
        if (catErr) return res.status(500).send("Database error");
        if (catRes.length === 0) return res.status(400).send("Invalid category selection");

        const safePaymentMethod = payment_method === "online" ? "online" : "cash";

        const sql = `
            INSERT INTO expenses
                (amount, category_id, description, date, payment_method, user_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(
            sql,
            [
                amount,
                category_id,
                description || "",
                date,
                safePaymentMethod,
                user_id,
            ],
            (error) => {
                if (error) return res.status(500).send(error);
                res.send("Expense added");
            }
        );
    });
});

app.get("/expenses", (req, res) => {
    const userId = req.query.user_id;

    if (!userId) {
        return res.json([]);
    }

    let sql = `
        SELECT
            expenses.*,
            COALESCE(categories.name, 'Uncategorized') AS category_name
        FROM expenses
        LEFT JOIN categories ON expenses.category_id = categories.id
        WHERE expenses.user_id = ?
    `;

    let values = [userId];
    const { category, start, end, sort } = req.query;

    if (category) {
        sql += " AND COALESCE(categories.name, 'Uncategorized') LIKE ?";
        values.push(`%${category}%`);
    }

    if (start && end) {
        sql += " AND expenses.date BETWEEN ? AND ?";
        values.push(start, end);
    }

    if (sort === "amount_asc") {
        sql += " ORDER BY expenses.amount ASC";
    } else if (sort === "amount_desc") {
        sql += " ORDER BY expenses.amount DESC";
    } else if (sort === "date") {
        sql += " ORDER BY expenses.date DESC";
    } else {
        sql += " ORDER BY expenses.date DESC, expenses.id DESC";
    }

    db.query(sql, values, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error fetching expenses");
        }
        res.json(results);
    });
});

app.put("/update-expense/:id", (req, res) => {
    const id = req.params.id;
    const { amount, category_id, description, date, payment_method } = req.body;

    if (!amount || Number(amount) <= 0) {
        return res.status(400).send("Invalid amount");
    }

    if (!category_id) {
        return res.status(400).send("Invalid category");
    }

    const safePaymentMethod = payment_method === "online" ? "online" : "cash";

    const sql = `
        UPDATE expenses
        SET amount = ?, category_id = ?, description = ?, date = ?, payment_method = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [amount, category_id, description || "", date, safePaymentMethod, id],
        (error) => {
            if (error) {
                console.log(error);
                return res.status(500).send("Error updating");
            }
            res.send("Updated");
        }
    );
});

app.delete("/delete-expense/:id", (req, res) => {
    const id = req.params.id;

    db.query("DELETE FROM expenses WHERE id = ?", [id], (error) => {
        if (error) return res.status(500).send("Error deleting");
        res.send("Deleted");
    });
});


app.get("/summary", (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
        return res.json({ total: 0, byCategory: [] });
    }

    const categoryQuery = `
        SELECT
            COALESCE(categories.name, 'Uncategorized') AS category_name,
            SUM(expenses.amount) AS total
        FROM expenses
        LEFT JOIN categories ON expenses.category_id = categories.id
        WHERE expenses.user_id = ?
        GROUP BY COALESCE(categories.name, 'Uncategorized')
        ORDER BY total DESC
    `;

    db.query(categoryQuery, [user_id], (error, categoryResult) => {
        if (error) return res.status(500).send(error);

        const grandTotal = categoryResult.reduce((sum, row) => sum + parseFloat(row.total), 0);

        res.json({
            total: grandTotal,
            byCategory: categoryResult,
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});