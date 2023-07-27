/*
 * Convert a glob to the regex
 * `**` matches everything
 * `*` matches a section until a `.`
 */
export default function globToRegex(glob: string): RegExp {
  let regexString = "^";
  for (let i = 0; i < glob.length; i++) {
    const char = glob.charAt(i);
    switch (char) {
      // Escape regex-valid characters
      case "/":
      case "$":
      case "^":
      case "+":
      case ".":
      case "(":
      case ")":
      case "=":
      case "!":
      case "|":
      case "[":
      case "]":
      case "?":
      case "{":
      case "}":
        regexString += "\\" + char;
        break;
      case "*":
        {
          // Check how many stars there are
          let numberStars = 1;
          while (glob.charAt(i + 1) === "*") {
            i += 1;
            numberStars += 1;
          }
          if (numberStars > 1) {
            // Match any number of sections
            regexString += "((?:[^.]*(?:.|$))*?)";
          } else {
            // Match until a section ends
            regexString += "([^.]*)";
          }
        }
        break;
      default:
        regexString += char;
    }
  }

  return new RegExp(regexString + "$");
}
