import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, '..', 'dist');
const port = parseInt(process.env.PORT) || 5000;

if (!fs.existsSync(distPath)) {
  console.error('dist/ folder not found. Run: npx expo export --platform web');
  process.exit(1);
}

const app = express();

app.use(
  express.static(distPath, {
    maxAge: '0',
    etag: false,
  })
);

app.use((_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const server = app.listen(port, '0.0.0.0');

server.on('listening', () => {
  console.log(`Web app serving on http://0.0.0.0:${port}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${port} already in use (webview workflow running). Keeping process alive.`);
    setInterval(() => {}, 60000);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});
