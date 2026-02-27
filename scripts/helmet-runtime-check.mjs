import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const helmetPackagePath = path.join(projectRoot, 'node_modules', 'react-helmet-async', 'package.json');

const runtime = fs.existsSync(helmetPackagePath) ? 'official' : 'shim';
console.log(runtime);
