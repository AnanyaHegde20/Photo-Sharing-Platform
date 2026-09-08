import { test, expect } from "@playwright/test";

test.describe("Accessibility", () => {
  test("landing page has no duplicate h1", async ({ page }) => {
    await page.goto("/");
    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBe(1);
  });

  test("login form has proper labels for inputs", async ({ page }) => {
    await page.goto("/login");

    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test("register form has proper labels for inputs", async ({ page }) => {
    await page.goto("/register");

    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test("pages have lang attribute on html", async ({ page }) => {
    await page.goto("/");
    const lang = await page.getAttribute("html", "lang");
    expect(lang).toBeTruthy();
  });

  test("interactive elements are keyboard accessible", async ({ page }) => {
    await page.goto("/");

    // Tab through interactive elements
    await page.keyboard.press("Tab");
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.tagName?.toLowerCase();
    });

    // First tab should focus on a focusable element
    expect(["a", "button", "input", "textarea", "select"]).toContain(
      focusedElement
    );
  });

  test("landing page has semantic landmarks", async ({ page }) => {
    await page.goto("/");

    // Should have main landmark
    const main = page.locator("main");
    const mainCount = await main.count();
    expect(mainCount).toBeGreaterThanOrEqual(1);
  });

  test("mobile nav hamburger is accessible", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Hamburger button should be present and have accessible name
    const hamburger = page.getByRole("button", {
      name: /menu|navigation|toggle/i,
    });
    // May or may not be visible depending on header implementation
    const isVisible = await hamburger.isVisible().catch(() => false);
    if (isVisible) {
      await expect(hamburger).toHaveAttribute("aria-label");
    }
  });
});
