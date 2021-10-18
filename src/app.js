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
            ) VALUES ($1, $2, $3, $4, $5);
        `, [name, image, stockTotal, categoryId, pricePerDay]);
        res.sendStatus(201);
    }
    catch {
        res.sendStatus(500);
    }
})

app.get("/customers", async (req, res) => {
    const cpf = req.query.cpf;
    let result;
    
    try {
        if(cpf) result = await connection.query(`SELECT * FROM customers WHERE cpf LIKE $1;`, [cpf + "%"]);
        else result = await connection.query(`SELECT * FROM customers;`);
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

app.put("/customers/:id", async (req, res) => {
    const id = req.params.id;
    const {
        name,
        phone,
        cpf,
    } = req.body;
    const birthday = req.body.birthday.split("T")[0];

    if(cpf.length !== 11 || !Number(cpf) || phone.length > 11 || phone.length < 10 || !Number(phone) || !name || !Date.parse(birthday) || birthday.length !== 10) return res.sendStatus(400);

    try {
        const duplicate = await connection.query(`SELECT * FROM customers WHERE cpf = $1;`, [cpf]);
        if(duplicate.rows.length > 1) return res.sendStatus(409);
        
        await connection.query(`
            UPDATE customers
            SET
                name = $1,
                phone = $2,
                cpf = $3,
                birthday = $4
            WHERE id = $5;
        `, [name, phone, cpf, birthday, id]);
        res.sendStatus(201);
    }
    catch {
        res.sendStatus(500);
    }
})

app.get("/rentals", async (req, res) => {
    try {
        const result = await connection.query(`
            SELECT
                rentals.*,
                jsonb_build_object(
                    'id', customers.id,
                    'name', customers.name
                ) AS customer,
                jsonb_build_object(
                    'id', games.id,
                    'name', games.name,
                    'categoryId', games."categoryId",
                    'categoryName', categories.name
                ) AS game
            FROM rentals
            JOIN customers
                ON rentals."customerId" = customers.id
            JOIN games
                ON rentals."gameId" = games.id
            JOIN categories
                ON games."categoryId" = categories.id;
        `);
        res.send(result.rows);
    }
    catch {
        res.sendStatus(500);
    }
})

app.post("/rentals", async (req, res) => {
    const {
        customerId,
        gameId,
        daysRented
    } = req.body;
    const rentDate = new Date().toISOString().split("T")[0];
    const returnDate = null;
    const delayFee = null;

    try {
        const client = await connection.query(`SELECT * FROM customers WHERE id = $1;`, [customerId]);
        const game = await connection.query(`SELECT * FROM games WHERE id = $1;`, [gameId]);
        const rentals = await connection.query(`SELECT * FROM rentals WHERE ("gameId" = $1 AND "returnDate" IS NULL);`, [gameId]);
        if(!client.rows.length || !game.rows.length || daysRented <= 0 || rentals.rows.length >= game.rows[0].stockTotal) return res.sendStatus(400);

        const dailyPrice = await connection.query(`SELECT* FROM games WHERE id = $1;`, [gameId]);
        const originalPrice = dailyPrice.rows[0].pricePerDay * daysRented;

        await connection.query(`
            INSERT INTO rentals (
                "customerId",
                "gameId",
                "rentDate",
                "daysRented",
                "returnDate",
                "originalPrice",
                "delayFee"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7);
        `, [customerId, gameId, rentDate, daysRented, returnDate, originalPrice, delayFee]);
        res.send(200);
    }
    catch {
        res.sendStatus(500);
    }
})

app.post("/rentals/:id/return", async (req, res) => {
    const id = req.params.id;
    const returnDate = new Date().toISOString().split("T")[0];
    let delayFee = 0;

    try {
        const rental = await connection.query(`SELECT * FROM rentals WHERE (id = $1 AND "returnDate" IS NULL);`, [id]);
        if(!rental.rows.length) return res.sendStatus(404);
        const game = await connection.query(`SELECT * FROM games WHERE id = $1;`, [rental.rows[0].gameId]);
        if(new Date(returnDate).getTime < new Date()) {
            delayFee = (new Date(returnDate).getTime() - new Date().getTime())/(1000*60*60*24) * game.rows[0].pricePerDay;
        }

        await connection.query(`
            UPDATE rentals
            SET
                "returnDate" = $1,
                "delayFee" = $2
            WHERE id = $3;
        `, [returnDate, delayFee, id]);
        res.sendStatus(200);
    }
    catch {
        res.sendStatus(500);
    }
})

app.listen(4000, () => {
  console.log('Server is listening on port 4000.');
});
