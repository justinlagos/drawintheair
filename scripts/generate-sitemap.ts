import fs from 'fs';
import path from 'path';

// Define the URLs based on the routing (excluding dynamic and administrative ones)
const routes = [
  '/',
  '/faq',
  '/schools',
  '/schools/training',
  '/parents',
  '/privacy',
  '/terms',
  '/cookies',
  '/safeguarding',
  '/accessibility',
  '/free-paint',
  '/letter-tracing',
  '/for-parents',
  '/for-teachers',
  '/learn'
];

// Add activities manually or from your config
const activities = ['bubble-pop', 'sort-and-place'];
activities.forEach(a => routes.push(`/activities/${a}`));

// Add letters
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
letters.forEach(l => routes.push(`/trace-${l.toLowerCase()}`));

// Add numbers
const numbers = ['1','2','3','4','5','6','7','8','9','10'];
numbers.forEach(n => routes.push(`/trace-number-${n}`));

// Add shapes
const shapes = ['circle', 'triangle', 'square', 'star', 'heart', 'rectangle', 'diamond', 'oval'];
shapes.forEach(s => routes.push(`/trace-${s}`));

const date = new Date().toISOString().split('T')[0];
let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

routes.forEach(route => {
  xml += `  <url>
    <loc>https://drawintheair.com${route}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>${route === '/' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>\n`;
});

xml += `</urlset>`;

const outputPath = path.resolve(process.cwd(), 'public', 'sitemap.xml');
fs.writeFileSync(outputPath, xml, 'utf8');
console.log(`Successfully generated sitemap with ${routes.length} URLs at ${outputPath}`);
