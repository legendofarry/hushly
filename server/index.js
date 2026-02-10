const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 5050;

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(
  cors(
    allowedOrigins.length > 0
      ? {
          origin: allowedOrigins,
          credentials: true,
        }
      : undefined,
  ),
);
app.use(express.json({ limit: "1mb" }));

const MURF_API_KEY = process.env.MURF_API_KEY;
const MURF_BASE_URL = process.env.MURF_BASE_URL || "https://api.murf.ai";
const DEFAULT_VOICE_ID = process.env.MURF_VOICE_ID || "en-UK-hazel";
const DEFAULT_MODEL_VERSION = process.env.MURF_MODEL_VERSION || "GEN2";
const DEFAULT_FORMAT = process.env.MURF_AUDIO_FORMAT || "MP3";
const DEFAULT_CHANNEL = process.env.MURF_CHANNEL_TYPE || "MONO";
const DEFAULT_RATE = Number(process.env.MURF_RATE || -8);
const DEFAULT_PITCH = Number(process.env.MURF_PITCH || 2);
const DEFAULT_LOCALE = process.env.MURF_MULTI_NATIVE_LOCALE || "en-UK";

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/tts", async (req, res) => {
  try {
    if (!MURF_API_KEY) {
      res.status(500).json({ error: "MURF_API_KEY not configured." });
      return;
    }

    const text = typeof req.body?.text === "string" ? req.body.text : "";
    const cleanText = text.replace(/\s+/g, " ").trim();
    if (!cleanText) {
      res.status(400).json({ error: "Text is required." });
      return;
    }

    const payload = {
      text: cleanText.slice(0, 1000),
      voiceId: req.body?.voiceId || DEFAULT_VOICE_ID,
      format: req.body?.format || DEFAULT_FORMAT,
      channelType: req.body?.channelType || DEFAULT_CHANNEL,
      modelVersion: req.body?.modelVersion || DEFAULT_MODEL_VERSION,
      multiNativeLocale: req.body?.multiNativeLocale || DEFAULT_LOCALE,
      rate:
        typeof req.body?.rate === "number" ? req.body.rate : DEFAULT_RATE,
      pitch:
        typeof req.body?.pitch === "number" ? req.body.pitch : DEFAULT_PITCH,
    };

    const response = await fetch(`${MURF_BASE_URL}/v1/speech/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": MURF_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      res.status(response.status).json({
        error: data?.message || data?.error || "Murf request failed.",
        details: data,
      });
      return;
    }

    res.json({
      audioUrl: data?.audioFile,
      audioLengthInSeconds: data?.audioLengthInSeconds,
      remainingCharacterCount: data?.remainingCharacterCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "TTS generation failed." });
  }
});

app.listen(port, () => {
  console.log(`Murf TTS server running on port ${port}`);
});
