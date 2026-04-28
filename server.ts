import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import ImageKit from "imagekit";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  const imagekit = new ImageKit({
    publicKey: process.env.VITE_IMAGEKIT_PUBLIC_KEY || "public_z105SGDbqJHY6O2e/RIw7viRVpo=",
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "private_ydf8z/Qzldlr2llv2fq8g3G2DxQ=",
    urlEndpoint: process.env.VITE_IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/bruna" // Default placeholder
  });

  app.use(express.json());

  // ImageKit Authentication Endpoint
  app.get("/api/image-auth", (req, res) => {
    const authParams = imagekit.getAuthenticationParameters();
    res.json(authParams);
  });

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
