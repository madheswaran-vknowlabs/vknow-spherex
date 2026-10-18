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

    // Login as Admin
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
    await page.type('input[type="email"]', "admin@vknowlabs.com");
    await page.type('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 2000));

    // Navigate to projects
    await page.goto("http://localhost:3000/projects", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1500));

    // Click on the first project
    const projectLinks = await page.$$('a[href^="/projects/"]');
    if (projectLinks.length > 0) {
      await projectLinks[0].click();
      await page.waitForNavigation({ waitUntil: "networkidle2" });
      await new Promise((r) => setTimeout(r, 1500));

      // 1. Screenshot Track Your Work bar with Assignee TypeSelect
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "type_select_project_track_work_assignee.png"),
      });
      console.log("Captured project track work bar");

      // Click on the Assignee TypeSelect input
      const assigneeInputs = await page.$$('input[placeholder*="Assign to..."]');
      if (assigneeInputs.length > 0) {
        await assigneeInputs[0].click();
        await new Promise((r) => setTimeout(r, 500));
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, "type_select_assignee_menu_opened.png"),
        });
        console.log("Captured assignee menu opened");
      }

      // Open Add Member Modal
      const manageTeamBtns = await page.$$("button");
      for (const btn of manageTeamBtns) {
        const text = await page.evaluate((el) => el.innerText, btn);
        if (text && text.includes("Manage Team")) {
          await btn.click();
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 800));

      const memberSelectInput = await page.$("#add-member-select");
      if (memberSelectInput) {
        await memberSelectInput.click();
        await new Promise((r) => setTimeout(r, 500));
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, "type_select_add_member_modal.png"),
        });
        console.log("Captured add member modal with TypeSelect");
      }
    }
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await browser.close();
  }
}

run();
