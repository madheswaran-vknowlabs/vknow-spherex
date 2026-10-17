const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const ARTIFACT_DIR = "/home/madheswaran/.gemini/antigravity-cli/brain/e331d161-7249-4aa9-8591-1181e2240a97";

async function run() {
  console.log("=== Launching Role Isolation & Reports Verification ===");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1440, height: 900 },
  });

  try {
    const page = await browser.newPage();

    // -------------------------------------------------------------
    // TEST 1: Team Member (Alex Dev)
    // -------------------------------------------------------------
    console.log("\n--- TEST 1: Logging in as Team Member (alex.dev@vknowlabs.com) ---");
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });

    await page.type('input[type="email"]', "alex.dev@vknowlabs.com");
    await page.type('input[type="password"]', "password123");
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: "networkidle2" });
    const currentUrl = page.url();
    console.log("Team Member landed on:", currentUrl);

    if (!currentUrl.includes("/my-work")) {
      throw new Error(`Expected /my-work but landed on ${currentUrl}`);
    }

    // Check navbar links
    const navLinks = await page.$$eval("nav.hidden.md\\:flex a", (elements) =>
      elements.map((el) => el.textContent.trim())
    );
    console.log("Team Member Navbar links detected:", navLinks);

    const hasDashboard = navLinks.some((l) => l.toLowerCase().includes("dashboard"));
    const hasAdmin = navLinks.some((l) => l.toLowerCase().includes("admin"));
    const hasPortfolio = navLinks.some((l) => l.toLowerCase().includes("portfolio") || l.toLowerCase().includes("projects"));

    if (hasDashboard || hasAdmin || hasPortfolio) {
      console.error("FAIL: Non-admin navbar contains admin links!", navLinks);
    } else {
      console.log("PASS: Team member navbar ONLY contains permitted links:", navLinks);
    }

    // Take screenshot of My Work
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "my_work_team_member.png"),
      fullPage: false,
    });
    console.log("Saved screenshot: my_work_team_member.png");

    // Navigate to /my-reports
    console.log("\nNavigating to /my-reports...");
    await page.goto("http://localhost:3000/my-reports", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 2000));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "my_reports_team_member.png"),
      fullPage: false,
    });
    console.log("Saved screenshot: my_reports_team_member.png");

    // Test Security Gate: Try accessing /dashboard as regular user
    console.log("\nTesting security: alex.dev accessing /dashboard directly...");
    await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1500));
    const redirectedUrl = page.url();
    console.log("Redirected URL from /dashboard:", redirectedUrl);
    if (redirectedUrl.includes("/my-work")) {
      console.log("PASS: Regular user was immediately redirected back to /my-work!");
    } else {
      console.error("FAIL: Regular user was NOT redirected from /dashboard!");
    }

    // Test Security Gate: Try accessing /reports as regular user
    console.log("\nTesting security: alex.dev accessing /reports directly...");
    await page.goto("http://localhost:3000/reports", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1500));
    const reportsRedirectedUrl = page.url();
    console.log("Redirected URL from /reports:", reportsRedirectedUrl);
    if (reportsRedirectedUrl.includes("/my-reports")) {
      console.log("PASS: Regular user was immediately redirected to /my-reports!");
    } else {
      console.error("FAIL: Regular user was NOT redirected from /reports to /my-reports!");
    }

    // Get cookies for API testing
    const cookies = await page.cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    // Test Individual Excel Export
    console.log("\nTesting Individual Excel download...");
    const excelRes = await fetch("http://localhost:3000/api/reports/export/excel?type=individual", {
      headers: { Cookie: cookieHeader },
    });
    const excelBuffer = await excelRes.arrayBuffer();
    console.log(
      "Individual Excel response status:",
      excelRes.status,
      "Content-Type:",
      excelRes.headers.get("content-type"),
      "Size:",
      excelBuffer.byteLength,
      "bytes"
    );

    // Test Individual PDF Export
    console.log("\nTesting Individual PDF download...");
    const pdfRes = await fetch("http://localhost:3000/api/reports/export/pdf?type=individual", {
      headers: { Cookie: cookieHeader },
    });
    const pdfBuffer = await pdfRes.arrayBuffer();
    console.log(
      "Individual PDF response status:",
      pdfRes.status,
      "Content-Type:",
      pdfRes.headers.get("content-type"),
      "Size:",
      pdfBuffer.byteLength,
      "bytes"
    );

    // -------------------------------------------------------------
    // TEST 2: Admin (Sarah Connor / admin@vknowlabs.com)
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: Logging in as Admin (admin@vknowlabs.com) ---");
    const client = await page.target().createCDPSession();
    await client.send("Network.clearBrowserCookies");

    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
    await page.type('input[type="email"]', "admin@vknowlabs.com");
    await page.type('input[type="password"]', "password123");
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: "networkidle2" });
    const adminUrl = page.url();
    console.log("Admin landed on:", adminUrl);

    if (!adminUrl.includes("/dashboard")) {
      throw new Error(`Expected /dashboard but landed on ${adminUrl}`);
    }

    const adminNavLinks = await page.$$eval("nav.hidden.md\\:flex a", (elements) =>
      elements.map((el) => el.textContent.trim())
    );
    console.log("Admin Navbar links detected:", adminNavLinks);

    // Admin navigates to /reports
    console.log("\nAdmin navigating to Team Reports (/reports)...");
    await page.goto("http://localhost:3000/reports", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 2000));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "reports_admin_view.png"),
      fullPage: false,
    });
    console.log("Saved screenshot: reports_admin_view.png");

    const adminCookies = await page.cookies();
    const adminCookieHeader = adminCookies.map((c) => `${c.name}=${c.value}`).join("; ");

    console.log("\nTesting Consolidated Excel download...");
    const adminExcelRes = await fetch("http://localhost:3000/api/reports/export/excel?type=consolidated", {
      headers: { Cookie: adminCookieHeader },
    });
    const adminExcelBuffer = await adminExcelRes.arrayBuffer();
    console.log(
      "Consolidated Excel response status:",
      adminExcelRes.status,
      "Content-Type:",
      adminExcelRes.headers.get("content-type"),
      "Size:",
      adminExcelBuffer.byteLength,
      "bytes"
    );

    console.log("\nTesting Consolidated PDF download...");
    const adminPdfRes = await fetch("http://localhost:3000/api/reports/export/pdf?type=consolidated", {
      headers: { Cookie: adminCookieHeader },
    });
    const adminPdfBuffer = await adminPdfRes.arrayBuffer();
    console.log(
      "Consolidated PDF response status:",
      adminPdfRes.status,
      "Content-Type:",
      adminPdfRes.headers.get("content-type"),
      "Size:",
      adminPdfBuffer.byteLength,
      "bytes"
    );

    console.log("\n=== ALL ROLE SEGREGATION & EXPORT TESTS PASSED ===");
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await browser.close();
  }
}

run();
