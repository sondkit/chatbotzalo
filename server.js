// --- Import các thư viện ---
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs");
const path = require("path"); // Thêm thư viện 'path'
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// --- Khởi tạo ứng dụng ---
const app = express();

// --- Cấu hình Middleware ---
// Middleware để xử lý JSON body
app.use(bodyParser.json());

// Middleware để phục vụ các file tĩnh từ thư mục 'public'
// Phải đặt trước các route API
app.use(express.static(path.join(__dirname, 'public')));

// --- Lấy các thông tin bí mật từ Biến Môi trường ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ZALO_OA_ACCESS_TOKEN = process.env.ZALO_OA_ACCESS_TOKEN;

// --- Khởi tạo mô hình Gemini ---
if (!GEMINI_API_KEY) {
  console.error("LỖI: Biến môi trường GEMINI_API_KEY chưa được thiết lập!");
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- Nạp "Sổ tay kiến thức" ---
let knowledgeBase = "";
try {
  // Sửa đường dẫn để tìm đúng file ở thư mục gốc
  knowledgeBase = fs.readFileSync(path.join(__dirname, 'data.txt'), "utf8");
  console.log("Đã nạp thành công sổ tay kiến thức.");
} catch (err) {
  console.error("LỖI: Không đọc được file data.txt:", err);
  knowledgeBase = "Lỗi: Không có dữ liệu kiến thức.";
}

// --- Route API cho Zalo Webhook ---
app.post("/zalo", async (req, res) => {
  const event = req.body;
  console.log("Đã nhận sự kiện từ Zalo:", JSON.stringify(event, null, 2));

  if (event.event_name === "user_send_text") {
    const senderId = event.sender.id;
    const messageText = event.message.text;
    console.log(`Nhận được tin nhắn từ user ${senderId}: "${messageText}"`);

    const prompt = `Bạn là một trợ lý ảo chuyên về thủ tục hành chính...`; // (Giữ nguyên prompt của bạn)

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const geminiReply = response.text();
      console.log("Câu trả lời từ Gemini:", geminiReply);
      await sendZaloMessage(senderId, geminiReply);
    } catch (error) {
      console.error("Lỗi khi gọi Gemini API:", error);
      await sendZaloMessage(senderId, "Xin lỗi, hệ thống đang gặp sự cố...");
    }
  }
  res.sendStatus(200);
});

// Route để Zalo xác thực webhook
app.get("/zalo", (req, res) => {
  console.log("Zalo đang xác thực webhook...");
  res.send("Webhook đã sẵn sàng!");
});

// Hàm gửi tin nhắn (Giữ nguyên hàm của bạn)
async function sendZaloMessage(recipientId, text) {
    //...
}

// --- Khởi động máy chủ ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Chatbot của bạn đang lắng nghe tại port ${PORT}`);
});
