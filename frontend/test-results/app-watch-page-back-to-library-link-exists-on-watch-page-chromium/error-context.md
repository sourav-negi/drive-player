# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> watch page >> back to library link exists on watch page
- Location: e2e\app.spec.ts:73:7

# Error details

```
TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('text=loading video..., text=back to library, text=failed') to be visible

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - navigation [ref=e3]:
      - link "drive-pleya" [ref=e4] [cursor=pointer]:
        - /url: /
      - button "toggle theme" [ref=e5]:
        - img [ref=e6]
  - main [ref=e8]:
    - paragraph [ref=e11]: loading video...
  - generic [ref=e16] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e17]:
      - img [ref=e18]
    - generic [ref=e21]:
      - button "Open issues overlay" [ref=e22]:
        - generic [ref=e23]:
          - generic [ref=e24]: "0"
          - generic [ref=e25]: "1"
        - generic [ref=e26]: Issue
      - button "Collapse issues badge" [ref=e27]:
        - img [ref=e28]
  - alert [ref=e30]
```

# Test source

```ts
  1   | // ------------------------------------------------------------------
  2   | // drive-pleya — E2E smoke tests
  3   | // ------------------------------------------------------------------
  4   | //
  5   | // Prerequisites:
  6   | //   1. Backend running on http://localhost:8000 (for data-dependent tests)
  7   | //   2. Frontend dev server (Playwright can start it automatically)
  8   | //
  9   | // Run:  npx playwright test
  10  | // ------------------------------------------------------------------
  11  | 
  12  | import { test, expect } from "@playwright/test";
  13  | 
  14  | // ------------------------------------------------------------------
  15  | // home page
  16  | // ------------------------------------------------------------------
  17  | 
  18  | test.describe("home page", () => {
  19  |   test("renders the app title", async ({ page }) => {
  20  |     await page.goto("/");
  21  |     await expect(page.locator("header")).toContainText("drive-pleya");
  22  |   });
  23  | 
  24  |   test("shows loading state initially", async ({ page }) => {
  25  |     await page.goto("/");
  26  |     // Either a loading spinner or content eventually loads
  27  |     await expect(
  28  |       page.locator("text=scanning your drive...")
  29  |     ).toBeVisible({ timeout: 10_000 });
  30  |   });
  31  | 
  32  |   test("theme toggle switches between light and dark", async ({ page }) => {
  33  |     await page.goto("/");
  34  | 
  35  |     // initial should be dark (default)
  36  |     const html = page.locator("html");
  37  |     await expect(html).toHaveAttribute("data-theme", "dark", { timeout: 5_000 });
  38  | 
  39  |     // click the theme toggle
  40  |     const toggle = page.locator('[aria-label="toggle theme"]');
  41  |     await toggle.click();
  42  | 
  43  |     // should switch to light
  44  |     await expect(html).toHaveAttribute("data-theme", "light");
  45  | 
  46  |     // click again → back to dark
  47  |     await toggle.click();
  48  |     await expect(html).toHaveAttribute("data-theme", "dark");
  49  |   });
  50  | });
  51  | 
  52  | // ------------------------------------------------------------------
  53  | // watch page
  54  | // ------------------------------------------------------------------
  55  | 
  56  | test.describe("watch page", () => {
  57  |   test("navigating to a watch page shows the player shell", async ({ page }) => {
  58  |     // Try navigating with a dummy ID — the page should at least load
  59  |     // (it'll show an error state if the file doesn't exist)
  60  |     await page.goto("/watch/test-id");
  61  | 
  62  |     // The header should still be present
  63  |     await expect(page.locator("header")).toContainText("drive-pleya");
  64  | 
  65  |     // Either loading or error state should appear (not a blank page)
  66  |     await expect(
  67  |       page.locator("text=loading video...")
  68  |         .or(page.locator("text=failed"))
  69  |         .or(page.locator("text=waking up"))
  70  |     ).toBeVisible({ timeout: 15_000 });
  71  |   });
  72  | 
  73  |   test("back to library link exists on watch page", async ({ page }) => {
  74  |     await page.goto("/watch/test-id");
  75  | 
  76  |     // Wait for the page to settle (loading or error)
> 77  |     await page.waitForSelector(
      |                ^ TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
  78  |       'text=loading video..., text=back to library, text=failed',
  79  |       { timeout: 15_000 },
  80  |     );
  81  | 
  82  |     // If the back link appears (after error state), verify it points home
  83  |     const backLink = page.locator("text=back to library");
  84  |     if (await backLink.isVisible({ timeout: 1_000 }).catch(() => false)) {
  85  |       await backLink.click();
  86  |       await expect(page).toHaveURL("/");
  87  |     }
  88  |   });
  89  | });
  90  | 
  91  | // ------------------------------------------------------------------
  92  | // responsive design
  93  | // ------------------------------------------------------------------
  94  | 
  95  | test.describe("responsive design", () => {
  96  |   test("layout adapts on mobile viewport", async ({ page }) => {
  97  |     await page.setViewportSize({ width: 375, height: 812 }); // iPhone X
  98  |     await page.goto("/");
  99  | 
  100 |     // navbar should still be visible and the title should appear
  101 |     await expect(page.locator("header")).toBeVisible();
  102 |     await expect(page.locator("header")).toContainText("drive-pleya");
  103 | 
  104 |     // theme toggle should be present
  105 |     await expect(page.locator('[aria-label="toggle theme"]')).toBeVisible();
  106 |   });
  107 | });
  108 | 
  109 | // ------------------------------------------------------------------
  110 | // keyboard shortcuts (when a video is loaded)
  111 | // ------------------------------------------------------------------
  112 | 
  113 | test.describe("keyboard shortcuts", () => {
  114 |   test("space / k key events don't crash the page on watch route", async ({ page }) => {
  115 |     await page.goto("/watch/test-id");
  116 | 
  117 |     // Wait for the page to load at least partially
  118 |     await page.waitForTimeout(2_000);
  119 | 
  120 |     // Press space — should not crash the page
  121 |     await page.keyboard.press("Space");
  122 | 
  123 |     // Press k — should not crash
  124 |     await page.keyboard.press("k");
  125 | 
  126 |     // Page should still be there
  127 |     await expect(page.locator("header")).toBeVisible();
  128 |   });
  129 | });
  130 | 
```