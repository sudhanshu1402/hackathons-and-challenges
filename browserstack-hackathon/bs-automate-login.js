// bs-automate-login.js
// Run: export BROWSERSTACK_USERNAME=... && export BROWSERSTACK_ACCESS_KEY=... && node bs-automate-login.js

const { Builder, By, until } = require("selenium-webdriver");
const fs = require("fs");
const path = require("path");

const BASE_URL = "https://ecommercebs.vercel.app/";
const TIMEOUT = 20000; // Increased for cloud latency
const HYDRATION_WAIT = 3000; // Critical for SPA readiness

function ts() {
    return new Date().toISOString().replace(/[:.]/g, "-");
}

async function saveDebugArtifacts(driver, prefix = "bs-debug") {
    try {
        const screenshotBase64 = await driver.takeScreenshot();
        const pngPath = path.resolve(`${prefix}-screenshot-${ts()}.png`);
        fs.writeFileSync(pngPath, screenshotBase64, "base64");

        const pageSource = await driver.getPageSource();
        const htmlPath = path.resolve(`${prefix}-pagedump-${ts()}.html`);
        fs.writeFileSync(htmlPath, pageSource, "utf8");

        console.log(`📸 Debug artifacts: ${pngPath}, ${htmlPath}`);
    } catch (err) {
        console.warn("⚠️  Failed to save artifacts:", err.message);
    }
}

// Wait for network idle (no pending requests for N ms)
async function waitForNetworkIdle(driver, idleTime = 1500) {
    await driver.executeAsyncScript(function (idleMs, callback) {
        let timeout;
        const pendingRequests = new Set();

        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (...args) {
            pendingRequests.add(this);
            return originalOpen.apply(this, args);
        };

        XMLHttpRequest.prototype.send = function (...args) {
            const xhr = this;
            xhr.addEventListener('loadend', () => {
                pendingRequests.delete(xhr);
                checkIdle();
            });
            return originalSend.apply(this, args);
        };

        function checkIdle() {
            clearTimeout(timeout);
            if (pendingRequests.size === 0) {
                timeout = setTimeout(() => callback(), idleMs);
            }
        }

        checkIdle();
    }, idleTime);
}

// Robust click with retry logic
async function clickElement(driver, selector, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const el = selector.startsWith("//") || selector.startsWith("/html")
                ? await driver.findElement(By.xpath(selector))
                : await driver.findElement(By.css(selector));

            // Ensure element is in viewport and clickable
            await driver.executeScript(`
        arguments[0].scrollIntoView({block: 'center', behavior: 'instant'});
      `, el);

            await driver.sleep(200);

            // Try native click first (respects event handlers)
            try {
                await driver.wait(until.elementIsVisible(el), 2000);
                await driver.wait(until.elementIsEnabled(el), 2000);
                await el.click();
                return true;
            } catch (nativeErr) {
                // Fallback to JS click
                await driver.executeScript("arguments[0].click();", el);
                return true;
            }
        } catch (err) {
            if (i === maxRetries - 1) throw err;
            await driver.sleep(500 * (i + 1)); // Exponential backoff
        }
    }
    return false;
}

(async function run() {
    const caps = {
        browserName: "chrome",
        browserVersion: "latest",
        "bstack:options": {
            os: "Windows",
            osVersion: "11",
            projectName: "FashionStack Testathon",
            buildName: process.env.BROWSERSTACK_BUILD_ID || "Automate Build",
            sessionName: "Login Flow - Hardened",
            userName: process.env.BROWSERSTACK_USERNAME,
            accessKey: process.env.BROWSERSTACK_ACCESS_KEY,
            debug: true,
            networkLogs: true,
            video: true,
            consoleLogs: "verbose"
        }
    };

    let driver;
    try {
        console.log("🚀 Initializing BrowserStack session...");
        driver = await new Builder()
            .usingServer("https://hub.browserstack.com/wd/hub")
            .withCapabilities(caps)
            .build();

        console.log("📡 Loading homepage...");
        await driver.get(BASE_URL);
        await driver.wait(until.elementLocated(By.css("body")), TIMEOUT);

        // CRITICAL: Wait for React hydration
        console.log("⏳ Waiting for SPA hydration...");
        await driver.sleep(HYDRATION_WAIT);

        // Wait for network idle (all API calls complete)
        try {
            await waitForNetworkIdle(driver, 1500);
            console.log("✅ Network idle detected");
        } catch (err) {
            console.warn("⚠️  Network idle check failed, proceeding anyway");
        }

        // Dismiss any overlays (cookie consent, popups, etc.)
        const overlaySelectors = [
            "button[aria-label*='close' i]",
            "button[aria-label*='dismiss' i]",
            ".cookie-accept",
            ".cookie-close",
            "[data-testid='close-modal']",
            ".modal-close"
        ];

        for (const sel of overlaySelectors) {
            try {
                await clickElement(driver, sel);
                console.log(`🗑️  Dismissed overlay: ${sel}`);
                await driver.sleep(300);
                break;
            } catch (_) { }
        }

        // Priority-ordered login selectors (BUTTON parent, not SPAN child)
        const loginSelectors = [
            "button#login",                                    // ID selector (highest priority) ✓
            "/html/body/div/div/header/div[2]/div/div/div[3]/button[1]", // XPath to BUTTON ✓
            "button[data-testid='login']",                     // Test ID
            "a[href='/login']",                                // Direct route link
            "header button:nth-of-type(1)",                    // Structural fallback
            "//button[contains(normalize-space(.), 'Login')]", // XPath text match
            "//a[contains(@href, 'login')]"                    // Loose href match
        ];

        let clicked = false;
        console.log("🔍 Attempting login click...");

        for (const sel of loginSelectors) {
            try {
                await clickElement(driver, sel);
                console.log(`✅ Clicked login via: ${sel}`);
                clicked = true;
                break;
            } catch (err) {
                // Selector failed, try next
            }
        }

        // Final fallback: JS-based text search (most robust)
        if (!clicked) {
            console.log("⚙️  Trying JS text search fallback...");
            const didClick = await driver.executeScript(function () {
                const candidates = Array.from(document.querySelectorAll("a, button, div[role='button'], span[role='button']"));
                const matchRegex = /\b(login|sign[\s-]?in)\b/i;

                for (const el of candidates) {
                    const text = (el.innerText || el.textContent || "").trim();
                    if (!matchRegex.test(text)) continue;

                    // Visibility check
                    const rect = el.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0) continue;
                    if (window.getComputedStyle(el).visibility === 'hidden') continue;
                    if (window.getComputedStyle(el).display === 'none') continue;

                    el.scrollIntoView({ block: "center", behavior: "instant" });
                    el.click();
                    return true;
                }
                return false;
            });

            if (didClick) {
                console.log("✅ Clicked via JS text search");
                clicked = true;
            }
        }

        if (!clicked) {
            console.error("❌ Login button not found after exhaustive search");
            await saveDebugArtifacts(driver, "bs-debug");
            throw new Error("Login click failed (element not found or not interactive)");
        }

        // Wait for navigation or modal
        console.log("⏳ Waiting for login form...");
        try {
            await driver.wait(async () => {
                const url = await driver.getCurrentUrl();
                const hasForm = await driver.findElements(By.css("input[type='email'], input[name='email'], #email"));
                return url.includes("/login") || hasForm.length > 0;
            }, TIMEOUT);

            // Additional wait for form elements to be interactive
            await driver.wait(
                until.elementLocated(By.css("input[type='email'], input[name='email'], #email")),
                TIMEOUT
            );

            console.log("✅ Login form detected and interactive");
        } catch (err) {
            console.error("❌ Login form timeout");
            await saveDebugArtifacts(driver, "bs-debug");
            throw new Error("Login form did not appear within timeout");
        }

        // Verify form is actually interactive (not just visible)
        const emailInput = await driver.findElement(By.css("input[type='email'], input[name='email'], #email"));
        await driver.wait(until.elementIsEnabled(emailInput), 3000);

        console.log("\n🎯 SUCCESS: Login flow validated on BrowserStack");
        console.log(`📊 Session: https://automate.browserstack.com/dashboard/v2/builds/${process.env.BROWSERSTACK_BUILD_ID || 'latest'}`);

    } catch (err) {
        console.error("\n❌ Script error:", err.message);
        if (driver) {
            try {
                await saveDebugArtifacts(driver, "bs-debug");
            } catch (_) { }
        }
        throw err;
    } finally {
        if (driver) {
            try {
                await driver.quit();
            } catch (_) { }
        }
    }
})();
