// ------------------------------------------------------------------
// drive-pleya — E2E smoke tests
// ------------------------------------------------------------------
//
// These tests verify the UI shell works correctly.  They do NOT
// depend on the backend — all data-fetch failures are handled
// gracefully by the app's error/loading states.
//
// Prerequisites:
//   Frontend dev server running (Playwright auto-starts it).
//   Backend is optional — tests pass either way.
//
// Run:
//   npx playwright test                 # all browsers
//   npx playwright test --project=chromium  # just Chrome
// ------------------------------------------------------------------

import { test, expect } from "@playwright/test";

// ------------------------------------------------------------------
// home page — shell & navigation
// ------------------------------------------------------------------

test.describe("home page", () => {
  test("renders the app title and navbar", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("header")).toContainText("drive-pleya");
  });

  test("shows either loading or error state (backend may be offline)", async ({ page }) => {
    await page.goto("/");

    // The page starts loading, then either succeeds (backend up) or
    // shows an error (backend down).  Both mean the UI works.
    // We wait until one of these appears — timeout means nothing rendered.
    const settled = page.locator(
      "text=scanning your drive..., " +     // loading
      "text=no videos found on drive, " +   // empty (backend up, no files)
      "text=something went wrong, " +       // generic error
      "text=waking up the server"           // cold start
    );
    await expect(settled.first()).toBeVisible({ timeout: 15_000 });
  });

  test("theme toggle button is present and clickable", async ({ page }) => {
    await page.goto("/");

    const toggle = page.locator('[aria-label="toggle theme"]');
    await expect(toggle).toBeVisible({ timeout: 5_000 });

    // Click it — should not crash the page
    await toggle.click();
    await expect(page.locator("header")).toBeVisible();
  });

  test("theme toggle changes data-theme attribute", async ({ page }) => {
    await page.goto("/");

    const html = page.locator("html");
    const toggle = page.locator('[aria-label="toggle theme"]');

    // Wait for the theme provider to apply the initial theme
    await expect(html).toHaveAttribute("data-theme", /dark|light/, { timeout: 5_000 });

    const before = await html.getAttribute("data-theme");

    await toggle.click();
    // After click, theme should flip
    await expect(html).not.toHaveAttribute("data-theme", before!, { timeout: 3_000 });

    await toggle.click();
    // Should flip back
    await expect(html).toHaveAttribute("data-theme", before!, { timeout: 3_000 });
  });
});

// ------------------------------------------------------------------
// watch page — player shell
// ------------------------------------------------------------------

test.describe("watch page", () => {
  test("shell renders (header + content area)", async ({ page }) => {
    await page.goto("/watch/any-file-id");

    // Header must always be visible
    await expect(page.locator("header")).toContainText("drive-pleya");

    // The page must render something in the main area — loading,
    // error, or cold-start message.  A blank page is a bug.
    const content = page.locator(
      "text=loading video..., " +
      "text=waking up the server, " +
      "text=failed, " +
      "text=back to library"
    );
    await expect(content.first()).toBeVisible({ timeout: 20_000 });
  });
});

// ------------------------------------------------------------------
// responsive design
// ------------------------------------------------------------------

test.describe("responsive design", () => {
  test("navbar is usable on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X
    await page.goto("/");

    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("header")).toContainText("drive-pleya");
    await expect(page.locator('[aria-label="toggle theme"]')).toBeVisible();
  });
});

// ------------------------------------------------------------------
// keyboard — page doesn't crash
// ------------------------------------------------------------------

test.describe("keyboard", () => {
  test("pressing media keys on watch page doesn't crash", async ({ page }) => {
    await page.goto("/watch/any-file-id");

    // Wait for the page to settle (loading or error)
    await page.waitForTimeout(2_000);

    // These keys should not throw or crash the page
    await page.keyboard.press("Space");
    await page.keyboard.press("k");
    await page.keyboard.press("f");
    await page.keyboard.press("m");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowRight");

    // Page should still be alive
    await expect(page.locator("header")).toBeVisible();
  });
});
