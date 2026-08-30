import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, '.portfolio-dist');

// Keep the public artifact intentionally small. The repository also contains
// application source trees, generated app bundles, and unverified research
// captures; none of those are part of the static portfolio publish boundary.
const rootFiles = [
  'index.html',
  'about.html',
  'certificate-pipeline.html',
  'tms.html',
  'registration.html',
  'recruitment.html',
  '.nojekyll',
];

const assetFiles = [
  'assets/favicon.svg',
  'assets/fonts/sora-latin-ext-wght-normal.woff2',
  'assets/fonts/OFL.txt',
  'assets/visuals/signal-system.svg',
  'assets/visuals/registration-system.svg',
  'assets/visuals/certstudio-system.svg',
  'assets/visuals/tms-system.svg',
  'assets/visuals/recruitment-system.svg',
  'assets/css/about.css',
  'assets/css/base.css',
  'assets/css/case-study.css',
  'assets/css/certificate-pipeline-flow-demo.css',
  'assets/css/certificate-pipeline-mocks.css',
  'assets/css/home.css',
  'assets/css/proof.css',
  'assets/css/registration-mocks.css',
  'assets/css/tms.css',
  'assets/js/flow-demo.js',
  'assets/js/reveal.js',
  'assets/js/theme.js',
  'assets/proof/certstudio-walkthrough.html',
  'assets/proof/registration-walkthrough.html',
  'assets/proof/tms-walkthrough.html',
  'assets/proof/recruitment-walkthrough.html',
];

async function assertFilesExist(files) {
  for (const relative of files) {
    const absolute = path.join(root, relative);
    try {
      const info = await stat(absolute);
      if (!info.isFile()) throw new Error('not a file');
    } catch (error) {
      throw new Error(`Required publish file is missing: ${relative} (${error.message})`);
    }
  }
}

async function copyFiles(files) {
  for (const relative of files) {
    const source = path.join(root, relative);
    const destination = path.join(output, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { force: true });
  }
}

await assertFilesExist([...rootFiles, ...assetFiles]);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await copyFiles([...rootFiles, ...assetFiles]);

const forbiddenNames = ['temp_nghia.html', 'nghia_dom.txt', 'scrape.js', 'plans', 'src'];
const outputEntries = await readdir(output, { recursive: true });
const leaked = outputEntries.filter((entry) => forbiddenNames.some((name) => entry.includes(name)));
if (leaked.length) {
  throw new Error(`Publish boundary violation: ${leaked.join(', ')}`);
}

console.log(`Built .portfolio-dist with ${rootFiles.length + assetFiles.length} allowlisted files.`);
