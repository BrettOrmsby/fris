/*
 * Escapes all regex special characters in a string
 */
export default function escapeStringToRegex(str: string, flags = ""): RegExp {
  const regexCharacters = /[|\\{}()[\]^$+*?.]/g;
  return new RegExp(str.replace(regexCharacters, "\\$&"), flags);
}
