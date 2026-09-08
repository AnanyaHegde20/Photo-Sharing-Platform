import { test, expect } from "@playwright/test";

test.describe("Authentication Flows", () => {
  test("login page renders with email and password fields", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in|log in|login/i })
    ).toBeVisible();
  });

  test("register page renders with required fields", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByLabel(/full name|name/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign up|register|create/i })
    ).toBeVisible();
  });

  test("login form rejects empty submission", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: /sign in|log in|login/i }).click();

    // Form should still show validation errors or remain on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test("register form rejects empty submission", async ({ page }) => {
    await page.goto("/register");

    await page
      .getByRole("button", { name: /sign up|register|create/i })
      .click();

    await expect(page).toHaveURL(/\/register/);
  });

  test("login page has link to register", async ({ page }) => {
    await page.goto("/login");

    const registerLink = page.getByRole("link", {
      name: /sign up|register|create.*account/i,
    });
    await expect(registerLink).toBeVisible();
  });

  test("register page has link to login", async ({ page }) => {
    await page.goto("/register");

    const loginLink = page.getByRole("link", {
      name: /sign in|log in|login|already.*have.*account/i,
    });
    await expect(loginLink).toBeVisible();
  });
});
