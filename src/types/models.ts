export type Role = "admin" | "manager" | "employee" | "user";

export type StageName =
  | "Requirement Discussion"
  | "Requirement Analysis & Documentation"
  | "Design"
  | "Development"
  | "Testing"
  | "User Acceptance Testing"
  | "Production Deployment"
  | "Post-Deployment Support / Closure"
  | string;

export type StageStatus =
  | "Not Started"
  | "In Progress"
  | "On Hold"
  | "Blocked"
  | "Completed"
  | "Approved";

export type TaskStatus =
  | "To Do"
  | "In Progress"
  | "Under Review"
  | "Completed"
  | "Blocked";

export type TaskPriority = "Low" | "Medium" | "High" | "Urgent";

export type HealthStatus = "Green" | "Amber" | "Red";

export type DiscrepancyType =
  | "Scope Change"
  | "Effort Overrun"
  | "Delay"
  | "Quality Issue"
  | "Requirement Gap"
  | "Other";

export type DiscrepancySeverity = "Low" | "Medium" | "High" | "Critical";

export type DiscrepancyStatus = "Open" | "In Review" | "Resolved" | "Closed";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "STATUS_CHANGE"
  | "STAGE_SIGN_OFF"
  | "STAGE_REJECT"
  | "LOGIN"
  | "LOGOUT"
  | "FAILED_LOGIN"
  | "EXPORT";

export type EntityType =
  | "Project"
  | "Stage"
  | "Task"
  | "Discrepancy"
  | "WeeklyUpdate"
  | "User"
  | "Setting"
  | "Auth"
  | "Report";

export const DEFAULT_STAGES = [
  "Requirement Discussion",
  "Requirement Analysis & Documentation",
  "Design",
  "Development",
  "Testing",
  "User Acceptance Testing",
  "Production Deployment",
  "Post-Deployment Support / Closure",
] as const;
