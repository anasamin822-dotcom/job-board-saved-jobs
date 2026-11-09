const list = document.getElementById("jobs");
const savedList = document.getElementById("saved-list");
const jobsCount = document.getElementById("jobs-count");
const savedCount = document.getElementById("saved-count");
const sideJobsCount = document.getElementById("side-jobs-count");
const sideSavedCount = document.getElementById("side-saved-count");
const places = document.getElementById("places");
const search = document.getElementById("search");

// "Rs 12,000 a month"
function stipendText(job) {
  return `Rs ${job.stipend.toLocaleString("en-IN")} a month`;
}

// One card: the job's details plus a button (Save or Remove).
function jobCard(job, buttonText, buttonClass, onClick, delay) {
  const card = document.createElement("div");
  card.className = "card";
  card.style.animationDelay = `${delay}ms`;

  const title = document.createElement("strong");
  title.textContent = job.title;
  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = `${job.company} · ${job.location}`;
  const stipend = document.createElement("span");
  stipend.className = "stipend";
  stipend.textContent = stipendText(job);
  const button = document.createElement("button");
  button.type = "button";
  button.className = buttonClass;
  button.textContent = buttonText;
  button.addEventListener("click", onClick);

  card.append(title, meta, stipend, button);
  return card;
}

async function showSaved() {
  const res = await fetch("/api/saved");
  const saved = await res.json();
  savedCount.textContent = saved.length ? `${saved.length} saved` : "";
  sideSavedCount.textContent = saved.length;
  savedList.innerHTML = "";
  if (saved.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    const img = document.createElement("img");
    img.src = "/icons/2-notebook.webp";
    img.alt = "";
    const text = document.createElement("div");
    text.textContent = "Nothing saved yet. Tap Save on a job you like.";
    empty.append(img, text);
    savedList.append(empty);
    return;
  }
  saved.forEach((job, i) => {
    savedList.append(
      jobCard(job, "Remove", "remove", async () => {
        await fetch(`/api/saved/${encodeURIComponent(job.id)}`, { method: "DELETE" });
        show(search.value);
        showSaved();
      }, i * 40)
    );
  });
}

async function show(query = "") {
  const [jobsRes, savedRes] = await Promise.all([
    fetch(`/api/jobs?q=${encodeURIComponent(query)}`),
    fetch("/api/saved"),
  ]);
  const jobs = await jobsRes.json();
  const savedIds = new Set((await savedRes.json()).map((j) => j.id));
  jobsCount.textContent = `${jobs.length} role${jobs.length === 1 ? "" : "s"}`;
  sideJobsCount.textContent = jobs.length;
  list.innerHTML = "";
  jobs.forEach((job, i) => {
    const saved = savedIds.has(job.id);
    list.append(
      jobCard(job, saved ? "Saved" : "Save", saved ? "save saved" : "save", async () => {
        if (saved) return;
        await fetch("/api/saved", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jobId: job.id }),
        });
        show(search.value);
        showSaved();
      }, i * 40)
    );
  });
}

// The "Places" list in the sidebar: one entry per location, works as a filter.
async function showPlaces() {
  const res = await fetch("/api/jobs");
  const jobs = await res.json();
  const names = [...new Set(jobs.map((j) => j.location))].sort();
  for (const name of names) {
    const count = jobs.filter((j) => j.location === name).length;
    const item = document.createElement("button");
    item.type = "button";
    item.className = "side-item";
    const label = document.createElement("span");
    label.textContent = name;
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = count;
    item.append(label, pill);
    item.addEventListener("click", () => {
      search.value = name;
      show(name);
      closeNav();
    });
    places.append(item);
  }
}

// Sidebar behaviour: nav items jump to a section, the menu button opens it on phones.
function closeNav() {
  document.body.classList.remove("nav-open");
}
document.getElementById("nav-roles").addEventListener("click", () => {
  search.value = "";
  show("");
  closeNav();
});
document.getElementById("nav-saved").addEventListener("click", () => {
  document.getElementById("saved").scrollIntoView({ behavior: "smooth" });
  closeNav();
});
document.getElementById("menu-btn").addEventListener("click", () => {
  document.body.classList.toggle("nav-open");
});
document.getElementById("overlay").addEventListener("click", closeNav);

search.addEventListener("input", () => show(search.value));
show();
showSaved();
showPlaces();
