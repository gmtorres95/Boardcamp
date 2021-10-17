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
    if(!name) res.send(400);

    try {
        const duplicate = await connection.query(`SELECT * FROM categories WHERE name=$1;`, [name]);
        if(duplicate.rows.length) return res.sendStatus(409);

        const result = await connection.query(`INSERT INTO categories (name) VALUES ($1);`, [name]);
        res.sendStatus(201);
    }
    catch {
        res.send(500);
    }
})

app.listen(4000, () => {
  console.log('Server is listening on port 4000.');
});
