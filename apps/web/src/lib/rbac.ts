export const roles = ["normal_user", "law_intern", "lawyer", "judge"] as const;

export type Role = (typeof roles)[number];

export const permissions = [
  "create_case",
  "view_own_case",
  "view_assigned_cases",
  "answer_cross_questions",
  "export_reports",
  "add_intern_notes",
  "mark_lawyer_review_complete",
  "view_judge_evaluation_workspace",
  "assign_roles",
] as const;

export type Permission = (typeof permissions)[number];

export const rolePermissionMap: Record<Role, Permission[]> = {
  normal_user: ["create_case", "view_own_case", "answer_cross_questions", "export_reports"],
  law_intern: ["view_assigned_cases", "answer_cross_questions", "add_intern_notes", "export_reports"],
  lawyer: ["view_assigned_cases", "answer_cross_questions", "export_reports", "mark_lawyer_review_complete"],
  judge: ["view_assigned_cases", "export_reports", "view_judge_evaluation_workspace"],
};

export const roleLabels: Record<Role, string> = {
  normal_user: "Normal User",
  law_intern: "Law Intern",
  lawyer: "Lawyer",
  judge: "Judge",
};

export const roleSummaries: Record<Role, string> = {
  normal_user: "Own-case intake and review flow.",
  law_intern: "Assigned-case review and intern notes.",
  lawyer: "Assigned-case review and finalization support.",
  judge: "Read-only adjudication and evaluation workspace.",
};

export const permissionLabels: Record<Permission, string> = {
  create_case: "Create a case",
  view_own_case: "View own case",
  view_assigned_cases: "View assigned cases",
  answer_cross_questions: "Answer cross-questions",
  export_reports: "Export reports",
  add_intern_notes: "Add intern notes",
  mark_lawyer_review_complete: "Mark lawyer review complete",
  view_judge_evaluation_workspace: "View judge evaluation workspace",
  assign_roles: "Assign roles",
};

export function isRole(value: string | null | undefined): value is Role {
  return !!value && roles.includes(value as Role);
}

export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  if (!isRole(role)) {
    return false;
  }

  return rolePermissionMap[role].includes(permission);
}

export function getRoleLabel(role: string | null | undefined): string {
  return isRole(role) ? roleLabels[role] : roleLabels.normal_user;
}

export function getRoleSummary(role: string | null | undefined): string {
  return isRole(role) ? roleSummaries[role] : roleSummaries.normal_user;
}

export function getRolePermissions(role: string | null | undefined): Permission[] {
  return isRole(role) ? rolePermissionMap[role] : rolePermissionMap.normal_user;
}
