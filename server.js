const express = require('express');
const cors = require('cors');
const { JSDOM } = require('jsdom');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

function analyzeSEO(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const titleEl = document.querySelector('title');
  const title = titleEl ? titleEl.textContent.trim() : null;

  const metaDescEl = document.querySelector('meta[name="description"]');
  const metaDesc = metaDescEl ? metaDescEl.getAttribute('content').trim() : null;

  const h1Count = document.querySelectorAll('h1').length;

  const images = [...document.querySelectorAll('img')];
  const imagesWithAlt = images.filter(img => img.hasAttribute('alt') && img.getAttribute('alt').trim() !== '').length;
  const imageAltRatio = images.length > 0 ? `${imagesWithAlt}/${images.length}` : '0/0';

  let score = 0;
  if (title) score += 20;
  if (metaDesc) score += 20;
  if (h1Count > 0) score += 10;
  if (images.length > 0 && (imagesWithAlt / images.length) > 0.5) score += 20;

  return {
    score,
    detail: {
      title,
      metaDesc,
      h1: h1Count,
      imageAltRatio
    }
  };
}

app.post('/analyze-html', (req, res) => {
  const { html } = req.body;
  if (!html) {
    return res.status(400).json({ error: 'HTML tidak boleh kosong.' });
  }

  try {
    const result = analyzeSEO(html);
    res.json(result);
  } catch (error) {
    console.error('Error saat analisis HTML:', error); // Supaya tahu error-nya apa
    res.status(500).json({ error: 'Terjadi kesalahan saat memproses HTML.' });
  }
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
