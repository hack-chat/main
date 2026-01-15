/* eslint import/prefer-default-export: 0 */

/**
  * @author MinusGix ( https://github.com/MinusGix )
  * @author Marzavec ( https://github.com/marzavec )
  * @summary General string helper functions
  * @version v1.1.0
  * @description A library of several commonly used string functions
  * @module Text
  */

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

/**
  * Validate a string as a valid hex color string
  * @param {string} color - Color string to validate
  * @public
  * @return {boolean}
  */
export const verifyColor = (color) => /(^[0-9A-F]{6}$)|(^[0-9A-F]{3}$)/i.test(color);
