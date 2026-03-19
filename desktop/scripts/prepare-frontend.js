const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "dist");
const publicDir = path.join(__dirname, "..", "public");
const isProd = process.env.NODE_ENV === "production";
const appUrl =
  process.env.AIR_APP_URL ||
  (isProd ? "https://your-air-app.vercel.app" : "http://localhost:3000");

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.copyFileSync(
  path.join(publicDir, "index.html"),
  path.join(distDir, "index.html")
);
const configJs = `window.AIR_APP_URL = ${JSON.stringify(appUrl)};\n`;
fs.writeFileSync(path.join(distDir, "config.js"), configJs);

console.log("Desktop frontend prepared. AIR_APP_URL =", appUrl);
