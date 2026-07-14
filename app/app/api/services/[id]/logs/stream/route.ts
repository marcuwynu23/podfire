import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { gatewayFetch } from "@/lib/gateway-auth";

const POLL_MS = 800;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id } = await params;
  const service = await prisma.service.findFirst({
    where: { id, userId },
    select: { stackName: true, name: true },
  });
  if (!service) {
    return new Response("Not found", { status: 404 });
  }
  const stackName = service.stackName ?? service.name;

  let cancelled = false;
  let cursor = -1;

  const stream = new ReadableStream({
    async start(controller) {
      const poll = async () => {
        while (!cancelled) {
          try {
            const params = new URLSearchParams({ stackName, follow: "true" });
            if (cursor >= 0) params.set("cursor", String(cursor));

            const res = await gatewayFetch(
              `/service-logs?${params.toString()}`,
              { cache: "no-store", signal: AbortSignal.timeout(5000) }
            );
            if (cancelled) break;

            const data = (await res.json()) as {
              logs?: string | null;
              lines?: string | null;
              cursor?: number;
              append?: boolean;
              error?: string | null;
            };

            if (!res.ok) {
              if (!cancelled) {
                controller.enqueue(
                  `data: ${JSON.stringify({ error: data.error ?? "Failed to fetch logs", logs: null })}\n\n`
                );
              }
            } else {
              if (data.error) {
                if (!cancelled) {
                  controller.enqueue(
                    `data: ${JSON.stringify({ error: data.error })}\n\n`
                  );
                }
              } else if (data.append && data.lines != null && cursor >= 0) {
                // Delta — append to existing content
                if (data.lines) {
                  if (!cancelled) {
                    controller.enqueue(
                      `data: ${JSON.stringify({ lines: data.lines, append: true })}\n\n`
                    );
                  }
                }
                if (typeof data.cursor === "number") cursor = data.cursor;
              } else if (data.logs != null) {
                // Initial snapshot — replace
                if (!cancelled) {
                  controller.enqueue(
                    `data: ${JSON.stringify({ logs: data.logs, append: false })}\n\n`
                  );
                }
                if (typeof data.cursor === "number") cursor = data.cursor;
              }
            }
          } catch {
            if (!cancelled) {
              controller.enqueue(
                `data: ${JSON.stringify({ error: "Agent gateway not reachable" })}\n\n`
              );
            }
          }
          await new Promise((r) => setTimeout(r, POLL_MS));
        }
        controller.close();
      };
      poll();
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
