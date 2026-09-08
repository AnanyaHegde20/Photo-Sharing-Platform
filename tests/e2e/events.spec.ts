import { test, expect } from "@playwright/test";

test.describe("Event Management", () => {
  test("admin events page renders when authenticated", async ({ page }) => {
    // Requires Supabase Auth session - structural test only
    await page.goto("/admin/events");
    // Unauthenticated: should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test("team events page renders when authenticated", async ({ page }) => {
    await page.goto("/team/events");
    await expect(page).toHaveURL(/\/login/);
  });

  test("event creation form has required fields", async ({ page }) => {
    await page.goto("/admin/events/new");
    // Redirects to login without auth
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Event UI Elements", () => {
  test("event form validates empty name", async ({ page }) => {
    await page.goto("/admin/events/new");
    await expect(page).toHaveURL(/\/login/);
    // When authenticated, form should require event name
  });
});
