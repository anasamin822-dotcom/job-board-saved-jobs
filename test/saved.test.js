import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server.js";
import { addSaved, removeSaved } from "../lib/saved.js";

let server;
let base;
let dir;
let savedPath;

async function api(path, options) {
  const res = await fetch(`${base}${path}`, options);
  return { status: res.status, body: await res.json() };
}

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "saved-test-"));
  savedPath = join(dir, "saved.json");
  server = createApp({ savedPath });
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://localhost:${server.address().port}`;
});

after(async () => {
  server.close();
  await rm(dir, { recursive: true, force: true });
});

test("addSaved keeps one copy, removeSaved drops the id", () => {
  assert.deepEqual(addSaved([], "j1"), ["j1"]);
  assert.deepEqual(addSaved(["j1"], "j1"), ["j1"]);
  assert.deepEqual(addSaved(["j1"], "j2"), ["j1", "j2"]);
  assert.deepEqual(removeSaved(["j1", "j2"], "j1"), ["j2"]);
  assert.deepEqual(removeSaved(["j1"], "nope"), ["j1"]);
});

test("saved list starts empty", async () => {
  const { status, body } = await api("/api/saved");
  assert.equal(status, 200);
  assert.deepEqual(body, []);
});

test("saving a job stores it and GET returns the full job", async () => {
  const res = await fetch(`${base}/api/saved`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jobId: "j2" }),
  });
  assert.equal(res.status, 200);
  const saved = await res.json();
  assert.deepEqual(saved.map((j) => j.id), ["j2"]);
  assert.equal(saved[0].company, "Kite Learning"); // full job object, not just the id

  const { body } = await api("/api/saved");
  assert.deepEqual(body.map((j) => j.id), ["j2"]);
});

test("saving the same job twice keeps one copy", async () => {
  for (const _ of [1, 2]) {
    await fetch(`${base}/api/saved`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId: "j5" }),
    });
  }
  const { body } = await api("/api/saved");
  assert.deepEqual(body.map((j) => j.id), ["j2", "j5"]);
});

test("an unknown job id gets a clear 404 error, not a crash", async () => {
  const res = await fetch(`${base}/api/saved`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jobId: "nope" }),
  });
  assert.equal(res.status, 404);
  const { error } = await res.json();
  assert.match(error, /no job with id "nope"/i);

  // nothing was added
  const { body } = await api("/api/saved");
  assert.deepEqual(body.map((j) => j.id), ["j2", "j5"]);
});

test("a missing jobId gets a clear 400 error", async () => {
  const res = await fetch(`${base}/api/saved`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 400);
  const { error } = await res.json();
  assert.match(error, /jobId/);
});

test("an invalid JSON body gets a clear 400 error", async () => {
  const res = await fetch(`${base}/api/saved`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "not json",
  });
  assert.equal(res.status, 400);
  const { error } = await res.json();
  assert.match(error, /json/i);
});

test("saved jobs are written to the JSON file and survive a restart", async () => {
  const onDisk = JSON.parse(await readFile(savedPath, "utf8"));
  assert.deepEqual(onDisk, ["j2", "j5"]);

  // a fresh server over the same file sees the same saved jobs
  const again = createApp({ savedPath });
  await new Promise((resolve) => again.listen(0, resolve));
  const res = await fetch(`http://localhost:${again.address().port}/api/saved`);
  assert.deepEqual((await res.json()).map((j) => j.id), ["j2", "j5"]);
  again.close();
});

test("DELETE removes a saved job; removing it again still works", async () => {
  const res = await fetch(`${base}/api/saved/j2`, { method: "DELETE" });
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).map((j) => j.id), ["j5"]);

  const { body } = await api("/api/saved");
  assert.deepEqual(body.map((j) => j.id), ["j5"]);

  // idempotent: removing a job that is not saved is not an error
  const res2 = await fetch(`${base}/api/saved/j2`, { method: "DELETE" });
  assert.equal(res2.status, 200);
  assert.deepEqual((await res2.json()).map((j) => j.id), ["j5"]);
});
