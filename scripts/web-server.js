import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, '..', 'dist');
const port = 8080;

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

app.listen(port, '0.0.0.0', () => {
  console.log(`Web app serving on http://0.0.0.0:${port}`);
});
