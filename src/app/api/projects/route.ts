import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Project, Stage, Task, Setting, User } from "@/models";
import { requireAuth, requireAdminOrManager } from "@/lib/auth";
import { createProjectSchema } from "@/types/schemas";
import { logAuditEvent } from "@/lib/audit";
import { DEFAULT_STAGES } from "@/types/models";
import { addDays, differenceInDays } from "date-fns";
import { generateProjectCode } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const health = searchParams.get("health");

    const andClauses: any[] = [{ isArchived: false }];

    // Scoping by role:
    // Admin: full access
    // Manager: sees projects containing themselves, their employees, or projects created by them
    // Employee: only projects where they are assigned members
    if (user.role === "manager") {
      const myEmployees = await User.find({
        $or: [{ createdBy: user.id }, { managerId: user.id }],
      }).select("_id");
      const teamIds = [user.id, ...myEmployees.map((e) => e._id.toString())];
      andClauses.push({
        $or: [{ members: { $in: teamIds } }, { createdBy: user.id }],
      });
    } else if (user.role !== "admin") {
      andClauses.push({ members: user.id });
    }

    if (search) {
      andClauses.push({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { code: { $regex: search, $options: "i" } },
          { client: { $regex: search, $options: "i" } },
        ],
      });
    }

    if (status && status !== "ALL") {
      andClauses.push({ status });
    }

    if (health && health !== "ALL") {
      andClauses.push({ health });
    }

    const query = andClauses.length > 1 ? { $and: andClauses } : andClauses[0];

    const projects = await Project.find(query)
      .populate("members", "name email avatar department role")
      .populate("currentStageId", "name order status percentComplete health")
      .sort({ updatedAt: -1 })
      .lean();

    // Attach stage count and task summary
    const projectIds = projects.map((p) => p._id);
    const [stageCounts, taskCounts] = await Promise.all([
      Stage.aggregate([
        { $match: { projectId: { $in: projectIds }, isArchived: false } },
        { $group: { _id: "$projectId", count: { $sum: 1 }, approvedCount: { $sum: { $cond: [{ $eq: ["$status", "Approved"] }, 1, 0] } } } },
      ]),
      Task.aggregate([
        { $match: { projectId: { $in: projectIds }, isArchived: false } },
        { $group: { _id: "$projectId", total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } } } },
      ]),
    ]);

    const stageCountMap = new Map(stageCounts.map((s) => [s._id.toString(), s]));
    const taskCountMap = new Map(taskCounts.map((t) => [t._id.toString(), t]));

    const enriched = projects.map((p) => {
      const s = stageCountMap.get(p._id.toString()) || { count: 8, approvedCount: 0 };
      const t = taskCountMap.get(p._id.toString()) || { total: 0, completed: 0 };
      return {
        ...p,
        stageStats: s,
        taskStats: t,
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch projects" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdminOrManager();
    await connectDB();

    const body = await req.json();
    const validated = createProjectSchema.parse(body);

    // Compute or validate project code
    let projectCode = (validated.code && validated.code.trim())
      ? validated.code.trim().toUpperCase()
      : generateProjectCode(validated.name);

    if (!projectCode) {
      projectCode = "PROJ";
    }

    // Verify unique project code
    if (validated.code && validated.code.trim()) {
      const existing = await Project.findOne({ code: projectCode });
      if (existing) {
        return NextResponse.json(
          { success: false, error: `Project code '${projectCode}' already exists.` },
          { status: 400 }
        );
      }
    } else {
      // Auto-generated: resolve collision if exists by appending counter
      const baseCode = projectCode;
      let counter = 1;
      while (await Project.findOne({ code: projectCode })) {
        counter++;
        projectCode = `${baseCode}-${counter}`;
      }
    }

    const startDate = new Date(validated.plannedStartDate);
    const endDate = new Date(validated.plannedEndDate);

    if (endDate <= startDate) {
      return NextResponse.json(
        { success: false, error: "Planned end date must be after planned start date." },
        { status: 400 }
      );
    }

    const membersList = [...(validated.members || [])];
    if (!membersList.includes(user.id)) {
      membersList.push(user.id);
    }

    // 1. Create Project
    const project = await Project.create({
      name: validated.name.trim(),
      code: projectCode,
      description: validated.description || "",
      client: validated.client || "Internal",
      status: "Active",
      health: "Green",
      plannedStartDate: startDate,
      plannedEndDate: endDate,
      progress: 0,
      members: membersList,
      lagInDays: 0,
      isArchived: false,
    });

    // 2. Automatically generate the lifecycle stages with calculated duration
    const settings = await Setting.findOne().lean();
    const stageTemplates = (validated.stages && validated.stages.length > 0)
      ? validated.stages
      : (settings?.defaultStageTemplates || DEFAULT_STAGES);
    const totalDays = Math.max(stageTemplates.length, differenceInDays(endDate, startDate));
    const daysPerStage = Math.max(1, Math.floor(totalDays / stageTemplates.length));

    const stageDocs = [];
    for (let i = 0; i < stageTemplates.length; i++) {
      const stageStart = addDays(startDate, i * daysPerStage);
      const stageEnd = i === stageTemplates.length - 1 ? endDate : addDays(stageStart, daysPerStage - 1);

      const stage = await Stage.create({
        projectId: project._id,
        order: i + 1,
        name: stageTemplates[i],
        ownerId: validated.members && validated.members.length > 0 ? validated.members[0] : null,
        plannedStartDate: stageStart,
        plannedEndDate: stageEnd,
        status: i === 0 ? "In Progress" : "Not Started",
        percentComplete: 0,
        health: "Green",
        lagInDays: 0,
        signOff: { approvedBy: null, approvedAt: null, remarks: "" },
      });
      stageDocs.push(stage);
    }

    // Link currentStageId to first stage
    project.currentStageId = stageDocs[0]._id;
    await project.save();

    // 3. Log Audit Event
    await logAuditEvent({
      actor: { userId: user.id, name: user.name, role: user.role, email: user.email },
      action: "CREATE",
      entityType: "Project",
      entityId: project._id.toString(),
      projectId: project._id,
      after: {
        name: project.name,
        code: project.code,
        client: project.client,
        plannedStartDate: startDate,
        plannedEndDate: endDate,
        stagesCount: stageDocs.length,
      },
      req,
    });

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create project" },
      { status: error.status || 400 }
    );
  }
}
