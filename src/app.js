import express from "express";
import cors from "cors";

import connection from './database/database.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get("/categories", async (req, res) => {
    try {
        const result = await connection.query(`SELECT * FROM categories;`);
        res.send(result.rows);
    }
    catch {
        res.sendStatus(500);
    }
})

app.post("/categories", async (req, res) => {
    const { name } = req.body;
    if(!name) return res.send(400);

    try {
        const duplicate = await connection.query(`SELECT * FROM categories WHERE name=$1;`, [name]);
        if(duplicate.rows.length) return res.sendStatus(409);

        await connection.query(`INSERT INTO categories (name) VALUES ($1);`, [name]);
        res.sendStatus(201);
    }
    catch {
        res.send(500);
    }
})

app.get("/games", async (req, res) => {
    try {
        const result = await connection.query(`
            SELECT
                games.id,
                games.name,
                games.image,
                games."stockTotal",
                games."categoryId",
                games."pricePerDay",
                categories.name
                    AS "categoryName"
            FROM games
            JOIN categories
                ON games."categoryId" = categories.id;
        `);
        res.send(result.rows);
    }
    catch {
        res.sendStatus(500);
    }
})

app.post("/games", async (req, res) => {
    const {
        name,
        image,
        stockTotal,
        categoryId,
        pricePerDay
    } = req.body;
    if(!name || stockTotal <= 0 || pricePerDay <= 0) return res.sendStatus(400);

    try {
        const invalidId = await connection.query(`SELECT * FROM categories WHERE id = $1;`, [categoryId]);
        if(!invalidId.rows.length) return res.sendStatus(400);

        const duplicate = await connection.query(`SELECT * FROM games WHERE name = $1`, [name]);
        if(duplicate.rows.length) return res.sendStatus(409);

        await connection.query(`
            INSERT INTO games (
                name,
                image,
                "stockTotal",
                "categoryId",
                "pricePerDay"
            )
            VALUES ($1, $2, $3, $4, $5);
        `, [name, image, stockTotal, categoryId, pricePerDay]);
        res.sendStatus(201);
    }
    catch {
        res.sendStatus(500);
    }
})

app.get("/customers", async (req, res) => {
    try {
        const result = await connection.query(`SELECT * FROM customers;`);
        res.send(result.rows);
    }
    catch {
        res.sendStatus(500);
    }
})

app.get("/customers/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await connection.query(`SELECT * FROM customers WHERE id = $1;`, [id]);
        if(result.rows.length) return res.send(result.rows[0]);
        res.sendStatus(404);
    }
    catch {
        res.sendStatus(500)
    }
})

app.post("/customers", async (req, res) => {
    const {
        name,
        phone,
        cpf,
        birthday
    } = req.body;
    if(cpf.length !== 11 || !Number(cpf) || phone.length > 11 || phone.length < 10 || !Number(phone) || !name || !Date.parse(birthday) || birthday.length !== 10) return res.sendStatus(400);

    try {
        const duplicate = await connection.query(`SELECT * FROM customers WHERE cpf = $1;`, [cpf]);
        if(duplicate.rows.length) return res.sendStatus(409);

        await connection.query(`
            INSERT INTO customers (
                name,
                phone,
                cpf,
                birthday
            ) VALUES ($1, $2, $3, $4);
        `, [name, phone, cpf, birthday]);
        res.sendStatus(201);
    }
    catch {
        res.sendStatus(500);
    }
})

app.listen(4000, () => {
  console.log('Server is listening on port 4000.');
});
