// percy-login.js - Fixed click target
const { Builder, By, until } = require("selenium-webdriver");
const percySnapshot = require("@percy/selenium-webdriver");

const BASE_URL = "https://ecommercebs.vercel.app";
const TIMEOUT = 12000;

(async function run() {
    let driver;

    try {
        driver = await new Builder().forBrowser("chrome").build();
        await driver.manage().setTimeouts({
            implicit: 5000,
            pageLoad: 20000,
            script: 10000
        });

        try {
            await driver.manage().window().setRect({ width: 1280, height: 800 });
        } catch (_) { }

        console.log("🚀 Loading homepage...");
        await driver.get(BASE_URL);
        await driver.wait(until.elementLocated(By.css("body")), TIMEOUT);
        await driver.sleep(2000);

        console.log("✓ Homepage loaded, searching for login button...");

        // Click the BUTTON, not the span
        const loginSelectors = [
            "#login",  // The button itself (parent of span)
            "button#login",
            "/html/body/div/div/header/div[2]/div/div/div[3]/button[1]", // XPath to button
            "a[href='/login']",
            "//button[contains(., 'Login')]",
            "//a[@href='/login']"
        ];

        let clicked = false;
        for (const selector of loginSelectors) {
            try {
                const el = selector.startsWith("//") || selector.startsWith("/html")
                    ? await driver.findElement(By.xpath(selector))
                    : await driver.findElement(By.css(selector));

                await driver.wait(until.elementIsVisible(el), 3000);
                await driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", el);
                await driver.sleep(300);

                // JS click fallback (more reliable for SPA routing)
                await driver.executeScript("arguments[0].click();", el);
                clicked = true;
                console.log(`✓ Login clicked via: ${selector}`);
                break;
            } catch (_) { }
        }

        if (!clicked) throw new Error("Login button not found");

        // Wait for URL change OR login form
        await driver.wait(async () => {
            const url = await driver.getCurrentUrl();
            return url.includes("/login");
        }, TIMEOUT);

        console.log("✓ Navigated to login page");

        // Wait for form elements
        await driver.wait(
            until.elementLocated(By.css("input[type='email'], input[name='email'], #email")),
            TIMEOUT
        );

        await driver.sleep(1500);

        // Baseline snapshot
        await percySnapshot(driver, "Login-Baseline");
        console.log("📸 Baseline captured");

        // Toggle button
        const toggleSelectors = [
            "#toggleTheme",
            "button#toggleTheme",
            "[data-testid='toggle']",
            "//button[@id='toggleTheme']"
        ];

        let toggled = false;
        for (const selector of toggleSelectors) {
            try {
                const el = selector.startsWith("//")
                    ? await driver.findElement(By.xpath(selector))
                    : await driver.findElement(By.css(selector));

                await driver.wait(until.elementIsVisible(el), 2000);
                await driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", el);
                await driver.sleep(300);
                await driver.executeScript("arguments[0].click();", el);
                toggled = true;
                console.log("✓ Toggle clicked");
                break;
            } catch (_) { }
        }

        if (!toggled) console.warn("⚠ Toggle not found");

        await driver.sleep(1000);

        // Changed snapshot
        await percySnapshot(driver, "Login-Changed");
        console.log("📸 Changed state captured");

        await driver.quit();
        console.log("\n🎯 Mission complete");
        process.exit(0);

    } catch (e) {
        console.error("\n❌ Error:", e.message);
        if (driver) {
            try {
                const url = await driver.getCurrentUrl();
                const title = await driver.getTitle();
                console.error("Current URL:", url);
                console.error("Page title:", title);
            } catch (_) { }
            try { await driver.quit(); } catch (_) { }
        }
        process.exit(1);
    }
})();
