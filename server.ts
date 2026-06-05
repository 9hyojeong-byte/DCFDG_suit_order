import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON body parser
  app.use(express.json());

  // In-memory array to store mock submissions for demonstration if no GAS URL is connected yet
  const mockSubmissions: any[] = [];

  // API submit route
  app.post("/api/submit", async (req: express.Request, res: express.Response) => {
    try {
      const { googleScriptUrl, ...orderData } = req.body;
      
      // 구글 앱스크립트 웹앱 주소 기입란 (예: "https://script.google.com/macros/s/AKfycb.../exec")
      // 배포된 웹앱 주소를 아래 큰따옴표 안에 하드코딩해서 바로 넣으실 수 있습니다.
      const HARDCODED_GOOGLE_SCRIPT_URL = "";

      const targetUrl = googleScriptUrl || HARDCODED_GOOGLE_SCRIPT_URL || process.env.GOOGLE_SCRIPT_URL;

      // Current timestamp
      const now = new Date();
      const localTimestamp = new Date(now.getTime() + (9 * 60 * 60 * 1000))
        .toISOString()
        .replace("T", " ")
        .substring(0, 19);

      if (!targetUrl) {
        // If no GAS URL is set, perform a local mock submission so the app remains fully testable!
        const mockRow = {
          status: "success",
          simulated: true,
          message: "테스트 모드로 주문이 신청되었습니다. (구글 시트 연동 전)",
          timestamp: localTimestamp,
          data: orderData,
        };
        mockSubmissions.unshift(mockRow);
        
        // Return simulated success
        return res.json({
          status: "success",
          simulated: true,
          message: "구글 시트 연동 전 시뮬레이션 성공! (설정에서 스프레드시트 URL을 연동하시면 실시간 저장됩니다.)",
          row: mockSubmissions.length + 1,
          timestamp: localTimestamp,
          data: orderData
        });
      }

      console.log(`Forwarding order data to Apps Script: ${targetUrl}`);

      // Forward to Google Apps Script
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error(`Google Apps Script returned status code ${response.status}`);
      }

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        // In case response is text
        responseData = { status: "success", message: responseText };
      }

      console.log("Success response from Apps Script:", responseData);
      return res.json({
        ...responseData,
        simulated: false,
        timestamp: localTimestamp
      });

    } catch (error: any) {
      console.error("Error submitting order to Google Sheets:", error);
      return res.status(500).json({
        status: "error",
        message: `구글 시트 전송 중 오류 발생: ${error.message || error}`
      });
    }
  });

  // Get mock history route
  app.get("/api/mock-submissions", (req, res) => {
    res.json(mockSubmissions);
  });

  // Clear mock history
  app.post("/api/mock-submissions/clear", (req, res) => {
    mockSubmissions.length = 0;
    res.json({ status: "success", message: "시뮬레이션 기록이 초기화되었습니다." });
  });

  // Serve static files / Vite dev server middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // For single page applications (SPA)
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server", err);
});
