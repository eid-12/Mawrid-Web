import locales from './public-home.json';

export function updateSearchMetadata(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/';
  const isHome = path === '/' || path === '/ar';
  const seo = path === '/ar' ? locales.ar : locales.en;
  document.documentElement.lang = seo.lang;
  document.documentElement.dir = seo.dir;
  document.title = isHome ? seo.title : 'Mawrid';

  function meta(key: string, content: string, property = false) {
    const attribute = property ? 'property' : 'name';
    let tag = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
    if (!tag) { tag = document.createElement('meta'); tag.setAttribute(attribute, key); document.head.append(tag); }
    tag.content = content;
  }
  meta('robots', isHome ? 'index, follow' : 'noindex, follow');
  meta('description', seo.description);
  meta('og:title', seo.title, true);
  meta('og:description', seo.description, true);
  meta('twitter:title', seo.title);
  meta('twitter:description', seo.description);

  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (isHome) {
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
    canonical.href = seo.url;
  } else { canonical?.remove(); }

  document.querySelectorAll('link[data-public-home]').forEach(link => link.remove());
  if (isHome) {
    for (const [language, href] of [['en', locales.en.url], ['ar', locales.ar.url], ['x-default', locales.en.url]]) {
      const link = document.createElement('link');
      link.rel = 'alternate'; link.hreflang = language; link.href = href;
      link.dataset.publicHome = 'true'; document.head.append(link);
    }
  }
}
