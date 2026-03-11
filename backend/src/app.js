const express = require("express");
const cors = require("cors");
require("dotenv").config();

const cardRoutes = require("./routes/cardRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/cards", cardRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Card Collector API работает" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});