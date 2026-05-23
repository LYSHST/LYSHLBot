import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

console.log('LYSHLbot Build Script');
console.log('=====================\n');

const frontendSrc = path.join(rootDir, 'frontend');
const frontendDist = path.join(frontendSrc, 'dist');

if (!fs.existsSync(frontendDist)) {
    console.error('Frontend dist not found!');
    process.exit(1);
}

console.log('✓ Frontend build ready');

const requiredDirs = [
    'backend/node/src',
    'config',
    'logs',
    'plugins'
];

requiredDirs.forEach(dir => {
    const fullPath = path.join(rootDir, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`✓ Created: ${dir}`);
    }
});

console.log('\n✓ Build completed successfully');
