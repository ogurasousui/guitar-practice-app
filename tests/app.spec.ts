import { expect, test } from "@playwright/test";

test("plays the selected two-bar phrase and persists BPM", async ({ page }) => {
  await page.goto("./");

  await expect(
    page.getByRole("heading", { name: "Guitar Practice" }),
  ).toBeVisible();
  await expect(page.locator(".tab-notation-canvas svg").first()).toBeVisible();

  const firstCard = page.locator("article").first();
  await firstCard.getByRole("button", { name: "Preview" }).click();
  await expect(firstCard.getByRole("button", { name: "Stop" })).toBeVisible();
  await firstCard.getByRole("button", { name: "Stop" }).click();
  await expect(firstCard.getByRole("button", { name: "Preview" })).toBeVisible();

  const twoBarCard = page.locator("article").filter({ hasText: "Two Bar Run" });
  await twoBarCard.getByRole("button", { name: "Practice" }).click();
  await expect(page.locator(".meter-band")).toContainText("Two Bar Run");

  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.locator(".meter-band")).toContainText("Playing");
  await expect(page.locator(".meter-band")).toContainText(/Bar 1\/2 beat \d\/4/);

  await page.getByLabel("BPM").evaluate((element) => {
    const input = element as HTMLInputElement;
    const setValue = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;

    setValue?.call(input, "120");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.locator(".bpm-control strong")).toHaveText("120");

  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.locator(".meter-band")).toContainText("Drums + Bass");

  await page.reload();
  await expect(page.locator(".bpm-control strong")).toHaveText("120");
  await expect(page.locator(".meter-band")).toContainText("Two Bar Run");
});

test("fits the mobile viewport without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await expect(page.locator(".tab-notation-canvas svg").first()).toBeVisible();

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  expect(horizontalOverflow).toBeLessThanOrEqual(1);
});
