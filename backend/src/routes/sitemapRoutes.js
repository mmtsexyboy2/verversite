const express = require('express');
const pool = require('../config/db');
const { Readable } = require('stream');

const router = express.Router();

router.get('/', async (req, res) => {
  // Base URL - should come from env var in a real app
  const siteUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  try {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

    // Static pages
    const staticPages = [
      { loc: `${siteUrl}/`, changefreq: 'daily', priority: '1.0' },
      { loc: `${siteUrl}/login`, changefreq: 'monthly', priority: '0.5' },
      { loc: `${siteUrl}/topics/create`, changefreq: 'weekly', priority: '0.7' },
      // Add other static pages here
    ];

    staticPages.forEach(page => {
      xml += '<url>';
      xml += `<loc>${page.loc}</loc>`;
      xml += `<changefreq>${page.changefreq}</changefreq>`;
      xml += `<priority>${page.priority}</priority>`;
      // <lastmod> can be added if known, e.g., build date or last significant update
      xml += '</url>';
    });

    // Dynamic topic pages
    // For large sites, consider streaming or paginating sitemap generation
    const topics = await pool.query(
      'SELECT id, updated_at FROM topics ORDER BY updated_at DESC LIMIT 50000' // Sitemap limit
    );

    topics.rows.forEach(topic => {
      xml += '<url>';
      xml += `<loc>${siteUrl}/topics/${topic.id}</loc>`;
      xml += `<lastmod>${new Date(topic.updated_at).toISOString()}</lastmod>`;
      xml += '<changefreq>daily</changefreq>'; // Or weekly, depending on update frequency
      xml += '<priority>0.8</priority>'; // Individual topics might be higher priority
      xml += '</url>';
    });

    xml += '</urlset>';

    res.header('Content-Type', 'application/xml');
    res.send(xml);

  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

module.exports = router;
