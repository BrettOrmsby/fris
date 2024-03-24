import escapeStringToRegex from "../src/utils/escapeStringToRegex";

describe("Test if string regex is escaped properly", () => {
  test("Regex should match same string", () => {
    expect(
      escapeStringToRegex("Punctuation with regex symbols &&||^..////").test(
        "Punctuation with regex symbols &&||^..////",
      ),
    ).toBe(true);
  });
  test("Regex should not match different string", () => {
    expect(
      escapeStringToRegex("Punctuation with regex symbols &&||^..////").test(
        "Punctuation with regex symbols &&||^.+////",
      ),
    ).toBe(false);
  });
});
