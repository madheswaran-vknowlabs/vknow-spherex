import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { subWeeks, startOfWeek, endOfWeek, addDays, subDays } from "date-fns";
import connectDB from "../lib/db";
import {
  User,
  Project,
  Stage,
  Task,
  Discrepancy,
  WeeklyUpdate,
  AuditLog,
  Setting,
  Notification,
} from "../models";
import { DEFAULT_STAGES } from "../types/models";
import { syncProjectTracking } from "../lib/lag-engine";

// Load environment variables if not loaded
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/vknow_spherex";
}

async function seedDatabase() {
  console.log("🌱 Starting VKnow SphereX database seeding...");
  await connectDB();

  // Clean collections
  console.log("🧹 Clearing existing collections...");
  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    Stage.deleteMany({}),
    Task.deleteMany({}),
    Discrepancy.deleteMany({}),
    WeeklyUpdate.deleteMany({}),
    AuditLog.deleteMany({}),
    Setting.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  // 1. Create Default Settings
  console.log("⚙️ Creating system settings...");
  await Setting.create({
    lagWarningThresholdDays: 2,
    lagCriticalThresholdDays: 5,
    weeklyReminderDay: 5, // Friday
    weeklyReminderTime: "17:00",
    timezone: "Asia/Kolkata",
    defaultStageTemplates: [...DEFAULT_STAGES],
  });

  // 2. Create Users
  console.log("👥 Creating 2 Admins and 6 Users...");
  const hashedPassword = await bcrypt.hash("password123", 10);

  const adminUsersData = [
    {
      name: "Madheswaran (Admin)",
      email: "admin@vknowlabs.com",
      password: hashedPassword,
      role: "admin",
      department: "Engineering Leadership",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces",
      isActive: true,
    },
    {
      name: "Kavitha Raman",
      email: "ops.admin@vknowlabs.com",
      password: hashedPassword,
      role: "admin",
      department: "Delivery & Operations",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=128&h=128&fit=crop&crop=faces",
      isActive: true,
    },
  ];

  const standardUsersData = [
    {
      name: "Sarah Jenkins",
      email: "sarah.lead@vknowlabs.com",
      password: hashedPassword,
      role: "user",
      department: "Architecture & Lead",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&crop=faces",
      isActive: true,
    },
    {
      name: "Alex Rivera",
      email: "alex.dev@vknowlabs.com",
      password: hashedPassword,
      role: "user",
      department: "Frontend / Mobile PWA",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=faces",
      isActive: true,
    },
    {
      name: "Chen Wei",
      email: "chen.fullstack@vknowlabs.com",
      password: hashedPassword,
      role: "user",
      department: "Backend & Cloud",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&h=128&fit=crop&crop=faces",
      isActive: true,
    },
    {
      name: "Priya Nair",
      email: "priya.ui@vknowlabs.com",
      password: hashedPassword,
      role: "user",
      department: "Product & UI/UX",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=128&h=128&fit=crop&crop=faces",
      isActive: true,
    },
    {
      name: "Rohit Verma",
      email: "rohit.qa@vknowlabs.com",
      password: hashedPassword,
      role: "user",
      department: "QA & Automation",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=128&h=128&fit=crop&crop=faces",
      isActive: true,
    },
    {
      name: "Ananya Sharma",
      email: "ananya.devops@vknowlabs.com",
      password: hashedPassword,
      role: "user",
      department: "DevOps & SRE",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=128&h=128&fit=crop&crop=faces",
      isActive: true,
    },
  ];

  const admin1 = await User.create(adminUsersData[0]);
  const admin2 = await User.create(adminUsersData[1]);

  const sarah = await User.create(standardUsersData[0]);
  const alex = await User.create(standardUsersData[1]);
  const chen = await User.create(standardUsersData[2]);
  const priya = await User.create(standardUsersData[3]);
  const rohit = await User.create(standardUsersData[4]);
  const ananya = await User.create(standardUsersData[5]);

  const allUsers = [sarah, alex, chen, priya, rohit, ananya];
  const allUserIds = allUsers.map((u) => u._id);

  // 3. Create 4 Projects across different lifecycle stages
  console.log("🚀 Creating 4 Projects across lifecycle stages...");

  const now = new Date();

  // Helper to create 8 standard stages
  async function createProjectStages(
    projectDoc: any,
    activeStageIndex: number, // 0 to 7
    stageConfigs: Array<{
      status: string;
      percent: number;
      ownerId: any;
      approved?: boolean;
      approvedBy?: any;
      remarks?: string;
      lagInDays?: number;
      health?: "Green" | "Amber" | "Red";
    }>
  ) {
    const stageDocs = [];
    const baseDate = subWeeks(now, 8);

    for (let i = 0; i < DEFAULT_STAGES.length; i++) {
      const cfg = stageConfigs[i] || {
        status: "Not Started",
        percent: 0,
        ownerId: sarah._id,
      };

      const plannedStart = addDays(baseDate, i * 14);
      const plannedEnd = addDays(plannedStart, 12);
      const isPastOrCurrent = i <= activeStageIndex;

      const stage = await Stage.create({
        projectId: projectDoc._id,
        order: i + 1,
        name: DEFAULT_STAGES[i],
        ownerId: cfg.ownerId || sarah._id,
        plannedStartDate: plannedStart,
        plannedEndDate: plannedEnd,
        actualStartDate: isPastOrCurrent ? plannedStart : null,
        actualEndDate:
          cfg.status === "Completed" || cfg.status === "Approved"
            ? addDays(plannedEnd, cfg.lagInDays || 0)
            : null,
        status: cfg.status,
        percentComplete: cfg.percent,
        notes: `Stage notes and milestones for ${DEFAULT_STAGES[i]}`,
        attachments: [],
        signOff: cfg.approved
          ? {
              approvedBy: cfg.approvedBy || admin1._id,
              approvedAt: subDays(now, (activeStageIndex - i) * 10 + 2),
              remarks: cfg.remarks || "Formal gate review approved. All criteria met.",
            }
          : { approvedBy: null, approvedAt: null, remarks: "" },
        lagInDays: cfg.lagInDays || 0,
        health: cfg.health || "Green",
      });

      stageDocs.push(stage);
    }
    return stageDocs;
  }

  // --- Project 1: SphereX AI Assistant (Active, Stage 4: Development, Health: Green) ---
  const proj1 = await Project.create({
    name: "SphereX AI Assistant",
    code: "VKS-AI",
    description: "Enterprise conversational assistant with lifecycle analytics and automated insights.",
    client: "Internal / Product",
    status: "Active",
    health: "Green",
    plannedStartDate: subWeeks(now, 8),
    plannedEndDate: addDays(now, 45),
    actualStartDate: subWeeks(now, 8),
    progress: 58,
    members: allUserIds,
    lagInDays: 0,
  });

  const proj1Stages = await createProjectStages(proj1, 3, [
    { status: "Approved", percent: 100, ownerId: sarah._id, approved: true, remarks: "Scope defined clearly with stakeholder sign-off." },
    { status: "Approved", percent: 100, ownerId: sarah._id, approved: true, remarks: "PRD & Architecture documentation signed off." },
    { status: "Approved", percent: 100, ownerId: priya._id, approved: true, remarks: "Figma design system and UI specs approved." },
    { status: "In Progress", percent: 65, ownerId: chen._id, lagInDays: 0, health: "Green" },
    { status: "Not Started", percent: 0, ownerId: rohit._id },
    { status: "Not Started", percent: 0, ownerId: sarah._id },
    { status: "Not Started", percent: 0, ownerId: ananya._id },
    { status: "Not Started", percent: 0, ownerId: admin1._id },
  ]);
  proj1.currentStageId = proj1Stages[3]._id;
  await proj1.save();

  // --- Project 2: FinCloud Banking Core (Active, Stage 5: Testing, Health: Amber) ---
  const proj2 = await Project.create({
    name: "FinCloud Banking Core",
    code: "FCB-CORE",
    description: "Next-gen banking transaction processor with multi-region replication and low latency.",
    client: "Apex Financial Group",
    status: "Active",
    health: "Amber",
    plannedStartDate: subWeeks(now, 10),
    plannedEndDate: addDays(now, 20),
    actualStartDate: subWeeks(now, 10),
    progress: 72,
    members: [sarah._id, chen._id, rohit._id, ananya._id],
    lagInDays: 3,
  });

  const proj2Stages = await createProjectStages(proj2, 4, [
    { status: "Approved", percent: 100, ownerId: sarah._id, approved: true, remarks: "Requirement agreed with compliance officers." },
    { status: "Approved", percent: 100, ownerId: sarah._id, approved: true, remarks: "Core transaction specs documented." },
    { status: "Approved", percent: 100, ownerId: priya._id, approved: true, remarks: "Microservices architecture & schemas approved." },
    { status: "Approved", percent: 100, ownerId: chen._id, approved: true, remarks: "Core APIs and ledger modules implemented." },
    { status: "In Progress", percent: 45, ownerId: rohit._id, lagInDays: 3, health: "Amber" },
    { status: "Not Started", percent: 0, ownerId: sarah._id },
    { status: "Not Started", percent: 0, ownerId: ananya._id },
    { status: "Not Started", percent: 0, ownerId: admin2._id },
  ]);
  proj2.currentStageId = proj2Stages[4]._id;
  await proj2.save();

  // --- Project 3: OmniRetail POS PWA (Active, Stage 2: Req Analysis, Health: Red) ---
  const proj3 = await Project.create({
    name: "OmniRetail POS PWA",
    code: "ORP-PWA",
    description: "Offline-first barcode scanning and point-of-sale progressive web application.",
    client: "Global Retailers Corp",
    status: "Active",
    health: "Red",
    plannedStartDate: subWeeks(now, 4),
    plannedEndDate: addDays(now, 60),
    actualStartDate: subWeeks(now, 4),
    progress: 25,
    members: [alex._id, priya._id, sarah._id],
    lagInDays: 6,
  });

  const proj3Stages = await createProjectStages(proj3, 1, [
    { status: "Approved", percent: 100, ownerId: sarah._id, approved: true, remarks: "Initial stakeholder workshops finished." },
    { status: "Blocked", percent: 80, ownerId: sarah._id, lagInDays: 6, health: "Red" },
    { status: "Not Started", percent: 0, ownerId: priya._id },
    { status: "Not Started", percent: 0, ownerId: alex._id },
    { status: "Not Started", percent: 0, ownerId: rohit._id },
    { status: "Not Started", percent: 0, ownerId: sarah._id },
    { status: "Not Started", percent: 0, ownerId: ananya._id },
    { status: "Not Started", percent: 0, ownerId: admin1._id },
  ]);
  proj3.currentStageId = proj3Stages[1]._id;
  await proj3.save();

  // --- Project 4: HealthBridge Telehealth (Completed, Stage 8: Post-Deployment Closure, Health: Green) ---
  const proj4 = await Project.create({
    name: "HealthBridge Telehealth",
    code: "HBT-APP",
    description: "HIPAA-compliant video consultation and digital prescription delivery platform.",
    client: "CareFirst Healthcare",
    status: "Completed",
    health: "Green",
    plannedStartDate: subWeeks(now, 16),
    plannedEndDate: subWeeks(now, 1),
    actualStartDate: subWeeks(now, 16),
    actualEndDate: subWeeks(now, 1),
    progress: 100,
    members: [sarah._id, alex._id, chen._id, priya._id, rohit._id, ananya._id],
    lagInDays: 0,
  });

  const proj4Stages = await createProjectStages(proj4, 7, [
    { status: "Approved", percent: 100, ownerId: sarah._id, approved: true, remarks: "HIPAA requirements validated." },
    { status: "Approved", percent: 100, ownerId: sarah._id, approved: true, remarks: "Security & encryption architecture approved." },
    { status: "Approved", percent: 100, ownerId: priya._id, approved: true, remarks: "Patient and clinician portals UX validated." },
    { status: "Approved", percent: 100, ownerId: chen._id, approved: true, remarks: "WebRTC and appointment engines delivered." },
    { status: "Approved", percent: 100, ownerId: rohit._id, approved: true, remarks: "End-to-end pen testing and QA verified." },
    { status: "Approved", percent: 100, ownerId: sarah._id, approved: true, remarks: "Clinician pilot program completed with 98% CSAT." },
    { status: "Approved", percent: 100, ownerId: ananya._id, approved: true, remarks: "Production rollout executed cleanly on AWS." },
    { status: "Approved", percent: 100, ownerId: admin1._id, approved: true, remarks: "Project handoff complete. SLA active." },
  ]);
  proj4.currentStageId = proj4Stages[7]._id;
  await proj4.save();

  // 4. Create Realistic Tasks with Blockers and Dependencies
  console.log("📝 Creating Tasks with dependency chaining...");

  // Project 1 Stage 4 (Development) Tasks
  const task1_1 = await Task.create({
    projectId: proj1._id,
    stageId: proj1Stages[3]._id,
    title: "Implement Agentic Tool Calling Pipeline",
    description: "Core execution harness for function calling and subagent delegation.",
    assigneeId: chen._id,
    priority: "High",
    plannedStartDate: subWeeks(now, 2),
    plannedEndDate: subDays(now, 2),
    actualStartDate: subWeeks(now, 2),
    actualEndDate: subDays(now, 2),
    estimatedHours: 40,
    loggedHours: 38,
    percentComplete: 100,
    status: "Completed",
    blockedBy: [],
    isAtRisk: false,
    lagInDays: 0,
    health: "Green",
  });

  const task1_2 = await Task.create({
    projectId: proj1._id,
    stageId: proj1Stages[3]._id,
    title: "Build Responsive PWA Cockpit UI",
    description: "Mobile-first task updating with quick sliders and touch gestures.",
    assigneeId: alex._id,
    priority: "High",
    plannedStartDate: subDays(now, 6),
    plannedEndDate: addDays(now, 4),
    actualStartDate: subDays(now, 6),
    estimatedHours: 36,
    loggedHours: 24,
    percentComplete: 70,
    status: "In Progress",
    blockedBy: [task1_1._id],
    isAtRisk: false,
    lagInDays: 0,
    health: "Green",
  });

  const task1_3 = await Task.create({
    projectId: proj1._id,
    stageId: proj1Stages[3]._id,
    title: "Serverless PDF and Excel Generation Endpoints",
    description: "Export pipeline using ExcelJS and @react-pdf/renderer.",
    assigneeId: chen._id,
    priority: "Medium",
    plannedStartDate: subDays(now, 2),
    plannedEndDate: addDays(now, 8),
    actualStartDate: subDays(now, 2),
    estimatedHours: 24,
    loggedHours: 12,
    percentComplete: 50,
    status: "In Progress",
    blockedBy: [],
    isAtRisk: false,
    lagInDays: 0,
    health: "Green",
  });

  const task1_4 = await Task.create({
    projectId: proj1._id,
    stageId: proj1Stages[3]._id,
    title: "Automated Integration Test Suite",
    description: "Verify MongoDB aggregation pipelines and lag engine consistency.",
    assigneeId: rohit._id,
    priority: "Medium",
    plannedStartDate: addDays(now, 2),
    plannedEndDate: addDays(now, 10),
    estimatedHours: 28,
    loggedHours: 4,
    percentComplete: 15,
    status: "To Do",
    blockedBy: [task1_2._id],
    isAtRisk: false,
    lagInDays: 0,
    health: "Green",
  });

  // Project 2 Stage 5 (Testing) Tasks (Lagging / Amber)
  const task2_1 = await Task.create({
    projectId: proj2._id,
    stageId: proj2Stages[4]._id,
    title: "Core Ledger Stress Testing (10k TPS)",
    description: "Simulate peak banking loads and measure MongoDB write latency.",
    assigneeId: rohit._id,
    priority: "Urgent",
    plannedStartDate: subWeeks(now, 1),
    plannedEndDate: subDays(now, 3), // Was due 3 days ago!
    actualStartDate: subWeeks(now, 1),
    estimatedHours: 40,
    loggedHours: 36,
    percentComplete: 85,
    status: "In Progress",
    blockedBy: [],
    isAtRisk: true,
    lagInDays: 3,
    health: "Amber",
  });

  const task2_2 = await Task.create({
    projectId: proj2._id,
    stageId: proj2Stages[4]._id,
    title: "Security & Penetration Audit Sign-off",
    description: "External security audit remediation and compliance certificate.",
    assigneeId: ananya._id,
    priority: "High",
    plannedStartDate: subDays(now, 2),
    plannedEndDate: addDays(now, 6),
    estimatedHours: 30,
    loggedHours: 8,
    percentComplete: 20,
    status: "Blocked",
    blockedBy: [task2_1._id], // Dependent on slipping task!
    isAtRisk: true,
    lagInDays: 3,
    health: "Amber",
  });

  // Project 3 Stage 2 (Requirement Analysis) Tasks (Critical Lag / Red)
  const task3_1 = await Task.create({
    projectId: proj3._id,
    stageId: proj3Stages[1]._id,
    title: "Finalize Client POS Hardware Interface Protocol",
    description: "USB & Bluetooth barcode scanner specs with client enterprise architect.",
    assigneeId: sarah._id,
    priority: "Urgent",
    plannedStartDate: subWeeks(now, 2),
    plannedEndDate: subDays(now, 6), // Slipped 6 days!
    actualStartDate: subWeeks(now, 2),
    estimatedHours: 32,
    loggedHours: 42,
    percentComplete: 80,
    status: "Blocked",
    blockedBy: [],
    isAtRisk: true,
    lagInDays: 6,
    health: "Red",
  });

  // 5. Create Discrepancies
  console.log("⚠️ Creating Discrepancies (Blockers, Scope Changes, Overruns)...");
  await Discrepancy.create({
    projectId: proj3._id,
    stageId: proj3Stages[1]._id,
    taskId: task3_1._id,
    type: "Scope Change",
    severity: "Critical",
    description:
      "Client requested Bluetooth BLE offline barcode scanner caching that was outside the original Stage 1 agreement.",
    raisedById: sarah._id,
    status: "In Review",
  });

  await Discrepancy.create({
    projectId: proj2._id,
    stageId: proj2Stages[4]._id,
    taskId: task2_1._id,
    type: "Effort Overrun",
    severity: "High",
    description:
      "Staging test environment throttling caused delay in completing 10,000 TPS benchmark scripts.",
    raisedById: rohit._id,
    status: "Open",
  });

  // 6. Create 8 Weeks of Historical Weekly Updates per User
  console.log("📅 Generating 8 Weeks of comprehensive Weekly Updates...");

  for (const user of allUsers) {
    for (let w = 8; w >= 1; w--) {
      const weekDate = subWeeks(now, w);
      const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });
      const weekNumber = parseInt(
        new Intl.DateTimeFormat("en", { week: "numeric" } as any).format(weekStart) || "40"
      );
      const year = weekStart.getFullYear();

      const hoursSpent = Math.floor(36 + Math.random() * 6); // 36 - 41 hours
      const isLate = Math.random() < 0.15; // 15% late submissions

      await WeeklyUpdate.create({
        userId: user._id,
        projectId: proj1._id,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        weekNumber,
        year,
        workCompleted: `Completed sprint deliverables for milestone W${w}: implemented modules, resolved edge cases, and coordinated code reviews.`,
        hoursSpent,
        taskUpdates: [
          {
            taskId: task1_1._id,
            progress: Math.min(100, (9 - w) * 12),
            hours: Math.floor(hoursSpent * 0.6),
            status: w <= 2 ? "Completed" : "In Progress",
            notes: `Focused on core business logic for milestone W${w}.`,
          },
          {
            taskId: task1_2._id,
            progress: Math.min(100, Math.max(0, (7 - w) * 15)),
            hours: Math.floor(hoursSpent * 0.4),
            status: w <= 3 ? "In Progress" : "To Do",
            notes: `Iterating on UI components and responsive styling.`,
          },
        ],
        blockers: w === 4 ? "Awaiting API specification confirmation from external provider." : "",
        planNextWeek: `Continue execution on next feature epic, perform unit testing, and participate in architecture sync.`,
        submittedAt: isLate ? addDays(weekEnd, 1) : subDays(weekEnd, 1),
        isLate,
      });
    }
  }

  // 7. Create Initial Audit Logs
  console.log("📜 Logging initial seed actions in AuditLog...");
  await AuditLog.create({
    actor: {
      userId: admin1._id,
      name: admin1.name,
      role: admin1.role,
      email: admin1.email,
    },
    action: "CREATE",
    entityType: "Project",
    entityId: proj1._id.toString(),
    projectId: proj1._id,
    after: { name: proj1.name, code: proj1.code, status: proj1.status },
    ipAddress: "127.0.0.1",
    userAgent: "Seed Script / Internal Orchestrator",
    timestamp: subWeeks(now, 8),
  });

  await AuditLog.create({
    actor: {
      userId: admin1._id,
      name: admin1.name,
      role: admin1.role,
      email: admin1.email,
    },
    action: "STAGE_SIGN_OFF",
    entityType: "Stage",
    entityId: proj1Stages[2]._id.toString(),
    projectId: proj1._id,
    after: {
      stageName: "Design",
      approvedBy: admin1.name,
      remarks: "Figma design system and UI specs approved.",
    },
    ipAddress: "127.0.0.1",
    userAgent: "Seed Script / Internal Orchestrator",
    timestamp: subWeeks(now, 2),
  });

  // 8. Run Tracking & Health Sync across all seeded projects
  console.log("⚡ Calculating exact work lag, dependency risks, and stage/project health...");
  await Promise.all([
    syncProjectTracking(proj1._id),
    syncProjectTracking(proj2._id),
    syncProjectTracking(proj3._id),
    syncProjectTracking(proj4._id),
  ]);

  // 9. Create Welcome Notifications
  console.log("🔔 Creating initial user notifications...");
  for (const user of allUsers) {
    await Notification.create({
      userId: user._id,
      title: "Welcome to VKnow SphereX",
      message: `Your account is active. You are assigned to the SphereX AI Assistant and related projects.`,
      type: "system",
      link: "/my-work",
      isRead: false,
    });
  }

  console.log("✅ Seed completed successfully!");
  console.log("----------------------------------------------------------------");
  console.log("Demo Credentials:");
  console.log("  Admin: admin@vknowlabs.com       | Password: password123");
  console.log("  Admin: ops.admin@vknowlabs.com   | Password: password123");
  console.log("  Lead:  sarah.lead@vknowlabs.com  | Password: password123");
  console.log("  Dev:   alex.dev@vknowlabs.com    | Password: password123");
  console.log("  QA:    rohit.qa@vknowlabs.com    | Password: password123");
  console.log("----------------------------------------------------------------");

  process.exit(0);
}

seedDatabase().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
