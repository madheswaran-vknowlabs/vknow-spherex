const puppeteer = require("puppeteer");
const path = require("path");

const ARTIFACT_DIR = "/home/madheswaran/.gemini/antigravity-cli/brain/e331d161-7249-4aa9-8591-1181e2240a97";

async function capturePhase5() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();
  // High-resolution widescreen viewport (1600x960) to verify zero dead space
  await page.setViewport({ width: 1600, height: 960, deviceScaleFactor: 2 });

  // 1. Sign in as Admin
  console.log("🔑 Logging in as Admin...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle0" });
  const adminBtn = await page.waitForSelector("button::-p-text(Madheswaran)");
  await adminBtn.click();
  await new Promise((r) => setTimeout(r, 200));
  await (await page.waitForSelector("button[type='submit']")).click();
  await page.waitForNavigation({ waitUntil: "networkidle0" });

  // 2. Capture Executive Dashboard (/dashboard)
  console.log("📸 Capturing Executive Portfolio Dashboard...");
  await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "dashboard_executive.png"),
    fullPage: true,
  });

  // 3. Click "Portfolio Gantt Timeline" Tab on Dashboard
  console.log("📸 Capturing Portfolio Gantt Tab on Dashboard...");
  const ganttTab = await page.waitForSelector("button::-p-text(Portfolio Gantt Timeline)");
  if (ganttTab) {
    await ganttTab.click();
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "dashboard_gantt.png"),
      fullPage: true,
    });
  }

  // 4. Click "Team Workload & Hours" Tab on Dashboard
  console.log("📸 Capturing Team Workload Tab on Dashboard...");
  const teamTab = await page.waitForSelector("button::-p-text(Team Workload)");
  if (teamTab) {
    await teamTab.click();
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "dashboard_team_workload.png"),
      fullPage: true,
    });
  }

  // 5. Navigate to Project Details and Open Interactive Gantt Timeline
  console.log("📸 Capturing Project Interactive Frappe Gantt...");
  await page.goto("http://localhost:3000/projects", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 800));
  const projectLink = await page.waitForSelector("a[href^='/projects/']");
  if (projectLink) {
    await projectLink.click();
    await page.waitForNavigation({ waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1000));

    // Click on "Interactive Frappe Gantt Timeline" tab
    const projectGanttBtn = await page.waitForSelector("button::-p-text(Interactive Frappe Gantt Timeline)");
    if (projectGanttBtn) {
      await projectGanttBtn.click();
      await new Promise((r) => setTimeout(r, 1200));
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "project_gantt_view.png"),
        fullPage: true,
      });
    }
  }

  // 6. Capture Project Portfolio Widescreen
  console.log("📸 Capturing Project Portfolio Widescreen...");
  await page.goto("http://localhost:3000/projects", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "portfolio_widescreen.png"),
    fullPage: true,
  });

  await browser.close();
  console.log("🎉 All Phase 5 visual artifacts captured successfully!");
}

capturePhase5().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
