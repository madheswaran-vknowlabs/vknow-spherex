const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const ARTIFACT_DIR = "/home/madheswaran/.gemini/antigravity-cli/brain/e331d161-7249-4aa9-8591-1181e2240a97";

async function run() {
  console.log("=== Testing Gantt Download (Excel + PDF) ===");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1440, height: 900 },
  });

  try {
    const page = await browser.newPage();

    // Login as Admin
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
    await page.type('input[type="email"]', "admin@vknowlabs.com");
    await page.type('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    // Navigate to Project VKS-AI detail page
    const projectId = "6ad3609976477644a8c32ea0";
    console.log(`Navigating to /projects/${projectId}...`);
    await page.goto(`http://localhost:3000/projects/${projectId}`, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1500));

    // Switch to Gantt view
    console.log("Switching to Gantt Timeline view...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.textContent && b.textContent.includes("Gantt"));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 2000));

    // Capture screenshot of the Gantt chart with the download buttons
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "project_gantt_with_downloads.png"),
      fullPage: false,
    });
    console.log("Saved screenshot: project_gantt_with_downloads.png");

    // Test download endpoints directly with authenticated page session
    const cookies = await page.cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    console.log("\nTesting Gantt Excel Export via API...");
    const excelRes = await fetch(`http://localhost:3000/api/projects/${projectId}/gantt/export?format=excel`, {
      headers: { Cookie: cookieHeader },
    });
    console.log("Excel Status:", excelRes.status);
    console.log("Excel Content-Type:", excelRes.headers.get("content-type"));
    console.log("Excel Disposition:", excelRes.headers.get("content-disposition"));
    const excelBuf = await excelRes.arrayBuffer();
    console.log("Excel File Size:", excelBuf.byteLength, "bytes");

    if (excelRes.status === 200 && excelBuf.byteLength > 1000) {
      fs.writeFileSync(path.join(ARTIFACT_DIR, "VKS-AI-SphereX-AI-Assistant-Gantt.xlsx"), Buffer.from(excelBuf));
      console.log("PASS: Gantt Excel exported successfully!");
    } else {
      throw new Error(`Gantt Excel Export failed with status ${excelRes.status}`);
    }

    console.log("\nTesting Gantt PDF Export via API...");
    const pdfRes = await fetch(`http://localhost:3000/api/projects/${projectId}/gantt/export?format=pdf`, {
      headers: { Cookie: cookieHeader },
    });
    console.log("PDF Status:", pdfRes.status);
    console.log("PDF Content-Type:", pdfRes.headers.get("content-type"));
    console.log("PDF Disposition:", pdfRes.headers.get("content-disposition"));
    const pdfBuf = await pdfRes.arrayBuffer();
    console.log("PDF File Size:", pdfBuf.byteLength, "bytes");

    if (pdfRes.status === 200 && pdfBuf.byteLength > 1000) {
      fs.writeFileSync(path.join(ARTIFACT_DIR, "VKS-AI-SphereX-AI-Assistant-Gantt.pdf"), Buffer.from(pdfBuf));
      console.log("PASS: Gantt PDF exported successfully!");
    } else {
      throw new Error(`Gantt PDF Export failed with status ${pdfRes.status}`);
    }

    console.log("\n=== ALL GANTT EXPORT TESTS PASSED ===");
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await browser.close();
  }
}

run();
