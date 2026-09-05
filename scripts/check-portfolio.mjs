import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publishDir = path.join(root, '.portfolio-dist');
const pagesWorkflow = path.join(root, '.github', 'workflows', 'portfolio-checks.yml');
const requiredRootPages = [
  'index.html',
  'about.html',
  'certificate-pipeline.html',
  'tms.html',
  'registration.html',
  'recruitment.html',
];
const requiredProofPages = [
  'assets/proof/certstudio-walkthrough.html',
  'assets/proof/registration-walkthrough.html',
  'assets/proof/tms-walkthrough.html',
  'assets/proof/recruitment-walkthrough.html',
];
const forbiddenPatterns = [
  { label: 'reference capture name', pattern: /temp_nghia|nghia_dom|scrape\.js/i },
  { label: 'legacy font reference', pattern: /IBM\s+Plex/i },
  { label: 'known dead certificate repository', pattern: /FinanceBullkk\/certificate-automation/i },
  { label: 'secret-like environment value', pattern: /(?:GEMINI_API_KEY|MY_GEMINI_API_KEY|BEGIN\s+(?:RSA|OPENSSH|PRIVATE)\s+KEY|client_secret\s*[:=])/i },
  { label: 'embedded credential', pattern: /(?:password|passwd|token)\s*[:=]\s*["'][^"']+["']/i },
];
const publicBundleSecretPatterns = [
  { label: 'Google API key', pattern: /AIza[0-9A-Za-z_-]{20,}/ },
  { label: 'private key block', pattern: /-----BEGIN (?:RSA|OPENSSH|PRIVATE) KEY-----/ },
];

const errors = [];
const notes = [];

function fail(message) {
  errors.push(message);
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x([\da-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, digits) => String.fromCodePoint(Number.parseInt(digits, 10)));
}

function relativeName(file) {
  return path.relative(publishDir, file).split(path.sep).join('/');
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function tagMatches(html, tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'gi'))].map((match) => match[0]);
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match ? decodeHtml(match[1]) : null;
}

function isExternal(reference) {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(reference);
}

async function checkLocalReference(file, reference, htmlByFile) {
  const clean = decodeHtml(reference.trim());
  if (!clean || clean.startsWith('#') || /^(?:mailto:|tel:|javascript:|data:|blob:)/i.test(clean) || isExternal(clean)) return;

  const [withoutQuery, fragment] = clean.split('#', 2);
  const pathname = withoutQuery.split('?', 1)[0];
  const target = path.resolve(path.dirname(file), pathname || path.basename(file));
  let info;
  try {
    info = await stat(target);
  } catch {
    fail(`${relativeName(file)} references missing local file: ${clean}`);
    return;
  }
  if (!info.isFile()) {
    fail(`${relativeName(file)} references a directory: ${clean}`);
    return;
  }
  if (!fragment) return;
  const targetHtml = htmlByFile.get(target);
  if (targetHtml === undefined) return;
  const idPattern = new RegExp(`\\bid\\s*=\\s*["']${fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'i');
  const namePattern = new RegExp(`\\bname\\s*=\\s*["']${fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'i');
  if (!idPattern.test(targetHtml) && !namePattern.test(targetHtml)) {
    fail(`${relativeName(file)} references missing fragment: ${clean}`);
  }
}

async function checkHtml(file, html, htmlByFile) {
  const name = relativeName(file);
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? '';
  const runtimeDemo = attr(htmlTag, 'data-runtime-demo') === 'true';
  if (!attr(htmlTag, 'lang')) fail(`${name} is missing <html lang>`);
  if (!/<meta\b[^>]*name\s*=\s*["']viewport["'][^>]*>/i.test(html)) fail(`${name} is missing a viewport meta tag`);
  const titleTags = [...html.matchAll(/<title\b[^>]*>[\s\S]*?<\/title>/gi)];
  const titleText = titleTags[0]?.[0].replace(/<\/?title[^>]*>/gi, '').trim() ?? '';
  if (titleTags.length !== 1 || !titleText) fail(`${name} must contain one non-empty <title>`);
  // React runtime entrypoints intentionally contain only #root; their
  // accessible heading and <main> are rendered after JavaScript mounts. The
  // outer proof page carries the static contract, while the runtime bundle is
  // exercised by Playwright frame tests.
  if (!runtimeDemo) {
    const mainTags = tagMatches(html, 'main');
    if (mainTags.length !== 1) fail(`${name} must contain exactly one <main> (found ${mainTags.length})`);
    const h1Tags = tagMatches(html, 'h1');
    if (h1Tags.length !== 1) fail(`${name} must contain exactly one <h1> (found ${h1Tags.length})`);
  }

  const ids = new Map();
  for (const match of html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) {
    const id = decodeHtml(match[1]);
    ids.set(id, (ids.get(id) ?? 0) + 1);
  }
  for (const [id, count] of ids) if (count > 1) fail(`${name} repeats id="${id}"`);

  for (const imageTag of tagMatches(html, 'img')) {
    if (!attr(imageTag, 'alt')) fail(`${name} has an <img> without alt text`);
    if (!attr(imageTag, 'width') || !attr(imageTag, 'height')) fail(`${name} has an image without explicit width and height`);
  }

  for (const pattern of forbiddenPatterns) {
    if (pattern.pattern.test(html)) fail(`${name} contains forbidden ${pattern.label}`);
  }

  for (const tag of [...tagMatches(html, 'a'), ...tagMatches(html, 'link'), ...tagMatches(html, 'script'), ...tagMatches(html, 'img')]) {
    for (const attribute of ['href', 'src']) {
      const reference = attr(tag, attribute);
      if (reference) await checkLocalReference(file, reference, htmlByFile);
    }
  }
}

async function checkExternalAccess(files) {
  const externalLinks = new Set();
  for (const file of files) {
    if (!file.endsWith('.html')) continue;
    const html = await readFile(file, 'utf8');
    for (const tag of tagMatches(html, 'a')) {
      const href = attr(tag, 'href');
      if (href && /^https?:/i.test(href)) externalLinks.add(href);
    }
  }
  if (!process.argv.includes('--external')) {
    notes.push(`External access checks skipped (${externalLinks.size} links; use --external for bounded probes).`);
    return;
  }
  for (const url of externalLinks) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, { redirect: 'manual', signal: controller.signal });
      const state = response.status === 401 || response.status === 403 || (response.status >= 300 && response.status < 400)
        ? 'authenticated/redirected'
        : response.ok ? 'reachable' : `HTTP ${response.status}`;
      notes.push(`External ${state}: ${url}`);
    } catch (error) {
      notes.push(`External probe inconclusive (${error.name === 'AbortError' ? 'timeout' : error.message}): ${url}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}

try {
  const info = await stat(publishDir);
  if (!info.isDirectory()) throw new Error('not a directory');
} catch {
  fail('Missing .portfolio-dist; run npm run build:portfolio first.');
}

try {
  const workflow = await readFile(pagesWorkflow, 'utf8');
  const deploymentRequirements = [
    { label: 'verified Pages artifact upload', pattern: /actions\/upload-pages-artifact@v\d+/ },
    { label: '.portfolio-dist upload path', pattern: /\bpath:\s*\.portfolio-dist\s*$/m },
    { label: 'Pages deployment action', pattern: /actions\/deploy-pages@v\d+/ },
    { label: 'Pages deployment runner', pattern: /deploy-pages:[\s\S]*?runs-on:\s*ubuntu-latest/ },
    { label: 'live CertStudio runtime check', pattern: /assets\/proof\/certstudio-runtime\.html/ },
    { label: 'live registration runtime check', pattern: /assets\/proof\/registration-runtime\.html/ },
  ];
  for (const requirement of deploymentRequirements) {
    if (!requirement.pattern.test(workflow)) fail(`Pages workflow is missing ${requirement.label}.`);
  }
} catch (error) {
  fail(`Unable to validate Pages workflow: ${error.message}`);
}

if (!errors.length) {
  const files = await walk(publishDir);
  const relativeFiles = new Set(files.map(relativeName));
  for (const required of [...requiredRootPages, ...requiredProofPages]) {
    if (!relativeFiles.has(required)) fail(`Required artifact file is missing: ${required}`);
  }
  const htmlFiles = files.filter((file) => file.toLowerCase().endsWith('.html'));
  const htmlByFile = new Map();
  for (const file of htmlFiles) htmlByFile.set(file, await readFile(file, 'utf8'));
  for (const [file, html] of htmlByFile) await checkHtml(file, html, htmlByFile);
  // Runtime bundles are intentionally published, so scan their text contents
  // for high-confidence credential patterns as well as checking the HTML shell.
  for (const file of files) {
    if (!/\.(?:js|css|json|svg)$/i.test(file)) continue;
    const content = await readFile(file, 'utf8');
    for (const pattern of publicBundleSecretPatterns) {
      if (pattern.pattern.test(content)) fail(`${relativeName(file)} contains forbidden ${pattern.label}`);
    }
  }
  await checkExternalAccess(files);
}

if (errors.length) {
  console.error(`Portfolio checks failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Portfolio checks passed for ${requiredRootPages.length} root pages and ${requiredProofPages.length} proof pages.`);
  for (const note of notes) console.log(`Note: ${note}`);
}
