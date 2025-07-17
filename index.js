const express = require("express");
const dotenv = require("dotenv");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3007;
app.use(express.json());

// Inisialisasi client dengan API Key dari environment
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Pilih model Gemini
const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });

const upload = multer({ dest: "uploads/" });

app.post("/generate-from-text", async (req, res) => {
  const { prompt } = req.body;
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const output = await response.text();

    // 🔹 Log success response untuk monitoring
    console.log("[/generate-from-text] Prompt:", prompt);
    console.log("[/generate-from-text] Output:", output);

    res.json({ output });
  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({ error: "Failed to generate content" });
  }
});

app.post("/generate-from-image", upload.single("image"), async (req, res) => {
  const prompt = req.body.prompt || "Describe the image";

  try {
    const image = imageToGenerativePart(req.file.path, req.file.mimetype);

    const result = await model.generateContent([prompt, image]);
    const response = await result.response;
    const output = await response.text();

    console.log("[/generate-from-image] Prompt:", prompt);
    console.log("[/generate-from-image] Output:", output);

    res.json({ output });
  } catch (error) {
    console.error("Error generating content from image:", error);
    res.status(500).json({ error: "Failed to generate content from image" });
  } finally {
    fs.unlink(req.file.path, (err) => {
      if (err) {
        console.error("Error deleting uploaded file:", err);
      }
    });
  }
});

app.post("/generate-from-document", upload.single("document"), async (req, res) => {
  const filePath = req.file.path;
  const Buffer = fs.readFileSync(filePath);
  const base64Data = Buffer.toString("base64");
  const mimeType = req.file.mimetype;

try {
  const documentPart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType,
    },
  };

  const result = await model.generateContent(["Analyze this document:", documentPart]);
  const response = await result.response;
  const output = await response.text();

  console.log("[/generate-from-document] Output:", output);
  res.json({ output });
} catch (error) {
  console.error("Error generating content from document:", error);
  res.status(500).json({ error: "Failed to generate content from document" });
} finally {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("Error deleting uploaded file:", err);
    }
  });
}});

const imageToGenerativePart = (filePath, mimeType) => {
  const imageData = fs.readFileSync(filePath);

  const supportedTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!supportedTypes.includes(mimeType)) {
    throw new Error(`Unsupported image mime type: ${mimeType}`);
  }

  return {
    inlineData: {
      data: Buffer.from(imageData).toString("base64"),
      mimeType,
    },
  };
};


app.listen(PORT, () => {
  console.log(`Gemini API Server is running on http://localhost:${PORT}`);
});
