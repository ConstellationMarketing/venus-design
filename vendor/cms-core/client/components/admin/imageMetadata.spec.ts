import { describe, expect, it } from "vitest";
import {
  createSelectedImageAsset,
  formatImageTitle,
  getSuggestedImageAltText,
} from "./imageMetadata";

describe("imageMetadata", () => {
  it("formats a file name into a readable title", () => {
    expect(formatImageTitle("car-accident-lawyers.webp")).toBe(
      "car accident lawyers",
    );
  });

  it("prefers existing media alt text when available", () => {
    expect(
      getSuggestedImageAltText("team-photo.jpg", "Attorney portrait"),
    ).toBe("Attorney portrait");
  });

  it("falls back to the file name when media alt text is empty", () => {
    expect(getSuggestedImageAltText("team-photo.jpg", "   ")).toBe(
      "team photo",
    );
  });

  it("creates a selected asset with the suggested alt text", () => {
    expect(
      createSelectedImageAsset({
        url: "https://cdn.example.com/team-photo.jpg",
        fileName: "team-photo.jpg",
      }),
    ).toEqual({
      url: "https://cdn.example.com/team-photo.jpg",
      fileName: "team-photo.jpg",
      altText: null,
      suggestedAltText: "team photo",
    });
  });
});
