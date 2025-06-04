// Basic HTML tag stripper
const stripHtml = (html) => {
  if (typeof html !== 'string') return '';
  return html.replace(/<[^>]*>?/gm, '');
};

module.exports = {
  stripHtml,
};
