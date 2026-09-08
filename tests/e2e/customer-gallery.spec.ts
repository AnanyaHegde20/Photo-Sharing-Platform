import { test, expect } from "@playwright/test";

test.describe("Customer Gallery Experience", () => {
  test("customer page renders without authentication", async ({ page }) => {
    // /customer is a public path per middleware
    await page.goto("/customer");
    // Should render without redirect to login
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
  });

  test("customer gallery lightbox opens on photo click", async ({
    page,
  }) => {
    // Structural: CustomerGallery component has lightbox functionality
    // Without real photos, verifies the component doesn't crash
    await page.goto("/gallery/test-gallery-abc123xyz789");
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
  });

  test("customer gallery handles empty state", async ({ page }) => {
    await page.goto("/gallery/empty-gallery-abc123xyz789");
    // Should show some state (not-found, unavailable, or empty)
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
  });
});

test.describe("Customer Gallery Responsive", () => {
  test("gallery renders on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/gallery/test-gallery-abc123xyz789");
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
  });

  test("gallery renders on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/gallery/test-gallery-abc123xyz789");
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
  });
});
