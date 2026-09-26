import { describe, expect, it } from "vitest";
import { pickProviderModel } from "./videogen";

describe("pickProviderModel", () => {
  it("routes to text-to-video (replicate) with no reference image", () => {
    expect(pickProviderModel(undefined)).toEqual({
      provider: "replicate",
      model: "Wan-AI/Wan2.2-TI2V-5B",
    });
    expect(pickProviderModel("")).toEqual({
      provider: "replicate",
      model: "Wan-AI/Wan2.2-TI2V-5B",
    });
  });

  it("routes to image-to-video (wavespeed) when a reference image is present", () => {
    expect(pickProviderModel("https://example.com/ref.png")).toEqual({
      provider: "wavespeed",
      model: "Wan-AI/Wan2.2-I2V-A14B",
    });
  });
});
