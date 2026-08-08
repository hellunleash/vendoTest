import { afterEach, describe, expect, it } from "vitest";
import { otelTelemetry } from "./otel-telemetry.js";

const original = process.env.VENDO_OTEL_TRACING;

afterEach(() => {
  if (original === undefined) delete process.env.VENDO_OTEL_TRACING;
  else process.env.VENDO_OTEL_TRACING = original;
});

describe("otelTelemetry", () => {
  it("returns {} when unset, so a call spreads to exactly today's behaviour", () => {
    delete process.env.VENDO_OTEL_TRACING;
    expect(otelTelemetry("vendo.agent.turn")).toEqual({});
  });

  it("stays off for any value that is not an explicit opt-in", () => {
    for (const value of ["0", "false", "", "yes", "on"]) {
      process.env.VENDO_OTEL_TRACING = value;
      expect(otelTelemetry("vendo.agent.turn")).toEqual({});
    }
  });

  it("emits ai-SDK telemetry settings named for the lane when opted in", () => {
    process.env.VENDO_OTEL_TRACING = "1";
    expect(otelTelemetry("vendo.apps.generate")).toEqual({
      experimental_telemetry: { isEnabled: true, functionId: "vendo.apps.generate" },
    });
  });

  it("accepts 'true' as well as '1'", () => {
    process.env.VENDO_OTEL_TRACING = "true";
    expect(otelTelemetry("vendo.agent.turn")).toHaveProperty("experimental_telemetry.isEnabled", true);
  });

  it("carries host metadata through when given, and omits the key when not", () => {
    process.env.VENDO_OTEL_TRACING = "1";
    expect(otelTelemetry("vendo.agent.turn", { tenant: "acme" })).toEqual({
      experimental_telemetry: {
        isEnabled: true,
        functionId: "vendo.agent.turn",
        metadata: { tenant: "acme" },
      },
    });
    expect(otelTelemetry("vendo.agent.turn").experimental_telemetry).not.toHaveProperty("metadata");
  });

  it("is read per call, so a host can flip it without a restart", () => {
    delete process.env.VENDO_OTEL_TRACING;
    expect(otelTelemetry("vendo.apps.check")).toEqual({});
    process.env.VENDO_OTEL_TRACING = "1";
    expect(otelTelemetry("vendo.apps.check")).not.toEqual({});
  });
});
