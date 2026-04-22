const express = require("express");
const cors = require("cors");
const config = require("./config/config");
const initDb = require("./initDb");

initDb();

const cardRoutes = require("./routes/cardRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use("/cards", cardRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Card Collector API работает" });
});

app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

const PORT = config.port;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`Available routes:`);
  console.log(`  GET    /cards`);
  console.log(`  POST   /cards`);
  console.log(`  GET    /`);
});
