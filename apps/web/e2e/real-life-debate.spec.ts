import { test, expect } from "@playwright/test";

async function setRole(page: any, role: string, userId: string) {
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

test.describe("Real Life Case Review Flow", () => {
  test("intake form without strategy, session creation, 15+ arguments and case-aligned cross-questions", async ({ page }) => {
    // 1. Set role to normal_user
    await setRole(page, "normal_user", "test-user-real-life");

    // 2. Navigate to real-life case intake page
    await page.goto("/nyaybandhu/real-life");

    // 3. Confirm Opposing Strategy selector is NOT visible
    await expect(page.getByText("Opposing Counsel Strategy")).toHaveCount(0);
    await expect(page.getByText("Textualist")).toHaveCount(0);

    // 4. Submit a real-life Landlord-Tenant case
    console.log("Current page content:", await page.content());
    await page.fill('input[type="text"]', "Landlord Withholding 35k Deposit");
    await page.fill('textarea', "My landlord is refusing to return my security deposit of Rs 35,000 after I moved out of the flat. I lived there for 3 years.");
    
    // Submit
    await page.click('button[type="submit"]');

    // 5. Verify redirection to the session page
    await page.waitForURL(/\/nyaybandhu\/[a-f0-9-]+/);
    const url = page.url();
    expect(url).toContain("/nyaybandhu/");

    // 6. Click "Start Case Review"
    await page.click('button:has-text("Start Case Review")');

    // 7. Wait for Card 1 (Cross-Question - Challenge Review) to appear
    const card1Header = page.getByText("Cross-Question — Challenge Review");
    await expect(card1Header).toBeVisible({ timeout: 15000 });

    // Verify the question aligns with Landlord-Tenant case
    await expect(page.getByText("Do you have a signed lease agreement and proof of deposit payment?")).toBeVisible();

    // Answer Card 1
    await page.click('button:has-text("Yes, I have a signed agreement and deposit receipts.")');

    // Click "Continue Case Review"
    await page.click('button:has-text("Continue Case Review")');

    // 8. Wait for Card 2 (Cross-Question - Guide) to appear
    const card2Header = page.getByText("Cross-Question — Guide");
    await expect(card2Header).toBeVisible({ timeout: 15000 });

    // Verify the question aligns with Landlord-Tenant case
    await expect(page.getByText("Has the landlord provided any written list of damages or reason for withholding?")).toBeVisible();

    // Answer Card 2
    await page.click('button:has-text("No, they blocked me or refused to give any explanation.")');

    // Click "Continue Case Review"
    await page.click('button:has-text("Continue Case Review")');

    // 9. Wait for the debate to finalize and show the Get Case Guidance Report button
    const getReportBtn = page.getByRole("button", { name: /Get Case Guidance Report/i });
    await expect(getReportBtn).toBeVisible({ timeout: 20000 });

    // Click Get Case Guidance Report to finalize
    await getReportBtn.click();

    // 10. Verify final guidance report elements are visible
    await expect(page.getByText("Your Case Guidance Report")).toBeVisible();
    await expect(page.getByText("Strong enough to explore further")).toBeVisible();
    
    // Check that we have at least 15 arguments in the transcript
    const argumentParagraphs = page.locator("p.text-muted-foreground");
    const count = await argumentParagraphs.count();
    console.log(`Number of arguments rendered in E2E: ${count}`);
    expect(count).toBeGreaterThanOrEqual(15);
  });
});
