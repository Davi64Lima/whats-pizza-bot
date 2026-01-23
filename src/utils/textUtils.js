/**
 * Capitaliza a primeira letra de uma string
 * @param {string} str - String a capitalizar
 * @returns {string} String capitalizada
 */
export function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Normaliza texto removendo acentos e convertendo para lowercase
 * @param {string} text - Texto a normalizar
 * @returns {string} Texto normalizado
 */
export function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
