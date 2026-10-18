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

    console.log("Navigating to login...");
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });

    // Login as employee
    await page.type('input[type="email"]', "alex.dev@vknowlabs.com");
    await page.type('input[type="password"]', "password123");
    await page.click('button[type="submit"]');

    console.log("Waiting for /daily-update...");
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 2000));

    // Verify /daily-update page loaded
    console.log("Current URL:", page.url());

    // 1. Screenshot initial state with TypeSelect fields
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "type_select_daily_update_initial.png"),
    });
    console.log("Captured initial daily update with TypeSelect");

    // 2. Click and type into Work Location TypeSelect
    const locationInputs = await page.$$('input[placeholder*="Type or select work location"]');
    if (locationInputs.length > 0) {
      console.log("Interacting with Work Location input...");
      await locationInputs[0].click();
      await new Promise((r) => setTimeout(r, 400));
      // First screenshot: opened dropdown showing all options
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "type_select_location_menu_opened.png"),
      });

      // Clear text using select all and type "Home"
      await page.keyboard.down("Control");
      await page.keyboard.press("A");
      await page.keyboard.up("Control");
      await page.keyboard.press("Backspace");
      await locationInputs[0].type("Home");
      await new Promise((r) => setTimeout(r, 500));

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "type_select_location_filter_typing.png"),
      });
      console.log("Captured location filter typing dropdown");

      // Press Enter to select
      await page.keyboard.press("Enter");
      await new Promise((r) => setTimeout(r, 400));
    }

    // 3. Click and type into Day Type TypeSelect
    const dayTypeInputs = await page.$$('input[placeholder*="Type or select day type"]');
    if (dayTypeInputs.length > 0) {
      console.log("Interacting with Day Type input...");
      await dayTypeInputs[0].click();
      await new Promise((r) => setTimeout(r, 400));

      await page.keyboard.down("Control");
      await page.keyboard.press("A");
      await page.keyboard.up("Control");
      await page.keyboard.press("Backspace");
      await dayTypeInputs[0].type("Fest");
      await new Promise((r) => setTimeout(r, 500));

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "type_select_daytype_filter_typing.png"),
      });
      console.log("Captured day type filter typing dropdown");

      await page.keyboard.press("Enter");
      await new Promise((r) => setTimeout(r, 400));
    }

    // 4. Click and search in Project TypeSelect
    const projectInputs = await page.$$('input[placeholder*="Type or select project"]');
    if (projectInputs.length > 0) {
      console.log("Interacting with Project TypeSelect...");
      await projectInputs[0].click({ clickCount: 3 });
      await projectInputs[0].type("Sphere");
      await new Promise((r) => setTimeout(r, 600));

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "type_select_project_filter_typing.png"),
      });
      console.log("Captured project search typing dropdown");

      await page.keyboard.press("Enter");
      await new Promise((r) => setTimeout(r, 400));
    }

    // 5. Switch to Mark Leave tab and test Leave Type TypeSelect
    const markLeaveButtons = await page.$$("button");
    for (const btn of markLeaveButtons) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text && text.includes("Mark Leave")) {
        await btn.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 800));

    const leaveInputs = await page.$$('input[placeholder*="Type or select leave type"]');
    if (leaveInputs.length > 0) {
      console.log("Interacting with Leave Type TypeSelect...");
      await leaveInputs[0].click({ clickCount: 3 });
      await page.keyboard.press("Backspace");
      await leaveInputs[0].type("Sick");
      await new Promise((r) => setTimeout(r, 600));

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "type_select_leave_type_typing.png"),
      });
      console.log("Captured leave type typing dropdown");

      await page.keyboard.press("Enter");
      await new Promise((r) => setTimeout(r, 400));
    }

    // 6. Test Admin Users page TypeSelects
    console.log("Switching to admin user test...");
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
    await page.type('input[type="email"]', "admin@vknowlabs.com");
    await page.type('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 2000));

    await page.goto("http://localhost:3000/admin/users", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1500));

    // Type in Department filter
    const deptInputs = await page.$$('input[placeholder*="All Departments"]');
    if (deptInputs.length > 0) {
      await deptInputs[0].click();
      await new Promise((r) => setTimeout(r, 500));
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "type_select_admin_users_department.png"),
      });
      console.log("Captured admin users department dropdown");
    }

    console.log("All TypeSelect tests completed successfully!");
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await browser.close();
  }
}

run();
