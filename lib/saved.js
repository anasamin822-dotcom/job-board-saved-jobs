// The saved list: tiny helpers, plus reading and writing the ids file.
// Same idea as lib/jobs.js - plain functions, nothing clever.
import { readFile, writeFile } from "node:fs/promises";

// Adds the id if it isn't saved yet. Saving twice keeps one copy.
export function addSaved(savedIds, jobId) {
  return savedIds.includes(jobId) ? savedIds : [...savedIds, jobId];
}

// Drops the id. If it wasn't saved, nothing changes.
export function removeSaved(savedIds, jobId) {
  return savedIds.filter((id) => id !== jobId);
}

// Reads the saved ids. No file yet just means nothing has been saved.
export async function loadSavedIds(path) {
  try {
    const ids = JSON.parse(await readFile(path, "utf8"));
    return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

// Writes the saved ids back to the file.
export async function storeSavedIds(path, savedIds) {
  await writeFile(path, JSON.stringify(savedIds, null, 2) + "\n", "utf8");
}
