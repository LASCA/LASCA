import { useEffect } from 'react';
import { SITE } from '../site';

function setMeta(selector, attr, value, create) {
  let el = document.head.querySelector(selector);
  if (!el && create) {
    el = document.createElement(create.tag);
    Object.entries(create.attrs).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  }
  if (el) el.setAttribute(attr, value);
}

/**
 * Τίτλος καρτέλας, περιγραφή και Open Graph ανά σελίδα (SEO + προεπισκόπηση όταν μοιράζεται σύνδεσμος).
 * noindex: για σελίδες που δεν πρέπει να εμφανίζονται στη Google (εφαρμογή, προφίλ, επαναφορά κωδικού).
 */
export default function usePageMeta({ title, description = SITE.description, noindex = false, path } = {}) {
  useEffect(() => {
    const full = title ? `${title} · ${SITE.name}` : `${SITE.name} — Τοπογραφικοί υπολογισμοί online`;
    document.title = full;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', full);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[name="twitter:title"]', 'content', full);
    setMeta('meta[name="twitter:description"]', 'content', description);
    setMeta('meta[name="robots"]', 'content', noindex ? 'noindex, nofollow' : 'index, follow',
      { tag: 'meta', attrs: { name: 'robots' } });
    const url = `${SITE.url}${path ?? window.location.pathname}`;
    setMeta('link[rel="canonical"]', 'href', url, { tag: 'link', attrs: { rel: 'canonical' } });
    setMeta('meta[property="og:url"]', 'content', url);
  }, [title, description, noindex, path]);
}
