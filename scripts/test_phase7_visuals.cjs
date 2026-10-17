const puppeteer = require("puppeteer");
const path = require("path");

const ARTIFACT_DIR = "/home/madheswaran/.gemini/antigravity-cli/brain/e331d161-7249-4aa9-8591-1181e2240a97";

async function run() {
  console.log("=== Capturing Phase 7 Visuals ===");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1440, height: 900 },
  });

  try {
    const page = await browser.newPage();

    // 1. Login as Alex Dev (regular user) who received the weekly reminder & task notifications
    console.log("Logging in as Alex Dev...");
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
    await page.type('input[type="email"]', "alex.dev@vknowlabs.com");
    await page.type('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1500));

    // Click the Notification Bell to open the floating panel
    console.log("Opening Notification Bell...");
    await page.click('button[title="Notifications"]');
    await new Promise((r) => setTimeout(r, 1000));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "notification_center_open.png"),
      fullPage: false,
    });
    console.log("Saved screenshot: notification_center_open.png");

    // Close notifications panel by clicking bell again
    await page.click('button[title="Notifications"]');
    await new Promise((r) => setTimeout(r, 500));

    // 2. Login as Admin to demonstrate CoolDropdown on Team Reports (/reports)
    console.log("\nLogging in as Admin for CoolDropdown capture...");
    const client = await page.target().createCDPSession();
    await client.send("Network.clearBrowserCookies");

    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
    await page.type('input[type="email"]', "admin@vknowlabs.com");
    await page.type('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    // Navigate to /reports
    await page.goto("http://localhost:3000/reports", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1500));

    // Click the "Project" CoolDropdown to open its cool floating menu
    console.log("Opening Project CoolDropdown...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const projectDropdown = btns.find((b) => b.textContent && b.textContent.includes("PROJECT:"));
      if (projectDropdown) projectDropdown.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "cool_dropdown_open.png"),
      fullPage: false,
    });
    console.log("Saved screenshot: cool_dropdown_open.png");

    console.log("\n=== ALL VISUAL CAPTURES COMPLETED ===");
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}

run();
