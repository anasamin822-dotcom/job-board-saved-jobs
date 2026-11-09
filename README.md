# Job board starter

A small job board for an insiderOne work sample. It is made up: the jobs and
companies are not real.

## Run it

You need Node 20 or newer. There are no packages to install.

```
npm start      # then open http://localhost:3000
npm test       # runs the tests in test/
```

## What is here

- `server.js`: the web server. `GET /api/jobs?q=` lists jobs, `GET /` serves the page.
- `lib/jobs.js`: reading and searching the jobs. Pure functions.
- `lib/saved.js`: the saved list - small helpers plus reading and writing the ids file.
- `jobs.json`: the jobs.
- `public/`: the page, its script and a few icons.
- `test/`: tests, using Node's built-in test runner.
- `saved.json`: created on the first save, holds the saved job ids.

## Saved jobs

The work sample task: students wanted to save jobs and come back to them, so I
added that.

- Every job has a **Save** button. Once saved, it turns into a filled "Saved"
  button so you can see at a glance what's already in your list.
- The **Saved jobs** list sits on the same page, under the search. Each saved
  job has a **Remove** button. The count in the top bar always shows how many
  you have.
- Saving is kept on the server in a small file (`saved.json`), so your saved
  jobs are still there after a reload, a new tab, or a server restart. No
  database, per the brief.

The API behind it:

- `POST /api/saved` with `{ "jobId": "j1" }` saves the job and sends back the
  saved list. Save the same job twice and you still get one copy. A job id that
  doesn't exist gets `404 { "error": "No job with id ..." }`, and a body that
  isn't valid JSON (or has no `jobId`) gets a `400` saying what's wrong.
- `GET /api/saved` sends back the saved jobs as full job objects, in the order
  you saved them.
- `DELETE /api/saved/:jobId` removes it and sends back the saved list. Removing
  something that isn't saved is fine - nothing changes.

`npm test` runs the starter's tests plus the new ones in `test/saved.test.js`,
which cover all of the above, including that the list really does survive a
restart.

## One decision, and why

The file only stores the saved **ids**, not copies of the jobs. When you ask
for the saved list, the server looks those ids up in `jobs.json` and sends back
the full jobs. That way the job details live in exactly one place, so a saved
job can never go stale or disagree with the main list, and the file stays tiny.
The cost is one extra lookup per request - nothing at this size.

## The look

The page is laid out like a little workspace app, the way tools like Slack
feel: a sidebar on the left (the board, your saved list, and a Places list
that filters by location), a search bar along the top, and the jobs as cards
in the main area. The colours are a warm champagne base with deep emerald
as the secondary - the green carries the sidebar and buttons, the warm paper
tone keeps it from feeling plain white. Text is dark on light so it reads
easily. On a phone the
sidebar slides in from the side. The little 3D icons are from 3dicons.co,
free for commercial use.

## What I'd do next

- Remember saved jobs per visitor (a cookie, or accounts later) instead of one
  shared list, the moment more than one person uses it.
- A small toast when a job is saved, so the feedback doesn't depend on spotting
  the button change.
- If the job list ever gets long, keep the saved ids in the page instead of
  refetching after every save.

## Tools

AI assistance was used for the saved-jobs feature, tests and page styling.
