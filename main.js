require('dotenv').config();
const express = require('express');
const cors = require('cors');
const redisClient = require('./redis/redisClient');


const app = express();
app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
  res.send("Hello from Express");
});

const imageRoutes = require('./routes/imagesRoutes');
const userRoutes = require('./routes/usersRoutes');

app.use('/', imageRoutes);
app.use('/', userRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});