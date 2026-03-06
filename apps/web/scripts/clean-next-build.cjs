const fs = require('fs');
const path = require('path');

const nextDir = path.join(__dirname, '..', '.next');

try {
  fs.rmSync(nextDir, { recursive: true, force: true });
} catch (error) {
  console.error('No se pudo limpiar .next antes del build.', error);
  process.exit(1);
}
