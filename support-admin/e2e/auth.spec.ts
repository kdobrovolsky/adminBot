import { expect, test } from "@playwright/test";

test.describe("guest access", () => {
  test("redirects the root page to login for unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in" }),
    ).toBeVisible();
  });

  test("opens the forgot-password screen from login", async ({ page }) => {
    await page.goto("/login");

    await page.locator('a[href="/forgot-password"]').click();

    await expect(page).toHaveURL(/\/forgot-password$/);
  });
});
