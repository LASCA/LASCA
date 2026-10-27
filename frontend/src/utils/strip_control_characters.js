const CONTROL_CHARACTERS = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(31)}${String.fromCharCode(127)}]`,
  'g',
);

export function stripControlCharacters(value) {
  return String(value).replace(CONTROL_CHARACTERS, '');
}
