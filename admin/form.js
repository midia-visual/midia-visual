export const $ = id => document.getElementById(id);
export const form = $('form');
export const field = name => form.elements.namedItem(name);
