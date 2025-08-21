
// Demo index.js cho chatbot Zalo + Gemini
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("Chatbot Zalo + Gemini đang chạy!");
});

app.listen(PORT, () => {
  console.log("Server chạy tại cổng " + PORT);
});
