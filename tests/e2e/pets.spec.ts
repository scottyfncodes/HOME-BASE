import { expect, test } from "@playwright/test";

/** Add a pet → log a vet visit with a cost → vaccination → routine done → expense → preparedness lists the pet. */
test("a household can care for a pet end to end", async ({ page }) => {
  const email = `pets-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  await page.goto("/sign-up");
  await page.fill("#name", "Pet Owner");
  await page.fill("#email", email);
  await page.fill("#password", "a-long-passphrase-123");
  await page.click("button[type=submit]");
  await page.waitForURL("**/onboarding**");
  await page.fill("#name", "Pet House");
  await page.click("button[type=submit]");
  await page.waitForURL("**/onboarding?step=rooms");
  await page.click("button[type=submit]");
  await page.waitForURL("**/onboarding?step=first");

  await page.goto("/pets");
  await expect(page.getByText("Who else lives here?")).toBeVisible();
  await page.click("text=Add a dog");
  await page.fill("#name", "Biscuit");
  await page.click("main button[type=submit]");
  await page.waitForURL(/\/pets\/[0-9a-f-]{36}$/);
  const petUrl = page.url();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Biscuit");

  await page.goto(`${petUrl}/health/new?kind=vet_visit`);
  await page.fill("#title", "Annual exam");
  await page.fill("#cost", "120");
  await page.click("main button[type=submit]");
  await page.waitForURL(/\/health$/);
  await expect(page.getByText("Annual exam")).toBeVisible();

  await page.goto(`${petUrl}/vaccinations/new?name=Rabies`);
  await page.click("main button[type=submit]");
  await page.waitForURL(/\/health$/);
  await expect(page.getByText("No due date")).toBeVisible();

  await page.goto(`${petUrl}/care/new?title=Breakfast&kind=feeding&recurrence=1-day`);
  await page.click("main button[type=submit]");
  await page.waitForURL(/\/care$/);
  await page.click("button:has-text('Mark done')");
  await expect(page.getByText("Recently done")).toBeVisible();

  await page.goto(`${petUrl}/expenses`);
  await expect(page.getByText("Annual exam")).toBeVisible();
  await expect(page.getByText("$120.00")).toBeVisible();

  await page.goto("/preparedness");
  await expect(page.getByText("If you have to leave, Biscuit comes with you.", { exact: false })).toBeVisible();
});
