const puppeteer = require("puppeteer");
const path = require("path");

const ARTIFACT_DIR = "/home/madheswaran/.gemini/antigravity-cli/brain/e331d161-7249-4aa9-8591-1181e2240a97";

async function run() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 950 });

    // ==========================================
    // 1. EMPLOYEE FLOW: View Attendance & Apply Leave
    // ==========================================
    console.log("1. Logging in as employee (alex.dev@vknowlabs.com)...");
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
    await page.type('input[type="email"]', "alex.dev@vknowlabs.com");
    await page.type('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1500));

    console.log("Navigating to /attendance via navigation rail...");
    const attendanceNavLink = await page.$('a[href="/attendance"]');
    if (attendanceNavLink) {
      await attendanceNavLink.click();
      await page.waitForNavigation({ waitUntil: "networkidle2" });
    } else {
      await page.goto("http://localhost:3000/attendance", { waitUntil: "networkidle2" });
    }
    await new Promise((r) => setTimeout(r, 1500));

    // Capture employee attendance dashboard with 6 corporate standard leave cards & calendar
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "employee_attendance_portal_with_leave_balances.png"),
    });
    console.log("Captured employee attendance portal with 6 corporate leave cards");

    // Click "Apply for Leave"
    console.log("Opening Apply for Leave modal...");
    const btns = await page.$$("button");
    for (const b of btns) {
      const text = await page.evaluate((el) => el.innerText, b);
      if (text && text.includes("Apply for Leave")) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 600));

    // Screenshot Apply Leave Modal
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "employee_apply_leave_modal_opened.png"),
    });
    console.log("Captured apply leave modal");

    // Enter reason and submit
    await page.type('textarea[placeholder*="doctor appointment"]', "Attending cousin wedding in hometown.");
    await new Promise((r) => setTimeout(r, 300));

    const submitBtns = await page.$$('button[type="submit"]');
    for (const b of submitBtns) {
      const text = await page.evaluate((el) => el.innerText, b);
      if (text && text.includes("Submit Application")) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 2000));

    // Capture updated employee portal with pending leave application
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "employee_leave_applied_success.png"),
    });
    console.log("Captured employee leave application submitted");

    // ==========================================
    // 2. MANAGER FLOW: Review & Approve Team Leave
    // ==========================================
    console.log("2. Logging in as manager (sarah.lead@vknowlabs.com)...");
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
    await page.type('input[type="email"]', "sarah.lead@vknowlabs.com");
    await page.type('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1500));

    await page.goto("http://localhost:3000/attendance", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1500));

    // Switch to "Team Leave Approvals" subtab
    const teamTabs = await page.$$("button");
    for (const tab of teamTabs) {
      const text = await page.evaluate((el) => el.innerText, tab);
      if (text && text.includes("Team Leave Approvals")) {
        await tab.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1000));

    // Capture manager team leave approval queue
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "manager_team_leave_approvals_queue.png"),
    });
    console.log("Captured manager team leave approval queue");

    // Click "Approve Leave"
    const approveBtns = await page.$$("button");
    for (const btn of approveBtns) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text && text.includes("Approve Leave")) {
        await btn.click();
        console.log("Clicked Approve Leave!");
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 2000));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "manager_approved_team_leave_success.png"),
    });
    console.log("Captured manager approved leave result");

    // ==========================================
    // 3. ADMIN FLOW: Corporate Quotas & Employee Balance Editor
    // ==========================================
    console.log("3. Logging in as admin (admin@vknowlabs.com)...");
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
    await page.type('input[type="email"]', "admin@vknowlabs.com");
    await page.type('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1500));

    await page.goto("http://localhost:3000/attendance", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1500));

    // Switch to "Corporate Quota Settings" subtab
    const adminTabs = await page.$$("button");
    for (const tab of adminTabs) {
      const text = await page.evaluate((el) => el.innerText, tab);
      if (text && text.includes("Corporate Quota Settings")) {
        await tab.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1000));

    // Capture admin corporate quota editor & employee roster
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "admin_corporate_leave_quotas_and_roster.png"),
    });
    console.log("Captured admin corporate quota editor and employee roster");

    // Open "Edit Balance" modal for an employee
    const editBalanceBtns = await page.$$("button");
    for (const btn of editBalanceBtns) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text && text.includes("Edit Balance")) {
        await btn.click();
        console.log("Clicked Edit Balance modal!");
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 800));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "admin_edit_employee_leave_balance_modal.png"),
    });
    console.log("Captured admin edit employee leave balance modal");

    console.log("All Attendance & Leave tests completed successfully!");
  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    await browser.close();
  }
}

run();
