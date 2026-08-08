/**
 * OTel GenAI telemetry — the one switch that lets a host SEE the agent.
 *
 * The AI SDK emits OpenTelemetry GenAI spans (model, tokens, cost, latency,
 * tool calls, errors) only when a call passes `experimental_telemetry`. It is
 * off by default there, deliberately: a library must not export a host's
 * prompts without being asked.
 *
 * Vendo never passed it, so a host that had registered a tracer provider still
 * saw nothing from any Vendo model call — silently, with no warning and no
 * error. Measured in a third-party Next.js host: a 4.4-minute turn that
 * generated a working app produced zero spans; with these call sites emitting,
 * the same prompt produced cost per turn, the model ladder escalating
 * mini -> full, the whole tool graph, and the app-repair lane firing.
 *
 * There is NO vendor coupling here and no new dependency. The AI SDK resolves
 * whatever provider the host registered through `@opentelemetry/api`; Vendo
 * runs inside the host's process, so the spans simply join what is already
 * there — Langfuse, Braintrust, Datadog, or nothing at all.
 *
 * OPT-IN, off by default. A host turns it on with `VENDO_OTEL_TRACING=1`.
 * (Arguably it should default to on whenever a provider is registered — a host
 * that installed OTel has already opted into collecting traces — but that is a
 * behaviour change and belongs in its own decision, not this one.)
 */

/** Vendo's span names, so a host can filter its dashboard by lane. */
export type TelemetryLane =
  | "vendo.agent.turn"
  | "vendo.agent.compaction"
  | "vendo.apps.generate"
  | "vendo.apps.check";

function enabled(): boolean {
  const flag = process.env.VENDO_OTEL_TRACING;
  return flag === "1" || flag === "true";
}

/**
 * Spread into an ai-SDK `streamText` / `generateText` call:
 *
 * ```ts
 * const result = streamText({ model, messages, ...otelTelemetry("vendo.agent.turn") });
 * ```
 *
 * Returns `{}` when disabled, so the call is byte-identical to today's
 * behaviour unless a host asks for tracing.
 */
export function otelTelemetry(
  lane: TelemetryLane,
  metadata?: Record<string, string | number | boolean>,
): { experimental_telemetry?: { isEnabled: true; functionId: string; metadata?: Record<string, string | number | boolean> } } {
  if (!enabled()) return {};
  return {
    experimental_telemetry: {
      isEnabled: true,
      functionId: lane,
      ...(metadata === undefined ? {} : { metadata }),
    },
  };
}
