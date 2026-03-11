/**
 * Diagnose a deployed Swarm service: container reachability and Traefik routing.
 * Outputs clear diagnostics for app/container config vs Traefik routing issues.
 */
import * as http from "http";
import { sanitizeForDocker } from "./docker";
import { runCommand, formatOutput } from "./run-command";

const NETWORK = process.env.TRAEFIK_NETWORK ?? "web";
const TRAEFIK_SERVICE = "traefik_traefik"; // stack "traefik", service "traefik"
const TRAEFIK_HTTP_PORT = parseInt(process.env.TRAEFIK_HTTP_PORT ?? "80", 10) || 80;
const CURL_IMAGE = "curlimages/curl:latest";

export type DiagnosticVerdict =
  | "ok"
  | "container_not_serving"   // app/container config: not listening or wrong port
  | "traefik_routing"        // Traefik not discovering or wrong Host/port
  | "service_not_found"      // stack/service missing
  | "unknown";

export type ServiceDiagnostics = {
  stackName: string;
  serviceName: string;       // e.g. myapp_app
  expectedPort: number;
  expectedHost: string;      // e.g. myapp.localhost
  /** Service exists and has running tasks */
  serviceExists: boolean;
  serviceTasksSummary: string;
  /** Raw inspect (truncated) */
  serviceInspectSnippet: string;
  /** Curl from a container on same network to service:port */
  containerReachable: boolean;
  containerHttpStatus: number | null;  // e.g. 200, 404, or 0 if connection failed
  containerCurlError: string | null;
  /** Traefik logs (tail) */
  traefikLogs: string;
  /** Traefik discovered this service (from logs or we'd need API) */
  traefikMentionsService: boolean;
  verdict: DiagnosticVerdict;
  summary: string;
};

function run(cmd: string): { success: boolean; out: string } {
  const r = runCommand(cmd);
  const out = [r.stdout, r.stderr].filter(Boolean).join("\n").trim();
  return { success: r.success, out };
}

/** Fetch HTTP status from host:port (optional Host header for Traefik routing). */
function fetchStatusFromHost(
  port: number,
  timeoutMs: number = 10000,
  host: string = "127.0.0.1",
  hostHeader?: string
): Promise<{ statusCode: number } | { error: string }> {
  return new Promise((resolve) => {
    const opts: http.RequestOptions = {
      hostname: host,
      port,
      path: "/",
      method: "GET",
      timeout: timeoutMs,
    };
    if (hostHeader) opts.headers = { Host: hostHeader };
    const req = http.get(opts, (res) => {
      resolve({ statusCode: res.statusCode ?? 0 });
      res.destroy();
    });
    req.on("error", (err) => resolve({ error: err.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ error: "timeout" });
    });
  });
}

/** Probe app via Traefik: GET http://localhost:80 with Host: expectedHost (e.g. test.localhost). */
function fetchViaTraefik(
  expectedHost: string,
  timeoutMs: number = 10000
): Promise<{ statusCode: number } | { error: string }> {
  return fetchStatusFromHost(TRAEFIK_HTTP_PORT, timeoutMs, "127.0.0.1", expectedHost);
}

/** Get published port for the service (from Swarm inspect). Returns 0 if none. */
function getPublishedPort(serviceName: string): number {
  const portOut = run(
    `docker service inspect ${serviceName} --format "{{json .Endpoint.Ports}}" 2>&1`
  );
  try {
    const raw = portOut.out.trim();
    const ports = raw ? (JSON.parse(raw) as Array<{ PublishedPort?: number }>) : [];
    const first = Array.isArray(ports) && ports.length > 0 ? ports[0] : null;
    if (first && typeof first.PublishedPort === "number" && first.PublishedPort > 0 && first.PublishedPort <= 65535) {
      return first.PublishedPort;
    }
  } catch {
    // ignore
  }
  return 0;
}

export async function runServiceDiagnostics(
  stackName: string,
  containerPort: number,
  domain?: string | null
): Promise<ServiceDiagnostics> {
  const safe = sanitizeForDocker(stackName);
  const serviceName = `${safe}_app`;
  const expectedHost = domain?.trim() ? `${safe}.${domain.trim()}` : `${safe}.localhost`;

  const result: ServiceDiagnostics = {
    stackName,
    serviceName,
    expectedPort: containerPort,
    expectedHost,
    serviceExists: false,
    serviceTasksSummary: "",
    serviceInspectSnippet: "",
    containerReachable: false,
    containerHttpStatus: null,
    containerCurlError: null,
    traefikLogs: "",
    traefikMentionsService: false,
    verdict: "unknown",
    summary: "",
  };

  // 1. Service exists and tasks
  const ps = run(`docker service ps ${serviceName} --no-trunc 2>&1`);
  if (!ps.success && (ps.out.includes("nothing found") || ps.out.includes("No such service"))) {
    result.serviceTasksSummary = "Service not found (stack may not be deployed or name mismatch).";
    result.verdict = "service_not_found";
    result.summary = `Service ${serviceName} not found. Deploy the stack first.`;
    return result;
  }
  result.serviceExists = true;
  result.serviceTasksSummary = ps.out.slice(0, 1500) || "(no tasks)";

  // Inspect (labels, port config)
  const inspect = run(`docker service inspect ${serviceName} --format "{{json .Spec.Endpoint.Ports}}" 2>&1`);
  const inspectFull = run(`docker service inspect ${serviceName} 2>&1`);
  result.serviceInspectSnippet = inspectFull.out.slice(0, 2000) || "(no inspect)";

  // 2. Verify app is reachable: probe via Traefik (curl -H "Host: <domain>" http://localhost:80)
  //    This works without attaching to the overlay network and matches how users access the app.
  let code: number | null = null;
  let probeNote: string | null = null;

  let traefikProbe = await fetchViaTraefik(expectedHost, 10000);
  if ("error" in traefikProbe) {
    traefikProbe = await fetchStatusFromHost(TRAEFIK_HTTP_PORT, 10000, "host.docker.internal", expectedHost);
    if ("statusCode" in traefikProbe) probeNote = "Reached via host.docker.internal (127.0.0.1 failed). ";
  }
  if ("statusCode" in traefikProbe && traefikProbe.statusCode > 0) {
    code = traefikProbe.statusCode;
    result.containerReachable = true;
    result.containerHttpStatus = code;
    result.containerCurlError = null;
  }

  // Fallback: in-network curl (only when overlay is attachable; often fails with "not manually attachable")
  if (code === null) {
    const curlUrl = `http://${serviceName}:${containerPort}/`;
    const curlCmd = `docker run --rm --network ${NETWORK} ${CURL_IMAGE} -s -o /dev/null -w "%{http_code}" --connect-timeout 8 --max-time 15 "${curlUrl}" 2>&1`;
    const curlOut = run(curlCmd).out.trim();
    const statusMatch = curlOut.match(/^\d{3}$/);
    code = statusMatch ? parseInt(statusMatch[0], 10) : null;
    const inNetworkOk = code !== null && code !== 0;

    if (inNetworkOk) {
      result.containerHttpStatus = code;
      result.containerReachable = true;
      result.containerCurlError = null;
    } else {
      result.containerReachable = false;
      result.containerHttpStatus = code;
      const traefikErr = "Traefik probe failed (GET http://localhost:" + TRAEFIK_HTTP_PORT + " with Host: " + expectedHost + "). ";
      result.containerCurlError =
        traefikErr +
        (curlOut.includes("not manually attachable")
          ? "In-network curl skipped (overlay network '" + NETWORK + "' is not attachable from this host)."
          : (curlOut.slice(0, 350) || "In-network curl failed."));
    }
  }

  // 3. Traefik logs
  const traefikLogsResult = run(`docker service logs ${TRAEFIK_SERVICE} --tail 80 2>&1`);
  result.traefikLogs = traefikLogsResult.out.slice(0, 4000) || "(Traefik not running or no logs)";
  result.traefikMentionsService =
    result.traefikLogs.includes(safe) ||
    result.traefikLogs.includes(serviceName) ||
    result.traefikLogs.includes(expectedHost);

  // 4. Verdict and summary (expected port = Traefik loadbalancer.server.port, default 80)
  if (!result.containerReachable) {
    result.verdict = "container_not_serving";
    result.summary =
      `Container is not responding on port ${containerPort} (Traefik label port). Check: (1) App listens on 0.0.0.0 (not 127.0.0.1). (2) App listens on the same port as the service config (default 80). (3) Server is bound to that port and correct root/proxy.`;
  } else if (!result.traefikMentionsService && result.traefikLogs.length > 0) {
    result.verdict = "traefik_routing";
    result.summary =
      "Container responds to direct curl, but Traefik may not have discovered the service or Host header may not match. Check Traefik logs above; ensure labels (traefik.enable, Host rule, loadbalancer.server.port) match and Traefik is on the same Swarm network.";
  } else if (result.containerReachable && (result.containerHttpStatus === 200 || result.containerHttpStatus === 304)) {
    result.verdict = "ok";
    result.summary = `Reached via Traefik (curl -H "Host: ${expectedHost}" http://localhost:${TRAEFIK_HTTP_PORT}). Open http://${expectedHost} in the browser.`;
  } else if (result.containerReachable) {
    result.verdict = "ok";
    result.summary =
      `Reached via Traefik: HTTP ${result.containerHttpStatus}. Open http://${expectedHost}. For 2xx on /, check app root or server config.`;
  } else {
    result.verdict = "traefik_routing";
    result.summary =
      `Could not reach container on port ${containerPort}. Ensure the service is on network '${NETWORK}', Traefik label loadbalancer.server.port=${containerPort}, and the app listens on 0.0.0.0:${containerPort}.`;
  }

  return result;
}
