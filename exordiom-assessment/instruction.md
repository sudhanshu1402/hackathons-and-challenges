# Task: Fix Order Processor Microservice bugs

Hey! We have an issue with the new async order processing microservice (`/app/src/main.py`). The team recently did a refactor and it introduced a few regressions that we need your help to fix.

Here's the problem report from QA:
1. **Startup Crash**: The service frequently throws an import or attribute error right when trying to boot up via `python src/main.py`. It looks like some modules might be stepping on each other's toes.
2. **Overselling Inventory**: We ran a modest concurrency load test and noticed our laptop stock dipped below zero. The inventory tracking system isn't handling concurrent traffic safely.
3. **Hung Workers / Zombie Process**: When the producer encounters a bad order or crashes, the background worker tasks seem to just hang forever instead of shutting down cleanly. We have to manually `kill` the process.

**Your Goal**:
Dive into `/app/src/` and patch these issues so the microservice boots, scales, and handles failures gracefully. We have an automated test suite verifying correctness, preventing overselling, and ensuring clean shutdown.

*Notes:
- You can run the code locally with `python src/main.py` in the `/app` directory.
- Please stick to fixing the existing architecture-don't rewrite the whole thing.
- All your edits must be in the `/app/src/` folder.*
