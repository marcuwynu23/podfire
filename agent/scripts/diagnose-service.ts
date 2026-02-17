#!/usr/bin/env npx tsx
/**
 * Standalone diagnostics for a deployed Swarm service.
 * Usage: npx tsx scripts/diagnose-service.ts <stackName> [port]
 * Example: npx tsx scripts/diagnose-service.ts myapp 3000
 *
 * Run from the agent machine (has Docker access). Outputs clear diagnostics
 * for container config vs Traefik routing.
 */
import { runServiceDiagnostics } from "../lib/service-diagnostics";

const stackName = process.argv[2];
const port = Math.min(65535, Math.max(1, parseInt(process.argv[3] ?? "3000", 10) || 3000));

if (!stackName?.trim()) {
  console.error("Usage: npx tsx scripts/diagnose-service.ts <stackName> [port]");
  process.exit(1);
}

const d = await runServiceDiagnostics(stackName.trim(), port);

console.log("\n=== Service diagnostics ===\n");
console.log("Stack name:    ", d.stackName);
console.log("Service name: ", d.serviceName);
console.log("Expected host: ", d.expectedHost);
console.log("Expected port: ", d.expectedPort);
console.log("");
console.log("Service exists:     ", d.serviceExists ? "yes" : "no");
console.log("Container reachable:", d.containerReachable ? "yes" : "no");
if (d.containerHttpStatus != null) {
  console.log("HTTP status (curl): ", d.containerHttpStatus);
}
console.log("Traefik mentions:   ", d.traefikMentionsService ? "yes" : "no");
console.log("");
console.log("--- Verdict ---");
console.log(d.verdict);
console.log("");
console.log("--- Summary ---");
console.log(d.summary);
console.log("");
console.log("--- Service tasks (docker service ps) ---");
console.log(d.serviceTasksSummary || "(none)");
if (d.containerCurlError) {
  console.log("");
  console.log("--- Curl error ---");
  console.log(d.containerCurlError);
}
console.log("");
console.log("--- Traefik logs (tail) ---");
console.log(d.traefikLogs || "(no logs)");
console.log("");

if (d.verdict === "container_not_serving") {
  console.log(">>> Likely problem: APP/CONTAINER CONFIGURATION");
  console.log("    - Ensure the app listens on 0.0.0.0 (not 127.0.0.1)");
  console.log("    - Port must match Traefik label (e.g. 3000 Node, 80 Nginx)");
  console.log("    - Nginx: root/path and listen port; Node: server.listen(port, '0.0.0.0')");
} else if (d.verdict === "traefik_routing") {
  console.log(">>> Likely problem: TRAEFIK ROUTING");
  console.log("    - Ensure Traefik is on the same Swarm network:", process.env.TRAEFIK_NETWORK ?? "web");
  console.log("    - Check labels: traefik.enable=true, Host(`" + d.expectedHost + "`), server.port=" + d.expectedPort);
  console.log("    - Check Traefik logs above for discovery or connection errors");
} else if (d.verdict === "service_not_found") {
  console.log(">>> Service not deployed or wrong stack name. Deploy first.");
}

process.exit(d.verdict === "ok" ? 0 : 1);
