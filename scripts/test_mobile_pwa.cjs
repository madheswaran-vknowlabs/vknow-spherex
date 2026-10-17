const puppeteer = require("puppeteer");
const path = require("path");

const ARTIFACT_DIR = "/home/madheswaran/.gemini/antigravity-cli/brain/e331d161-7249-4aa9-8591-1181e2240a97";

async function run() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true }, // iPhone 14 / modern mobile
  });

  try {
    const page = await browser.newPage();

    // 1. Team member login on mobile
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
    await page.type('input[type="email"]', "alex.dev@vknowlabs.com");
    await page.type('input[type="password"]', "password123");
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1500));

    // Capture mobile My Work
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "mobile_my_work_team_member.png"),
      fullPage: false,
    });
    console.log("Saved screenshot: mobile_my_work_team_member.png");

    // Capture mobile My Reports
    await page.goto("http://localhost:3000/my-reports", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1500));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "mobile_my_reports_team_member.png"),
      fullPage: false,
    });
    console.log("Saved screenshot: mobile_my_reports_team_member.png");

    console.log("Mobile PWA screenshots saved successfully!");
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}

run();
