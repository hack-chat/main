/**
  * Check and trim string provided by remote client
  * @public
  * @param {string} text - Subject string
  * @return {string|null}
  */
export const parseText = (text) => {
  // verifies user input is text
  if (typeof text !== 'string') {
    return null;
  }

  let sanitizedText = text;

  // strip newlines from beginning and end
  sanitizedText = sanitizedText.replace(/^\s*\n|^\s+$|\n\s*$/g, '');
  // replace 3+ newlines with just 2 newlines
  sanitizedText = sanitizedText.replace(/\n{3,}/g, '\n\n');

  return sanitizedText;
};
