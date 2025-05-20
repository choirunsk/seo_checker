const express = require('express');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' })); // supaya bisa terima html besar

function analyzeHTML(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Title
  const titleTag = doc.querySelector('title');
  const title = titleTag ? titleTag.textContent.trim() : '';

  // Meta description
  const metaDescTag = doc.querySelector('meta[name="description"]');
  const metaDesc = metaDescTag ? metaDescTag.getAttribute('content').trim() : '';

  // H1 tags count
  const h1Tags = doc.querySelectorAll('h1');
  const h1Count = h1Tags.length;

  // Images and alt attribute ratio
  const imgs = doc.querySelectorAll('img');
  let imgsWithAlt = 0;
  imgs.forEach(img => {
    const alt = img.getAttribute('alt');
    if (alt && alt.trim() !== '') imgsWithAlt++;
  });
  const imageAltRatio = imgs.length > 0 ? `${imgsWithAlt} / ${imgs.length}` : '0 / 0';
  const imageAltRatioScore = imgs.length === 0 ? true : (imgsWithAlt / imgs.length >= 0.9);

  // Word count in body
  const bodyText = doc.body ? doc.body.textContent.trim() : '';
  const wordCount = bodyText ? bodyText.split(/\s+/).filter(w => w.length > 0).length : 0;

  // Canonical tag
  const canonical = doc.querySelector('link[rel="canonical"]');
  const hasCanonical = !!canonical;

  // Meta robots content
  const robotsMeta = doc.querySelector('meta[name="robots"]');
  const robotsContent = robotsMeta ? robotsMeta.getAttribute('content').toLowerCase() : '';

  // Open Graph title and image
  const ogTitle = doc.querySelector('meta[property="og:title"]');
  const ogImage = doc.querySelector('meta[property="og:image"]');

  // Favicon
  const favicon = doc.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
  const hasFavicon = !!favicon;

  // Inline CSS
  const inlineCSS = doc.querySelector('style') || [...doc.querySelectorAll('link[rel="stylesheet"]')].some(link => {
    // We do not consider external CSS here, just inline style tags
    return false;
  });

  // Inline JS
  const inlineJS = [...doc.querySelectorAll('script')].some(script => {
    return !script.src && script.textContent.trim().length > 0;
  });

  // Links internal and external
  const links = [...doc.querySelectorAll('a[href]')];
  let internalLinks = 0;
  let externalLinks = 0;
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    if (href.startsWith('#') || href.startsWith('/') || href.startsWith(windowLocationOrigin())) {
      internalLinks++;
    } else if (href.startsWith('http') || href.startsWith('https')) {
      externalLinks++;
    } else {
      // treat as internal by default
      internalLinks++;
    }
  });

  // Calculate score (simple heuristic)
  let score = 0;
  if (title) score += 20;
  if (metaDesc) score += 15;
  if (h1Count === 1) score += 15;
  else if (h1Count > 1) score += 7;
  if (imageAltRatioScore) score += 10;
  if (wordCount >= 300) score += 10;
  if (hasCanonical) score += 5;
  if (robotsContent.includes('index')) score += 5;
  if (ogTitle) score += 5;
  if (ogImage) score += 5;
  if (hasFavicon) score += 3;
  if (!inlineCSS) score += 3;
  if (!inlineJS) score += 3;
  if (internalLinks > 0) score += 3;
  if (externalLinks > 0) score += 3;

  if (score > 100) score = 100;

  return {
    score,
    detail: {
      title,
      metaDesc,
      h1: h1Count,
      imageAltRatio,
      imageAltRatioScore,
      wordCount,
      hasCanonical,
      robotsContent,
      ogTitle: !!ogTitle,
      ogImage: !!ogImage,
      hasFavicon,
      inlineCSS: !!inlineCSS,
      inlineJS,
      internalLinks,
      externalLinks,
    }
  };
}

// Helper function to simulate window.location.origin for checking internal links
function windowLocationOrigin() {
  // Since backend has no window, just return empty string or assume localhost
  // Frontend only treats '/' or '#' as internal links, so this is enough
  return '';
}

app.post('/analyze-html', (req, res) => {
  const { html } = req.body;
  if (!html) {
    return res.status(400).json({ error: 'HTML tidak ditemukan pada request.' });
  }

  try {
    const result = analyzeHTML(html);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan saat memproses HTML.' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
