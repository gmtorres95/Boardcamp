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

app.listen(4000, () => {
  console.log('Server is listening on port 4000.');
});
