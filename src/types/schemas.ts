import { z } from "zod";

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "user"]).default("user"),
  department: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["admin", "user"]).optional(),
  department: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Project Schemas
export const createProjectSchema = z.object({
  name: z.string().min(2, "Project name is required"),
  code: z.string().min(2, "Project code is required").toUpperCase(),
  description: z.string().optional(),
  client: z.string().optional(),
  plannedStartDate: z.string().or(z.date()),
  plannedEndDate: z.string().or(z.date()),
  members: z.array(z.string()).default([]),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).optional(),
  description: z.string().optional(),
  client: z.string().optional(),
  status: z.enum(["Planning", "Active", "On Hold", "Completed", "Archived"]).optional(),
  plannedStartDate: z.string().or(z.date()).optional(),
  plannedEndDate: z.string().or(z.date()).optional(),
  actualStartDate: z.string().or(z.date()).optional().nullable(),
  actualEndDate: z.string().or(z.date()).optional().nullable(),
  members: z.array(z.string()).optional(),
  isArchived: z.boolean().optional(),
});

// Stage Schemas
export const updateStageSchema = z.object({
  name: z.string().optional(),
  ownerId: z.string().optional().nullable(),
  plannedStartDate: z.string().or(z.date()).optional(),
  plannedEndDate: z.string().or(z.date()).optional(),
  actualStartDate: z.string().or(z.date()).optional().nullable(),
  actualEndDate: z.string().or(z.date()).optional().nullable(),
  status: z
    .enum(["Not Started", "In Progress", "On Hold", "Blocked", "Completed", "Approved"])
    .optional(),
  percentComplete: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

export const stageSignOffSchema = z.object({
  approved: z.boolean(),
  remarks: z.string().min(2, "Sign-off remarks are required"),
});

// Task Schemas
export const createTaskSchema = z.object({
  projectId: z.string(),
  stageId: z.string(),
  title: z.string().min(2, "Task title is required"),
  description: z.string().optional(),
  assigneeId: z.string().optional().nullable(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
  plannedStartDate: z.string().or(z.date()),
  plannedEndDate: z.string().or(z.date()),
  estimatedHours: z.number().min(0).default(0),
  blockedBy: z.array(z.string()).default([]),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  assigneeId: z.string().optional().nullable(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
  plannedStartDate: z.string().or(z.date()).optional(),
  plannedEndDate: z.string().or(z.date()).optional(),
  actualStartDate: z.string().or(z.date()).optional().nullable(),
  actualEndDate: z.string().or(z.date()).optional().nullable(),
  estimatedHours: z.number().min(0).optional(),
  loggedHours: z.number().min(0).optional(),
  percentComplete: z.number().min(0).max(100).optional(),
  status: z.enum(["To Do", "In Progress", "Under Review", "Completed", "Blocked"]).optional(),
  blockedBy: z.array(z.string()).optional(),
  isArchived: z.boolean().optional(),
});

// Weekly Update Schemas
export const taskUpdateItemSchema = z.object({
  taskId: z.string(),
  progress: z.number().min(0).max(100),
  hours: z.number().min(0),
  status: z.enum(["To Do", "In Progress", "Under Review", "Completed", "Blocked"]),
  notes: z.string().optional(),
});

export const createWeeklyUpdateSchema = z.object({
  projectId: z.string(),
  weekStartDate: z.string().or(z.date()),
  weekEndDate: z.string().or(z.date()),
  workCompleted: z.string().min(3, "Please summarize work completed"),
  hoursSpent: z.number().min(0),
  taskUpdates: z.array(taskUpdateItemSchema).default([]),
  blockers: z.string().optional(),
  planNextWeek: z.string().min(3, "Please outline your plan for next week"),
});

// Discrepancy Schemas
export const createDiscrepancySchema = z.object({
  projectId: z.string(),
  stageId: z.string().optional().nullable(),
  taskId: z.string().optional().nullable(),
  type: z.enum(["Scope Change", "Effort Overrun", "Delay", "Quality Issue", "Requirement Gap", "Other"]),
  severity: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
  description: z.string().min(5, "Detailed description required"),
});

export const resolveDiscrepancySchema = z.object({
  status: z.enum(["In Review", "Resolved", "Closed"]),
  resolution: z.string().min(5, "Resolution description required"),
});

// Settings Schema
export const updateSettingsSchema = z.object({
  lagWarningThresholdDays: z.number().min(1).default(2),
  lagCriticalThresholdDays: z.number().min(1).default(5),
  weeklyReminderDay: z.number().min(0).max(6).default(5), // Friday = 5
  weeklyReminderTime: z.string().default("17:00"),
  timezone: z.string().default("Asia/Kolkata"),
});
