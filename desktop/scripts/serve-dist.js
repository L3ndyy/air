const { spawn } = require("child_process");
const path = require("path");

const distDir = path.join(__dirname, "..", "dist");
const child = spawn("npx", ["serve", distDir, "-p", "1421"], {
  stdio: "ignore",
  detached: true,
  cwd: path.join(__dirname, ".."),
});
child.unref();
