// --- Import các thư viện ---
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// --- Khởi tạo ứng dụng ---
const app = express();
app.use(bodyParser.json());

// --- Lấy các thông tin bí mật từ Biến Môi trường ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ZALO_OA_ACCESS_TOKEN = process.env.ZALO_OA_ACCESS_TOKEN;

// --- Khởi tạo mô hình Gemini ---
// Thêm kiểm tra để chắc chắn API Key có tồn tại
if (!GEMINI_API_KEY) {
  console.error("LỖI: Biến môi trường GEMINI_API_KEY chưa được thiết lập!");
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- Nạp "Sổ tay kiến thức" ---
// Chỉnh sửa để đọc file trong môi trường Render
let knowledgeBase = "";
try {
  knowledgeBase = fs.readFileSync("./data.txt", "utf8");
  console.log("Đã nạp thành công sổ tay kiến thức.");
} catch (err) {
  console.error("LỖI: Không đọc được file data.txt:", err);
  knowledgeBase = "Lỗi: Không có dữ liệu kiến thức.";
}

// --- Route chính để Zalo gọi đến (Webhook) ---
app.post("/zalo", async (req, res) => {
  const event = req.body;
  console.log("Đã nhận sự kiện từ Zalo:", JSON.stringify(event, null, 2));

  if (event.event_name === "user_send_text") {
    const senderId = event.sender.id;
    const messageText = event.message.text;
    console.log(`Nhận được tin nhắn từ user ${senderId}: "${messageText}"`);

    const prompt = `Bạn là một trợ lý ảo chuyên về thủ tục hành chính. Nhiệm vụ của bạn là trả lời câu hỏi của người dân CHỈ DỰA VÀO thông tin được cung cấp trong phần "DỮ LIỆU" dưới đây. QUY TẮC BẮT BUỘC: 1. Chỉ sử dụng thông tin trong phần "DỮ LIỆU". Tuyệt đối không tự ý suy diễn hoặc dùng kiến thức bên ngoài. 2. Nếu câu hỏi không có thông tin trong "DỮ LIỆU", hãy trả lời là: "Xin lỗi, tôi chưa có thông tin về vấn đề này. Anh/chị vui lòng liên hệ trực tiếp cán bộ có chuyên môn để được tư vấn chính xác nhất." 3. Trả lời ngắn gọn, đi thẳng vào vấn đề, sử dụng ngôn ngữ dễ hiểu. --- DỮ LIỆU --- ${knowledgeBase} --- KẾT THÚC DỮ LIỆU --- Câu hỏi của người dân: "${messageText}"`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const geminiReply = response.text();
      console.log("Câu trả lời từ Gemini:", geminiReply);
      await sendZaloMessage(senderId, geminiReply);
    } catch (error) {
      console.error("Lỗi khi gọi Gemini API:", error);
      await sendZaloMessage(senderId, "Xin lỗi, hệ thống đang gặp sự cố. Vui lòng thử lại sau.");
    }
  }
  res.sendStatus(200);
});

// Hàm gửi tin nhắn qua Zalo OA API
async function sendZaloMessage(recipientId, text) {
  if (!ZALO_OA_ACCESS_TOKEN) {
    console.error("LỖI: ZALO_OA_ACCESS_TOKEN chưa được thiết lập!");
    return;
  }
  const url = "https://openapi.zalo.me/v2.0/oa/message";
  const data = { recipient: { user_id: recipientId }, message: { text: text } };
  try {
    await axios.post(url, data, { headers: { "access_token": ZALO_OA_ACCESS_TOKEN, "Content-Type": "application/json" } });
    console.log(`Đã gửi tin nhắn thành công đến user ${recipientId}`);
  } catch (error) {
    console.error("Lỗi khi gửi tin nhắn Zalo:", error.response ? error.response.data : error.message);
  }
}

// Route để Zalo xác thực webhook
app.get("/zalo", (req, res) => {
  console.log("Zalo đang xác thực webhook...");
  res.send("Webhook đã sẵn sàng!");
});

// --- Khởi động máy chủ ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Chatbot của bạn đang lắng nghe tại port ${PORT}`);
});
