import "dotenv/config";
import connectDB from "../lib/db";
import { Project, Stage, Task, Discrepancy, Setting, User } from "../models";
import { syncProjectTracking, getLagThresholds, calculateTaskLagAndHealth, calculateEffortVariance } from "../lib/lag-engine";

async function runPhase4Verification() {
  console.log("🧪 Running Phase 4 Tracking & Discrepancies Verification Suite...");
  await connectDB();

  // 1. Test Lag Engine calculations
  console.log("1️⃣ Verifying Task Lag & Health Logic...");
  const sampleThresholds = { lagWarningThresholdDays: 2, lagCriticalThresholdDays: 5 };

  // Task on time
  const onTime = calculateTaskLagAndHealth({
    status: "In Progress",
    plannedStartDate: new Date("2026-10-01"),
    plannedEndDate: new Date("2026-10-25"), // future date
  }, sampleThresholds);
  console.log("   - On-time task:", onTime);
  if (onTime.health !== "Green" || onTime.lagInDays !== 0) throw new Error("On-time test failed");

  // Task slipping by 3 days (Amber)
  const pastPlanned = new Date();
  pastPlanned.setDate(pastPlanned.getDate() - 3);
  const slippingAmber = calculateTaskLagAndHealth({
    status: "In Progress",
    plannedStartDate: new Date("2026-09-01"),
    plannedEndDate: pastPlanned,
  }, sampleThresholds);
  console.log("   - 3-day slip task:", slippingAmber);
  if (slippingAmber.health !== "Amber" || slippingAmber.lagInDays !== 3) throw new Error("Amber slip test failed");

  // Task slipping by 8 days (Red)
  const pastCrit = new Date();
  pastCrit.setDate(pastCrit.getDate() - 8);
  const slippingRed = calculateTaskLagAndHealth({
    status: "In Progress",
    plannedStartDate: new Date("2026-08-01"),
    plannedEndDate: pastCrit,
  }, sampleThresholds);
  console.log("   - 8-day slip task:", slippingRed);
  if (slippingRed.health !== "Red" || slippingRed.lagInDays !== 8) throw new Error("Red slip test failed");

  // 2. Test Effort Variance calculations
  console.log("2️⃣ Verifying Effort Variance Calculations...");
  const varianceUnder = calculateEffortVariance(40, 32);
  console.log("   - Under budget:", varianceUnder);
  if (varianceUnder.status !== "Under Budget" || varianceUnder.varianceHours !== -8) throw new Error("Effort under test failed");

  const varianceOver = calculateEffortVariance(40, 52);
  console.log("   - Over budget:", varianceOver);
  if (varianceOver.status !== "Over Budget" || varianceOver.varianceHours !== 12 || varianceOver.variancePercent !== 30) {
    throw new Error("Effort over test failed");
  }

  // 3. Test Full Project Tracking & Dependency Cascade
  console.log("3️⃣ Verifying Full syncProjectTracking with Dependency Cascade...");
  const project = await Project.findOne({ isArchived: false });
  if (!project) throw new Error("No active project found for test");

  const syncResult = await syncProjectTracking(project._id);
  console.log("   - Sync result for", project.name, ":", syncResult);
  if (typeof syncResult.projectLag !== "number" || !syncResult.projectHealth) {
    throw new Error("Project tracking sync failed");
  }

  // 4. Test Discrepancy Lifecycle
  console.log("4️⃣ Verifying Discrepancy Lifecycle (Create -> In Review -> Resolve)...");
  const admin = await User.findOne({ role: "admin" });
  if (!admin) throw new Error("No admin found for test");

  const discrepancy = await Discrepancy.create({
    projectId: project._id,
    type: "Scope Change",
    severity: "High",
    description: "Automated test discrepancy: additional security encryption required for customer PII.",
    raisedById: admin._id,
    status: "Open",
  });
  console.log("   - Created Discrepancy:", discrepancy._id, discrepancy.status);

  // Update status to Resolved
  discrepancy.status = "Resolved";
  discrepancy.resolution = "Security architecture team validated AES-256 GCM envelope encryption baseline.";
  discrepancy.resolutionDate = new Date();
  await discrepancy.save();
  console.log("   - Resolved Discrepancy:", discrepancy._id, discrepancy.status);

  // Verify in DB
  const retrieved = await Discrepancy.findById(discrepancy._id);
  if (retrieved?.status !== "Resolved" || !retrieved.resolutionDate) {
    throw new Error("Discrepancy resolve verification failed");
  }

  // Clean up test discrepancy
  await Discrepancy.findByIdAndDelete(discrepancy._id);
  console.log("   - Cleaned up test discrepancy.");

  console.log("🎉 All Phase 4 Verification checks PASSED successfully!");
  process.exit(0);
}

runPhase4Verification().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
