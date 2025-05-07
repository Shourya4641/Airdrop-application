import { describe, expect, it } from "vitest";
import { calculateTotal } from "./calculateTotal";

describe("calculateTotal", () => {
  it("should sum numbers separated by newlines", () => {
    const input = "100\n200\n50";
    const expectedOutput = 350;
    expect(calculateTotal(input)).toBe(expectedOutput);
  });

  it("should sum numbers separated by commas", () => {
    expect(calculateTotal("100,200,75")).toBe(375);
  });

  it("should handle a single number", () => {
    expect(calculateTotal("500")).toBe(500);
  });

  it("should return 0 for an empty string", () => {
    expect(calculateTotal("")).toBe(0);
  });

  it("should handle mixed delimiters and extra whitespace", () => {
    expect(calculateTotal(" 100 ,200\n 300 ")).toBe(600);
  });

  it("should ignore invalid entries and empty lines", () => {
    expect(calculateTotal("100\n\n200,abc,\n,300")).toBe(600);
  });

  it("should handle floating-point numbers", () => {
    expect(calculateTotal("10.5, 20.25")).toBe(30.75);
  });

  it("should handle numbers mixed with text correctly", () => {
    expect(calculateTotal("12three\n45,abc12,123.45.67")).toBe(
      12 + 45 + 123.45
    );
  });
});
