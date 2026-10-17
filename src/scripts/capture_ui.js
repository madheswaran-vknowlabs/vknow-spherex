const puppeteer = require("puppeteer");
const path = require("path");

const ARTIFACT_DIR = "/home/madheswaran/.gemini/antigravity-cli/brain/e331d161-7249-4aa9-8591-1181e2240a97";

async function capture() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // 1. Sign In as Dev Alex Rivera (to show user perspective on My Work)
  console.log("🔑 Logging in as Alex Rivera (Dev)...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle0" });
  const devBtn = await page.waitForSelector("button::-p-text(Alex Rivera)");
  await devBtn.click();
  await new Promise((r) => setTimeout(r, 200));
  const submitBtn = await page.waitForSelector("button[type='submit']");
  await submitBtn.click();
  await page.waitForNavigation({ waitUntil: "networkidle0" });

  // 2. Go to /my-work
  console.log("📸 Capturing My Work Cockpit...");
  await page.goto("http://localhost:3000/my-work", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "my_work_desktop.png"),
    fullPage: true,
  });

  // 3. Open Weekly Update Modal on My Work
  console.log("📸 Opening Fast Weekly Update Modal...");
  const updateBtn = await page.waitForSelector("button::-p-text(Submit Week)");
  if (updateBtn) {
    await updateBtn.click();
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "weekly_update_modal.png"),
      fullPage: false,
    });
  }

  // 4. Capture Mobile View of My Work (iPhone 14 size)
  console.log("📱 Capturing Mobile View of My Work...");
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto("http://localhost:3000/my-work", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "my_work_mobile.png"),
    fullPage: false,
  });

  // 5. Sign Out and Sign in as Admin to capture Compliance View
  console.log("🔑 Logging in as Admin to capture Compliance View...");
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle0" });
  const adminBtn = await page.waitForSelector("button::-p-text(Madheswaran)");
  await adminBtn.click();
  await new Promise((r) => setTimeout(r, 200));
  await (await page.waitForSelector("button[type='submit']")).click();
  await page.waitForNavigation({ waitUntil: "networkidle0" });

  console.log("📸 Capturing Admin Compliance View...");
  await page.goto("http://localhost:3000/admin/compliance", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "admin_compliance.png"),
    fullPage: true,
  });

  await browser.close();
  console.log("✅ Phase 3 screenshots captured successfully!");
}

capture().catch((err) => {
  console.error("❌ Failed to capture:", err);
  process.exit(1);
});
