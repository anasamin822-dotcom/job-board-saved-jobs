// A small job board: a JSON API and one page. Run with `npm start`.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { loadJobs, searchJobs, findJob } from "./lib/jobs.js";
import { addSaved, removeSaved, loadSavedIds, storeSavedIds } from "./lib/saved.js";

const PORT = Number(process.env.PORT ?? 3000);
const MAX_BODY = 10_000; // bytes - way more than { "jobId": "j1" } needs

const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  "content-security-policy": "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'",
};

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...SECURITY_HEADERS });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > MAX_BODY) return { error: "Request body too large" };
  }
  try {
    return { data: JSON.parse(body) };
  } catch {
    return { error: "Body must be valid JSON" };
  }
}

export function createApp(options = {}) {
  const savedPath = options.savedPath ?? new URL("./saved.json", import.meta.url);

  // The saved ids joined with the job list, so callers get full jobs back.
  async function savedJobs() {
    const [jobs, ids] = await Promise.all([loadJobs(), loadSavedIds(savedPath)]);
    return ids.map((id) => findJob(jobs, id)).filter(Boolean);
  }

  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");

      if (req.method === "GET" && url.pathname === "/api/jobs") {
        const jobs = await loadJobs();
        return sendJson(res, 200, searchJobs(jobs, url.searchParams.get("q")));
      }

      if (req.method === "GET" && url.pathname === "/api/saved") {
        return sendJson(res, 200, await savedJobs());
      }

      if (req.method === "POST" && url.pathname === "/api/saved") {
        const { data, error } = await readJsonBody(req);
        if (error) return sendJson(res, 400, { error });
        const jobId = data?.jobId;
        if (typeof jobId !== "string" || !jobId) {
          return sendJson(res, 400, { error: 'Body must be JSON like { "jobId": "j1" }' });
        }
        const jobs = await loadJobs();
        if (!findJob(jobs, jobId)) {
          return sendJson(res, 404, { error: `No job with id "${jobId}"` });
        }
        const ids = addSaved(await loadSavedIds(savedPath), jobId);
        await storeSavedIds(savedPath, ids);
        return sendJson(res, 200, await savedJobs());
      }

      const savedMatch = url.pathname.match(/^\/api\/saved\/([^/]+)$/);
      if (req.method === "DELETE" && savedMatch) {
        const jobId = decodeURIComponent(savedMatch[1]);
        const ids = removeSaved(await loadSavedIds(savedPath), jobId);
        await storeSavedIds(savedPath, ids);
        return sendJson(res, 200, await savedJobs());
      }

      // The page itself: the HTML, its script and a few icons. Nothing else is served.
      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/app.js")) {
        const file = url.pathname === "/" ? "index.html" : "app.js";
        const type = file.endsWith(".html") ? "text/html" : "text/javascript";
        const body = await readFile(new URL(`./public/${file}`, import.meta.url));
        res.writeHead(200, { "content-type": `${type}; charset=utf-8`, ...SECURITY_HEADERS });
        return res.end(body);
      }

      if (req.method === "GET" && url.pathname.startsWith("/icons/")) {
        const name = url.pathname.slice("/icons/".length);
        if (!/^[a-z0-9-]+\.webp$/.test(name)) return sendJson(res, 404, { error: "Not found" });
        const body = await readFile(new URL(`./public/icons/${name}`, import.meta.url));
        res.writeHead(200, { "content-type": "image/webp", ...SECURITY_HEADERS });
        return res.end(body);
      }

      sendJson(res, 404, { error: "Not found" });
    } catch (err) {
      console.error(err);
      sendJson(res, 500, { error: "Something went wrong" });
    }
  });
}

// Started directly (npm start), not imported by a test.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createApp().listen(PORT, () => console.log(`Job board on http://localhost:${PORT}`));
}
