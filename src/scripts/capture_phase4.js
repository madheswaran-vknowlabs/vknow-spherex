const puppeteer = require("puppeteer");
const path = require("path");

const ARTIFACT_DIR = "/home/madheswaran/.gemini/antigravity-cli/brain/e331d161-7249-4aa9-8591-1181e2240a97";

async function capturePhase4() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // 1. Sign in as Admin
  console.log("🔑 Logging in as Admin...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle0" });
  const adminBtn = await page.waitForSelector("button::-p-text(Madheswaran)");
  await adminBtn.click();
  await new Promise((r) => setTimeout(r, 200));
  await (await page.waitForSelector("button[type='submit']")).click();
  await page.waitForNavigation({ waitUntil: "networkidle0" });

  // 2. Capture Discrepancies Registry
  console.log("📸 Capturing Discrepancies Registry...");
  await page.goto("http://localhost:3000/discrepancies", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "discrepancies_registry.png"),
    fullPage: true,
  });

  // 3. Open Raise Discrepancy Modal
  console.log("📸 Opening Raise Discrepancy Modal...");
  const raiseBtn = await page.waitForSelector("button::-p-text(Raise Discrepancy)");
  if (raiseBtn) {
    await raiseBtn.click();
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "raise_discrepancy_modal.png"),
      fullPage: false,
    });
    // Close modal
    await page.keyboard.press("Escape");
    await new Promise((r) => setTimeout(r, 400));
  }

  // 4. Capture Project Details with Tracking & Effort Variance Strip
  console.log("📸 Capturing Project Tracking & Effort Variance Cockpit...");
  await page.goto("http://localhost:3000/projects", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 800));
  // Click on first project
  const firstProjectLink = await page.waitForSelector("a[href^='/projects/']");
  if (firstProjectLink) {
    await firstProjectLink.click();
    await page.waitForNavigation({ waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "project_tracking_cockpit.png"),
      fullPage: true,
    });
  }

  // 5. Capture Admin Tracking Thresholds Settings
  console.log("📸 Capturing Admin Tracking Thresholds Settings...");
  await page.goto("http://localhost:3000/admin/settings", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "admin_settings_thresholds.png"),
    fullPage: true,
  });

  // 6. Capture My Work Cockpit with Lag & At-Risk Badges as Alex Rivera (Dev)
  console.log("📸 Logging in as Alex Rivera (Dev) for My Work...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle0" });
  const devBtn = await page.waitForSelector("button::-p-text(Alex Rivera)");
  await devBtn.click();
  await new Promise((r) => setTimeout(r, 200));
  await (await page.waitForSelector("button[type='submit']")).click();
  await page.waitForNavigation({ waitUntil: "networkidle0" });

  await page.goto("http://localhost:3000/my-work", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "my_work_with_lag.png"),
    fullPage: true,
  });

  await browser.close();
  console.log("✅ Phase 4 screenshots captured successfully!");
}

capturePhase4().catch((err) => {
  console.error("❌ Capture failed:", err);
  process.exit(1);
});
