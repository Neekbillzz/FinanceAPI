require('dotenv').config();

const express = require('express');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3021

console.log(PORT)

app.listen(PORT, () => {
    console.log(`Api is listening on port ${PORT}`)
})