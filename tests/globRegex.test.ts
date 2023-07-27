import globToRegex from "../src/globToRegex";

describe("Test if globs correctly match the path", () => {
  test("scope matches same pattern", () => {
    expect(doesMatch("comment.large", "comment.large")).toBe(true);
  });
  test("scope matches same pattern with stars", () => {
    expect(
      doesMatch(
        "*.descriptive.*.multiline",
        "comment.descriptive.large.multiline",
      ),
    ).toBe(true);
  });
  test("scope matches start glob", () => {
    expect(
      doesMatch("**.multiline", "comment.descriptive.large.multiline"),
    ).toBe(true);
  });
  test("scope matches end glob", () => {
    expect(doesMatch("comment.**", "comment.descriptive.large.multiline")).toBe(
      true,
    );
  });
  test("scope matches middle glob", () => {
    expect(
      doesMatch("comment.**.multiline", "comment.descriptive.large.multiline"),
    ).toBe(true);
  });
  test("scope does not match incorrect pattern", () => {
    expect(
      doesMatch(
        "comment.descriptive.large.multi",
        "comment.descriptive.large.multiline",
      ),
    ).toBe(false);
  });
  test("scope does not match incorrect star", () => {
    expect(
      doesMatch("*.large.multiline", "comment.descriptive.large.multiline"),
    ).toBe(false);
  });
});

function doesMatch(pattern: string, scope: string): boolean {
  return globToRegex(pattern).test(scope);
}
