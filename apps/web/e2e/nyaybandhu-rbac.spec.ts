import { test, expect } from "@playwright/test";

const apiBase = "http://127.0.0.1:8000/api/v1";

async function setRole(page: import("@playwright/test").Page, role: string, userId: string) {
  await page.goto("/settings");
  await page.evaluate(
    ({ roleValue, userIdValue }) => {
      localStorage.setItem("nayak.role", roleValue);
      localStorage.setItem("nayak.user_id", userIdValue);
      window.dispatchEvent(new Event("nayak-session-context-changed"));
    },
    { roleValue: role, userIdValue: userId }
  );
}

async function createCase(role: string, userId: string, title: string) {
  const response = await fetch(`${apiBase}/nyaybandhu/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Role": role,
      "X-User-Id": userId,
    },
    body: JSON.stringify({
      title,
      description: "Playwright RBAC verification workspace",
      mode: "real-life",
      opposing_counsel_strategy: "precedent",
      config: {
        rbac: {
          creator_user_id: userId,
          creator_role: role,
          assigned_roles: ["law_intern", "lawyer", "judge"],
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create test session: ${response.status}`);
  }

  return response.json() as Promise<{ id: string }>;
}

test.describe("NyayBandhu RBAC", () => {
  test("normal user sees own-case intake and can create a case", async ({ page }) => {
    await setRole(page, "normal_user", "ui-normal-user");
    await page.goto("/nyaybandhu/practice");
    await expect(page.getByText("Start Practice Session")).toBeVisible();
    await expect(page.getByText("Practice Arena")).toBeVisible();
  });

  test("law intern cannot see case-creation form", async ({ page }) => {
    await setRole(page, "law_intern", "ui-law-intern");
    await page.goto("/nyaybandhu/practice");
    await expect(page.getByText("routed to assigned-case review workspaces")).toBeVisible();
    await expect(page.getByText("Start Practice Session")).toHaveCount(0);
  });

  test("lawyer can open assigned workspace and see review completion controls", async ({ page }) => {
    const session = await createCase("normal_user", "ui-owner-lawyer", "Playwright RBAC Lawyer Case");
    await setRole(page, "lawyer", "ui-lawyer");
    await page.goto(`/nyaybandhu/${session.id}`);
    await expect(page.getByText("Lawyer")).toBeVisible();
    await expect(page.getByText(/read-only|review/)).toBeVisible();
  });

  test("judge sees read-only evaluation context on an assigned workspace", async ({ page }) => {
    const session = await createCase("normal_user", "ui-owner-judge", "Playwright RBAC Judge Case");
    await setRole(page, "judge", "ui-judge");
    await page.goto(`/nyaybandhu/${session.id}`);
    await expect(page.getByText("read-only")).toBeVisible();
    await expect(page.getByText("Assigned roles:")).toBeVisible();
  });

  test("direct URL access to an unauthorized workspace is blocked", async ({ page }) => {
    const session = await createCase("normal_user", "ui-direct-owner", "Playwright RBAC Direct URL Case");
    await setRole(page, "normal_user", "ui-wrong-user");
    await page.goto(`/nyaybandhu/${session.id}`);
    await expect(page.getByText("Session Access Error")).toBeVisible();
  });

  test("hidden-button bypass attempt to create a case is rejected by the API", async ({ page }) => {
    await setRole(page, "law_intern", "ui-bypass-intern");
    const status = await page.evaluate(async () => {
      const res = await fetch("http://127.0.0.1:8000/api/v1/nyaybandhu/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Role": "law_intern",
          "X-User-Id": "ui-bypass-intern",
        },
        body: JSON.stringify({
          title: "Bypass attempt",
          description: "Should fail",
          mode: "practice",
          opposing_counsel_strategy: "precedent",
          config: {
            rbac: {
              creator_user_id: "ui-bypass-intern",
              creator_role: "law_intern",
              assigned_roles: ["law_intern", "lawyer", "judge"],
            },
          },
        }),
      });

      return res.status;
    });

    expect(status).toBe(403);
  });
});
