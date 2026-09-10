const NAME_CHARACTERS = /^[\p{L}\p{M}.'’ -]+$/u;
const INITIAL_SURNAME_YEAR = /^[a-z]{3,}(20\d{2})$/;
const NAME_SURNAME_YEAR = /^[a-z]+\.[a-z]+(20\d{2})$/;

export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function isFullName(value: string) {
  const normalized = normalizeName(value);
  const words = normalized.split(" ").filter(Boolean);
  return normalized.length >= 3 && normalized.length <= 100 && words.length >= 2 && NAME_CHARACTERS.test(normalized);
}

export function getUctUsernameError(value: string) {
  const username = value.trim().toLowerCase();
  if (!username) return "Escribe el usuario de tu correo institucional.";

  const match = username.match(INITIAL_SURNAME_YEAR) || username.match(NAME_SURNAME_YEAR);
  if (!match) {
    return "Usa inicial + apellido + año, o nombre.apellido + año. El año debe tener 4 dígitos.";
  }

  const admissionYear = Number(match[1]);
  const currentYear = new Date().getFullYear();
  if (admissionYear < 2000 || admissionYear > currentYear) {
    return `El año de ingreso debe estar entre 2000 y ${currentYear}.`;
  }

  return null;
}

export function isValidUctUsername(value: string) {
  return getUctUsernameError(value) === null;
}

export function isValidUctEmail(value: string) {
  const email = value.trim().toLowerCase();
  const suffix = "@alu.uct.cl";
  if (!email.endsWith(suffix)) return false;
  const username = email.slice(0, -suffix.length);
  return isValidUctUsername(username) && !username.includes("@");
}
