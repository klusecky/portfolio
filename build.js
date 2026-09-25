#!/usr/bin/env node
'use strict';

/*
 * Generates the two static language versions from src/template.html:
 *   English -> /index.html   (primary, gets the root URL)
 *   Polish  -> /pl/index.html
 *
 * Translations live in the template as data-pl / data-en attributes. Baking them
 * into static HTML is what makes both languages indexable - a JS-only language
 * switch leaves the second language invisible to search engines.
 *
 * Run: node build.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE = 'https://www.chruslicki.com';
const SRC = path.join(ROOT, 'src', 'template.html');

const URLS = { en: `${SITE}/`, pl: `${SITE}/pl/` };
const OG_IMAGE = `${SITE}/images/portrait2.jpg`;
const CONTACT_EMAIL = 'klusecky@gmail.com';

const SAME_AS = [
  'https://www.youtube.com/@chruslicki',
  'https://www.instagram.com/krzysiekchruslicki',
  'https://www.youtube.com/@BusemPrzezSwiat'
];

const ADDRESS = {
  '@type': 'PostalAddress',
  addressLocality: 'Barnstaple',
  addressRegion: 'Devon',
  addressCountry: 'GB'
};

const LANGS = {
  en: {
    outPath: ['index.html'],
    htmlLang: 'en-GB',
    ogLocale: 'en_GB',
    ogLocaleAlt: 'pl_PL',
    title: 'YouTube & Instagram Video Editor | Krzysztof Chruślicki, UK',
    description:
      'Long-form video editing for YouTube and Instagram - story-first cuts, colour grading and sound in DaVinci Resolve. UK-based, working remotely worldwide.',
    ogTitle: 'Krzysztof Chruślicki - Video Editor for YouTube & Instagram',
    ogDescription:
      'Long-form video editing for YouTube and Instagram - story-first cuts, colour grading and sound in DaVinci Resolve. UK-based, working remotely.',
    imageAlt: 'Krzysztof Chruślicki, video editor',
    siteName: 'Krzysztof Chruślicki - Video Editor',
    toggleHref: '/pl/',
    toggleLang: 'pl',
    toggleLabel: 'PL',
    toggleAria: 'Zobacz polską wersję strony',
    jobTitle: 'Video Editor',
    personDescription:
      'Video editor specialising in long-form YouTube and Instagram content - editing, sound and colour grading in DaVinci Resolve. Based in Barnstaple, UK, working remotely with creators worldwide.',
    serviceName: 'Krzysztof Chruślicki - Video Editing',
    offers: [
      { name: 'Long-form video editing', description: 'YouTube videos, 15-40 min - editing, colour grading, sound and titles.' },
      { name: 'Short-form video editing', description: 'Reels and Shorts, 15-90 sec - single edits, monthly packages or repurposing from long-form.' }
    ],
    trialOffer: {
      name: 'First edit at 50% off',
      description:
        'A new client pays half the usual rate for their first project, so both sides can check the editing style and the working relationship before committing to more.'
    },
    form: {
      sending: 'Sending...',
      success: "Thank you! I'll get back to you as soon as possible.",
      error: 'Something went wrong - please email me directly instead.'
    }
  },
  pl: {
    outPath: ['pl', 'index.html'],
    htmlLang: 'pl',
    ogLocale: 'pl_PL',
    ogLocaleAlt: 'en_GB',
    title: 'Montażysta wideo YouTube i Instagram | Krzysztof Chruślicki',
    description:
      'Montaż wideo dla YouTube i Instagrama - długie formy, color grading i dźwięk w DaVinci Resolve. Pracuję zdalnie z twórcami z Polski i zagranicy.',
    ogTitle: 'Krzysztof Chruślicki - Montażysta wideo',
    ogDescription:
      'Montaż wideo dla YouTube i Instagrama - długie formy, color grading i dźwięk w DaVinci Resolve. Pracuję zdalnie.',
    imageAlt: 'Krzysztof Chruślicki, montażysta wideo',
    siteName: 'Krzysztof Chruślicki - Montażysta wideo',
    toggleHref: '/',
    toggleLang: 'en',
    toggleLabel: 'EN',
    toggleAria: 'View the English version of this site',
    jobTitle: 'Montażysta wideo',
    personDescription:
      'Montażysta wideo specjalizujący się w długich formach na YouTube i Instagram - cięcie, dźwięk i color grading w DaVinci Resolve. Pracuję zdalnie.',
    serviceName: 'Krzysztof Chruślicki - Montaż wideo',
    offers: [
      { name: 'Montaż długich form', description: 'Filmy na YouTube, 15-40 min - montaż, color grading, dźwięk i tytuły.' },
      { name: 'Montaż krótkich form', description: 'Reels i Shorts, 15-90 sek - pojedyncze edity, pakiety miesięczne lub repurposing z długiej formy.' }
    ],
    trialOffer: {
      name: 'Pierwszy montaż -50%',
      description:
        'Pierwszy projekt nowego klienta rozliczany jest za połowę stawki, żeby obie strony mogły sprawdzić styl montażu i współpracę przed kolejnymi zleceniami.'
    },
    form: {
      sending: 'Wysyłanie...',
      success: 'Dziękuję! Odezwę się najszybciej jak mogę.',
      error: 'Coś poszło nie tak - napisz proszę bezpośrednio na e-mail.'
    }
  }
};

/* ---------- helpers ---------- */

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const unescapeHtml = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

function countAttr(html, attr) {
  const m = html.match(new RegExp(`\\s${attr}="`, 'g'));
  return m ? m.length : 0;
}

// Replaces the text content of every element carrying `data-<lang>`.
function bakeText(html, lang) {
  const attr = `data-${lang}`;
  const re = new RegExp(`(<([a-z0-9]+)\\b[^>]*?\\s${attr}="([^"]*)"[^>]*>)([^<]*)(<\\/\\2>)`, 'g');
  let count = 0;
  const out = html.replace(re, (_m, open, _tag, value, _old, close) => {
    count++;
    return open + value + close;
  });
  return { html: out, count };
}

// Same, but the translation contains markup (e.g. <br>, <span>), so it is unescaped.
function bakeHtml(html, lang) {
  const attr = `data-${lang}-html`;
  const re = new RegExp(`(<([a-z0-9]+)\\b[^>]*?\\s${attr}="([^"]*)"[^>]*>)([\\s\\S]*?)(<\\/\\2>)`, 'g');
  let count = 0;
  const out = html.replace(re, (_m, open, _tag, value, _old, close) => {
    count++;
    return open + unescapeHtml(value) + close;
  });
  return { html: out, count };
}

// Copies data-<lang>-<suffix> onto the real attribute (placeholder / alt / aria-label).
function bakeAttr(html, lang, suffix, target) {
  const attr = `data-${lang}-${suffix}`;
  const re = new RegExp(`<[a-z0-9]+\\b[^>]*?\\s${attr}="([^"]*)"[^>]*>`, 'g');
  let count = 0;
  const out = html.replace(re, (tag, value) => {
    count++;
    const existing = new RegExp(`\\s${target}="[^"]*"`);
    if (existing.test(tag)) return tag.replace(existing, ` ${target}="${value}"`);
    return tag.replace(/\s*>$/, ` ${target}="${value}">`);
  });
  return { html: out, count };
}

function assertCount(label, got, expected) {
  if (got !== expected) {
    throw new Error(`Translation mismatch for ${label}: replaced ${got}, expected ${expected}`);
  }
}

/* ---------- head + structured data ---------- */

function buildStructuredData(lang) {
  const cfg = LANGS[lang];
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${SITE}/#person`,
        name: 'Krzysztof Chruślicki',
        url: URLS[lang],
        image: OG_IMAGE,
        jobTitle: cfg.jobTitle,
        description: cfg.personDescription,
        email: `mailto:${CONTACT_EMAIL}`,
        address: ADDRESS,
        knowsLanguage: ['en', 'pl'],
        knowsAbout: ['Video Editing', 'Colour Grading', 'DaVinci Resolve', 'Sound Design', 'YouTube Content'],
        sameAs: SAME_AS
      },
      {
        '@type': 'ProfessionalService',
        '@id': `${SITE}/#service`,
        name: cfg.serviceName,
        url: URLS[lang],
        image: OG_IMAGE,
        description: cfg.personDescription,
        provider: { '@id': `${SITE}/#person` },
        founder: { '@id': `${SITE}/#person` },
        serviceType: lang === 'en' ? 'Video editing' : 'Montaż wideo',
        address: ADDRESS,
        email: `mailto:${CONTACT_EMAIL}`,
        priceRange: '££',
        availableLanguage: ['English', 'Polish'],
        areaServed: [
          { '@type': 'Country', name: 'United Kingdom' },
          { '@type': 'Country', name: 'Poland' },
          { '@type': 'Place', name: 'Worldwide' }
        ],
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: cfg.serviceName,
          itemListElement: [
            ...cfg.offers.map((o) => ({
              '@type': 'Offer',
              itemOffered: { '@type': 'Service', name: o.name, description: o.description }
            })),
            {
              '@type': 'Offer',
              name: cfg.trialOffer.name,
              description: cfg.trialOffer.description,
              itemOffered: { '@type': 'Service', name: cfg.trialOffer.name, description: cfg.trialOffer.description }
            }
          ]
        },
        sameAs: SAME_AS
      },
      {
        '@type': 'WebSite',
        '@id': `${URLS[lang]}#website`,
        url: URLS[lang],
        name: cfg.siteName,
        inLanguage: cfg.htmlLang,
        publisher: { '@id': `${SITE}/#person` }
      }
    ]
  };
}

function buildHead(lang) {
  const cfg = LANGS[lang];
  const ld = JSON.stringify(buildStructuredData(lang), null, 2);

  return `<title>${esc(cfg.title)}</title>
<meta name="description" content="${esc(cfg.description)}">
<link rel="canonical" href="${URLS[lang]}">

<link rel="alternate" hreflang="en" href="${URLS.en}">
<link rel="alternate" hreflang="pl" href="${URLS.pl}">
<link rel="alternate" hreflang="x-default" href="${URLS.en}">

<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(cfg.siteName)}">
<meta property="og:url" content="${URLS[lang]}">
<meta property="og:title" content="${esc(cfg.ogTitle)}">
<meta property="og:description" content="${esc(cfg.ogDescription)}">
<meta property="og:image" content="${OG_IMAGE}">
<meta property="og:image:alt" content="${esc(cfg.imageAlt)}">
<meta property="og:locale" content="${cfg.ogLocale}">
<meta property="og:locale:alternate" content="${cfg.ogLocaleAlt}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(cfg.ogTitle)}">
<meta name="twitter:description" content="${esc(cfg.ogDescription)}">
<meta name="twitter:image" content="${OG_IMAGE}">
<meta name="twitter:image:alt" content="${esc(cfg.imageAlt)}">

<script type="application/ld+json">
${ld}
</script>`;
}

/* ---------- build ---------- */

function build(lang) {
  const cfg = LANGS[lang];
  const other = lang === 'en' ? 'pl' : 'en';
  const template = fs.readFileSync(SRC, 'utf8');
  let html = template;

  // Expected counts come from the template so a missing translation fails the build.
  const expected = {
    text: countAttr(template, `data-${lang}`),
    html: countAttr(template, `data-${lang}-html`),
    placeholder: countAttr(template, `data-${lang}-placeholder`),
    alt: countAttr(template, `data-${lang}-alt`),
    aria: countAttr(template, `data-${lang}-aria`)
  };

  // Blocks wrapped in <!-- en-only --> / <!-- pl-only --> ship only with that language.
  html = html.replace(/<!-- (en|pl)-only -->\r?\n?([\s\S]*?)<!-- \/\1-only -->\r?\n?/g, (_m, blockLang, content) =>
    blockLang === lang ? content : ''
  );

  let r;
  r = bakeHtml(html, lang);
  html = r.html;
  assertCount('*-html', r.count, expected.html);

  r = bakeAttr(html, lang, 'placeholder', 'placeholder');
  html = r.html;
  assertCount('*-placeholder', r.count, expected.placeholder);

  r = bakeAttr(html, lang, 'alt', 'alt');
  html = r.html;
  assertCount('*-alt', r.count, expected.alt);

  r = bakeAttr(html, lang, 'aria', 'aria-label');
  html = r.html;
  assertCount('*-aria', r.count, expected.aria);

  r = bakeText(html, lang);
  html = r.html;
  assertCount('text', r.count, expected.text);

  // Drop the translation attributes - both languages now live at their own URL.
  html = html.replace(/\s+data-(pl|en)(-[a-z]+)?="[^"]*"/g, '');

  // Document language
  html = html.replace(/<html lang="[^"]*">/, `<html lang="${cfg.htmlLang}">`);

  // Head: everything from <title> through the JSON-LD block is regenerated.
  const headStart = html.indexOf('<title>');
  const ldStart = html.indexOf('application/ld+json');
  const headEnd = html.indexOf('</script>', ldStart) + '</script>'.length;
  if (headStart === -1 || ldStart === -1) throw new Error('Could not locate the head block to replace');
  html = html.slice(0, headStart) + buildHead(lang) + html.slice(headEnd);

  // The language switch becomes a real link between the two URLs.
  html = html.replace(
    /<button class="lang-toggle" id="lang-toggle"[^>]*>[^<]*<\/button>/,
    `<a class="lang-toggle" id="lang-toggle" href="${cfg.toggleHref}" hreflang="${cfg.toggleLang}" aria-label="${esc(cfg.toggleAria)}">${cfg.toggleLabel}</a>`
  );

  // Strip the runtime i18n switcher and bake the form messages for this language.
  const i18nStart = html.indexOf('/* ---------- i18n ---------- */');
  const i18nEndMarker = 'applyLang(currentLang);';
  const i18nEnd = html.indexOf(i18nEndMarker) + i18nEndMarker.length;
  if (i18nStart === -1 || i18nEnd < i18nStart) throw new Error('Could not locate the i18n block to replace');
  const bakedStrings = `/* ---------- i18n (baked at build time) ---------- */
  const i18nStrings = ${JSON.stringify(cfg.form)};`;
  html = html.slice(0, i18nStart) + bakedStrings + html.slice(i18nEnd);
  html = html.replace('i18nStrings[currentLang]', 'i18nStrings');

  // Absolute asset paths so /pl/ resolves them correctly too.
  html = html.replace(/(src|href)="(images\/|favicon\.svg)/g, '$1="/$2');

  if (/data-(pl|en)[-"=]/.test(html)) throw new Error('Leftover translation attributes in output');
  if (/currentLang/.test(html)) throw new Error('Leftover currentLang reference in output');
  if (/<!-- \/?(en|pl)-only -->/.test(html)) throw new Error('Unbalanced language-only block in template');

  const outFile = path.join(ROOT, ...cfg.outPath);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html, 'utf8');

  const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  console.log(`  ${cfg.outPath.join('/')}  ${cfg.htmlLang.padEnd(5)}  ${kb} KB  (${expected.text + expected.html} strings)`);
}

function buildSitemap() {
  const entry = (lang) => `  <url>
    <loc>${URLS[lang]}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${URLS.en}"/>
    <xhtml:link rel="alternate" hreflang="pl" href="${URLS.pl}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${URLS.en}"/>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${lang === 'en' ? '1.0' : '0.9'}</priority>
  </url>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entry('en')}
${entry('pl')}
</urlset>
`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
  console.log('  sitemap.xml');
}

console.log('Building chruslicki.com');
build('en');
build('pl');
buildSitemap();
console.log('Done.');
