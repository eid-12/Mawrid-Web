import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const locales = JSON.parse(fs.readFileSync(path.join(base, 'src/app/seo/public-home.json'), 'utf8'));
const template = fs.readFileSync(path.join(base, 'dist/index.html'), 'utf8');
const escape = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function localized(seo) {
  let html = template.replace(/<html[^>]*>/, `<html lang="${seo.lang}" dir="${seo.dir}">`)
    .replace(/<title>.*?<\/title>/s, () => `<title>${escape(seo.title)}</title>`);
  for (const key of ['description', 'og:description', 'twitter:description']) {
    html = html.replace(new RegExp(`(<meta (?:name|property)="${key}" content=")[^"]*(">)`), (_, a, b) => a + escape(seo.description) + b);
  }
  for (const key of ['og:title', 'twitter:title']) {
    html = html.replace(new RegExp(`(<meta (?:name|property)="${key}" content=")[^"]*(">)`), (_, a, b) => a + escape(seo.title) + b);
  }
  const alternates = [['en', locales.en.url], ['ar', locales.ar.url], ['x-default', locales.en.url]]
    .map(([lang, href]) => `  <link rel="alternate" hreflang="${lang}" href="${href}" data-public-home="true">`).join('\n');
  // Keep a canonical out of the SPA fallback; its route-specific value is supplied by the router.
  const canonical = seo.lang === 'ar' ? `  <link rel="canonical" href="${seo.url}">\n` : '';
  return html.replace('</head>', `${canonical}${alternates}\n</head>`);
}
fs.writeFileSync(path.join(base, 'dist/index.html'), localized(locales.en));
fs.mkdirSync(path.join(base, 'dist/ar'), { recursive: true });
fs.writeFileSync(path.join(base, 'dist/ar/index.html'), localized(locales.ar));
console.log('Generated English and Arabic homepage metadata.');
