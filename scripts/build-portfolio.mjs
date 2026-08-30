import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
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
  'assets/css/product-demo.css',
  'assets/css/proof.css',
  'assets/css/recruitment-demo.css',
  'assets/css/registration-mocks.css',
  'assets/css/tms.css',
  'assets/css/tms-demo.css',
  'assets/js/flow-demo.js',
  'assets/js/recruitment-demo.js',
  'assets/js/reveal.js',
  'assets/js/theme.js',
  'assets/js/tms-demo.js',
  'assets/proof/certstudio-walkthrough.html',
  'assets/proof/registration-walkthrough.html',
  'assets/proof/tms-walkthrough.html',
  'assets/proof/recruitment-walkthrough.html',
];

// These are the two real, locally runnable product builds. They are copied
// into the same-origin proof boundary so a recruiter can interact with the
// product without receiving a production credential or crossing an iframe
// origin. The source dist folders are committed build artefacts and are
// refreshed explicitly when either app changes.
const demoBundles = [
  {
    source: 'certificate-flow/dist',
    runtime: 'assets/proof/certstudio-runtime.html',
    assets: 'assets/proof/certstudio-runtime-assets',
    label: 'CertStudio',
  },
  {
    source: 'ld-event-registration-platform/dist',
    runtime: 'assets/proof/registration-runtime.html',
    assets: 'assets/proof/registration-runtime-assets',
    label: 'Corgi77 Registration',
  },
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

async function assertDirectory(relative) {
  const absolute = path.join(root, relative);
  try {
    const info = await stat(absolute);
    if (!info.isDirectory()) throw new Error('not a directory');
  } catch (error) {
    throw new Error(`Required publish directory is missing: ${relative} (${error.message})`);
  }
}

async function copyDemoBundle(bundle) {
  const sourceDir = path.join(root, bundle.source);
  const sourceIndex = path.join(sourceDir, 'index.html');
  const sourceAssets = path.join(sourceDir, 'assets');
  await assertFilesExist([path.relative(root, sourceIndex)]);
  await assertDirectory(path.relative(root, sourceAssets));

  const runtimePath = path.join(output, bundle.runtime);
  const runtimeAssetsPath = path.join(output, bundle.assets);
  await mkdir(runtimeAssetsPath, { recursive: true });
  await cp(sourceAssets, runtimeAssetsPath, { recursive: true, force: true });

  // Vite emits relative references (`./assets/...`). The runtime HTML lives
  // beside the outer proof pages, so rewrite only those references to the
  // copied sibling directory. All hashed chunks remain untouched.
  const relativeAssets = path.relative(path.dirname(bundle.runtime), bundle.assets).split(path.sep).join('/');
  const assetPrefix = `./${relativeAssets.replace(/^\.\//, '')}/`;
  let runtimeHtml = await readFile(sourceIndex, 'utf8');
  runtimeHtml = runtimeHtml.replace(/(["'])\.\/assets\//g, `$1${assetPrefix}`);
  runtimeHtml = runtimeHtml.replace(/<html\b/i, '<html data-runtime-demo="true"');
  runtimeHtml = runtimeHtml.replace(/<meta\s+charset=/i, '<meta name="robots" content="noindex" />\n    <meta charset=');
  await mkdir(path.dirname(runtimePath), { recursive: true });
  await writeFile(runtimePath, `<!-- ${bundle.label} public runtime; generated from ${bundle.source}. -->\n${runtimeHtml}`);
}

await assertFilesExist([...rootFiles, ...assetFiles]);
for (const bundle of demoBundles) {
  await assertFilesExist([path.join(bundle.source, 'index.html')]);
  await assertDirectory(path.join(bundle.source, 'assets'));
}
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await copyFiles([...rootFiles, ...assetFiles]);
for (const bundle of demoBundles) await copyDemoBundle(bundle);

const forbiddenNames = ['temp_nghia.html', 'nghia_dom.txt', 'scrape.js', 'plans', 'src'];
const outputEntries = await readdir(output, { recursive: true });
const leaked = outputEntries.filter((entry) => forbiddenNames.some((name) => entry.includes(name)));
if (leaked.length) {
  throw new Error(`Publish boundary violation: ${leaked.join(', ')}`);
}

const outputFiles = await (async () => {
  const files = [];
  async function collect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await collect(absolute);
      else if (entry.isFile()) files.push(absolute);
    }
  }
  await collect(output);
  return files;
})();
console.log(`Built .portfolio-dist with ${outputFiles.length} intentional public files (${demoBundles.length} playable bundles).`);
