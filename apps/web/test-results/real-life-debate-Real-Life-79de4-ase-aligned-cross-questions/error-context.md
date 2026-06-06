# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: real-life-debate.spec.ts >> Real Life Case Review Flow >> intake form without strategy, session creation, 15+ arguments and case-aligned cross-questions
- Location: e2e\real-life-debate.spec.ts:16:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('textarea')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e7]:
        - heading "Sign in to Nayak_" [level=1] [ref=e8]
        - paragraph [ref=e9]: Welcome back! Please sign in to continue
      - generic [ref=e10]:
        - button "Sign in with Google Continue with Google" [ref=e13] [cursor=pointer]:
          - generic [ref=e14]:
            - generic "Sign in with Google" [ref=e16]
            - generic [ref=e17]: Continue with Google
        - paragraph [ref=e20]: or
        - generic [ref=e22]:
          - generic [ref=e23]:
            - generic [ref=e26]:
              - generic [ref=e28]: Email address
              - textbox "Email address" [active] [ref=e29]:
                - /placeholder: Enter your email address
                - text: Landlord Withholding 35k Deposit
            - generic:
              - generic:
                - generic:
                  - generic:
                    - generic: Password
                  - generic:
                    - textbox "Password":
                      - /placeholder: Enter your password
                    - button "Show password":
                      - img
          - button "Continue" [ref=e32] [cursor=pointer]:
            - generic [ref=e33]:
              - text: Continue
              - img [ref=e34]
    - generic [ref=e36]:
      - generic [ref=e37]:
        - generic [ref=e38]: Don’t have an account?
        - link "Sign up" [ref=e39] [cursor=pointer]:
          - /url: http://localhost:3000/sign-up#/?redirect_url=http%3A%2F%2Flocalhost%3A3000%2Fnyaybandhu%2Freal-life
      - generic [ref=e41]:
        - generic [ref=e43]:
          - paragraph [ref=e44]: Secured by
          - link "Clerk logo" [ref=e45] [cursor=pointer]:
            - /url: https://go.clerk.com/components
            - img [ref=e46]
        - paragraph [ref=e51]: Development mode
  - button "Open Next.js Dev Tools" [ref=e57] [cursor=pointer]:
    - img [ref=e58]
  - alert [ref=e61]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | async function setRole(page: any, role: string, userId: string) {
  4  |   await page.goto("/settings");
  5  |   await page.evaluate(
  6  |     ({ roleValue, userIdValue }) => {
  7  |       localStorage.setItem("nayak.role", roleValue);
  8  |       localStorage.setItem("nayak.user_id", userIdValue);
  9  |       window.dispatchEvent(new Event("nayak-session-context-changed"));
  10 |     },
  11 |     { roleValue: role, userIdValue: userId }
  12 |   );
  13 | }
  14 | 
  15 | test.describe("Real Life Case Review Flow", () => {
  16 |   test("intake form without strategy, session creation, 15+ arguments and case-aligned cross-questions", async ({ page }) => {
  17 |     // 1. Set role to normal_user
  18 |     await setRole(page, "normal_user", "test-user-real-life");
  19 | 
  20 |     // 2. Navigate to real-life case intake page
  21 |     await page.goto("/nyaybandhu/real-life");
  22 | 
  23 |     // 3. Confirm Opposing Strategy selector is NOT visible
  24 |     await expect(page.getByText("Opposing Counsel Strategy")).toHaveCount(0);
  25 |     await expect(page.getByText("Textualist")).toHaveCount(0);
  26 | 
  27 |     // 4. Submit a real-life Landlord-Tenant case
  28 |     console.log("Current page content:", await page.content());
  29 |     await page.fill('input[type="text"]', "Landlord Withholding 35k Deposit");
> 30 |     await page.fill('textarea', "My landlord is refusing to return my security deposit of Rs 35,000 after I moved out of the flat. I lived there for 3 years.");
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  31 |     
  32 |     // Submit
  33 |     await page.click('button[type="submit"]');
  34 | 
  35 |     // 5. Verify redirection to the session page
  36 |     await page.waitForURL(/\/nyaybandhu\/[a-f0-9-]+/);
  37 |     const url = page.url();
  38 |     expect(url).toContain("/nyaybandhu/");
  39 | 
  40 |     // 6. Click "Start Case Review"
  41 |     await page.click('button:has-text("Start Case Review")');
  42 | 
  43 |     // 7. Wait for Card 1 (Cross-Question - Challenge Review) to appear
  44 |     const card1Header = page.getByText("Cross-Question — Challenge Review");
  45 |     await expect(card1Header).toBeVisible({ timeout: 15000 });
  46 | 
  47 |     // Verify the question aligns with Landlord-Tenant case
  48 |     await expect(page.getByText("Do you have a signed lease agreement and proof of deposit payment?")).toBeVisible();
  49 | 
  50 |     // Answer Card 1
  51 |     await page.click('button:has-text("Yes, I have a signed agreement and deposit receipts.")');
  52 | 
  53 |     // Click "Continue Case Review"
  54 |     await page.click('button:has-text("Continue Case Review")');
  55 | 
  56 |     // 8. Wait for Card 2 (Cross-Question - Guide) to appear
  57 |     const card2Header = page.getByText("Cross-Question — Guide");
  58 |     await expect(card2Header).toBeVisible({ timeout: 15000 });
  59 | 
  60 |     // Verify the question aligns with Landlord-Tenant case
  61 |     await expect(page.getByText("Has the landlord provided any written list of damages or reason for withholding?")).toBeVisible();
  62 | 
  63 |     // Answer Card 2
  64 |     await page.click('button:has-text("No, they blocked me or refused to give any explanation.")');
  65 | 
  66 |     // Click "Continue Case Review"
  67 |     await page.click('button:has-text("Continue Case Review")');
  68 | 
  69 |     // 9. Wait for the debate to finalize and show the Get Case Guidance Report button
  70 |     const getReportBtn = page.getByRole("button", { name: /Get Case Guidance Report/i });
  71 |     await expect(getReportBtn).toBeVisible({ timeout: 20000 });
  72 | 
  73 |     // Click Get Case Guidance Report to finalize
  74 |     await getReportBtn.click();
  75 | 
  76 |     // 10. Verify final guidance report elements are visible
  77 |     await expect(page.getByText("Your Case Guidance Report")).toBeVisible();
  78 |     await expect(page.getByText("Strong enough to explore further")).toBeVisible();
  79 |     
  80 |     // Check that we have at least 15 arguments in the transcript
  81 |     const argumentParagraphs = page.locator("p.text-muted-foreground");
  82 |     const count = await argumentParagraphs.count();
  83 |     console.log(`Number of arguments rendered in E2E: ${count}`);
  84 |     expect(count).toBeGreaterThanOrEqual(15);
  85 |   });
  86 | });
  87 | 
```