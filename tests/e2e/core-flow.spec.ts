import { expect, test } from "@playwright/test";

/** Sign-up → onboarding → inventory → maintenance completion → Vault gate. */
test("a new homeowner can set up, schedule, complete and lock", async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const password = "a-long-passphrase-123";

  await page.goto("/sign-up");
  await page.fill("#name", "E2E Tester");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
  await page.waitForURL("**/onboarding**");

  await page.fill("#name", "Test House");
  await page.click("button[type=submit]");
  await page.waitForURL("**/onboarding?step=rooms");
  await page.click('label:has-text("Kitchen")');
  await page.click("button[type=submit]");
  await page.waitForURL("**/onboarding?step=first");
  await page.fill("#name", "Furnace");
  await page.click("button[type=submit]");
  await page.waitForURL("**/onboarding?step=done");
  await page.click("text=Go to your dashboard");
  await page.waitForURL("**/home");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("E2E");

  await page.goto("/maintenance/new");
  await page.fill("#title", "Change HVAC filter");
  await page.fill("#dueOn", "2026-01-15");
  await page.selectOption("#recurrence", "3-month");
  await page.click("button[type=submit]");
  await page.waitForURL(/\/maintenance\/[0-9a-f-]+$/);
  await page.click("text=Mark complete");
  await page.fill("#completedOn", "2026-01-20");
  await page.click("button[type=submit]");
  await expect(page.getByText("Next due Apr 15, 2026")).toBeVisible();

  await page.goto("/vault");
  await expect(page.getByText("Confirm it is you")).toBeVisible();
  await page.fill("#password", "wrong");
  await page.click("button[type=submit]");
  await expect(page.getByText("not correct")).toBeVisible();
});
