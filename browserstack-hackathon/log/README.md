# log

Empty scratch/output folder from the BrowserStack Testathon experiment in the parent directory.

## What's actually here

Nothing but a placeholder. The folder holds a single empty `dummy.txt` (a keeper file so the directory survives in git) and this README. There is no code, config, or captured output in it.

## Why it exists

The BrowserStack automation lives one level up (`../bs-automate-login.js`, `../percy-login.js`, `../browserstack.yml`). Those scripts write their debug artifacts — screenshots and full page dumps — via `path.resolve()`, which drops them into the current working directory, not here. So the debug PNGs and HTML page dumps you'll find in the parent folder were never routed into this `log/` directory.

In short: this was set aside as a place to collect run logs and never got wired up. It's kept for archival tidiness.

## If you want to use it

Point the artifact writer at this folder by changing the parent's `saveDebugArtifacts` to resolve paths against `log/`, e.g. `path.resolve(__dirname, "log", filename)` in `../bs-automate-login.js`.
