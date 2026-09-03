import { expect, test, type Page } from '@playwright/test';

async function openLogin(page: Page) {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Sign in to Learnspace', level: 1 }),
  ).toBeVisible();
}

test('login exposes a semantic, named document baseline', async ({ page }) => {
  await openLogin(page);

  await expect(page).toHaveTitle(/\S/);
  await expect(page.locator('html')).toHaveAttribute(
    'lang',
    /^[a-z]{2}(?:-|$)/i,
  );
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Continue with Google' }),
  ).toBeVisible();

  const violations = await page.evaluate(() => {
    const visible = (element: Element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      );
    };

    const duplicateIds = Array.from(
      document.querySelectorAll<HTMLElement>('[id]'),
    )
      .map((element) => element.id)
      .filter((id) => id.length > 0)
      .filter((id, index, ids) => ids.indexOf(id) !== index);

    const unnamedControls = Array.from(
      document.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, textarea, [role="button"], [role="link"]',
      ),
    )
      .filter(visible)
      .filter((element) => {
        const labelledBy = element.getAttribute('aria-labelledby');
        const labelledText = labelledBy
          ?.split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
          .join(' ')
          .trim();
        const associatedLabel =
          element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement
            ? element.labels?.length
            : 0;
        return !(
          element.getAttribute('aria-label')?.trim() ||
          labelledText ||
          associatedLabel ||
          element.textContent?.trim() ||
          element.getAttribute('title')?.trim() ||
          (element instanceof HTMLInputElement && element.value.trim())
        );
      })
      .map((element) => element.outerHTML.slice(0, 200));

    const unnamedImages = Array.from(
      document.querySelectorAll<HTMLImageElement>('img'),
    )
      .filter(visible)
      .filter(
        (image) =>
          !image.hasAttribute('alt') && !image.getAttribute('aria-label'),
      )
      .map((image) => image.outerHTML.slice(0, 200));

    return {
      duplicateIds: Array.from(new Set(duplicateIds)),
      unnamedControls,
      unnamedImages,
    };
  });

  expect(violations).toEqual({
    duplicateIds: [],
    unnamedControls: [],
    unnamedImages: [],
  });
});

test('login action is keyboard reachable and keyboard activatable', async ({
  page,
}) => {
  await openLogin(page);

  const login = page.getByRole('button', { name: 'Continue with Google' });
  await page.keyboard.press('Tab');
  await expect(login).toBeFocused();
  await expect(login).toMatchAriaSnapshot(`- button "Continue with Google"`);
  expect(
    await login.evaluate((element) => element.matches(':focus-visible')),
  ).toBe(true);

  const authRequest = page.waitForRequest((request) =>
    request.url().includes('/api/v1/auth/login'),
  );
  await page.route('**/api/v1/auth/login**', (route) =>
    route.fulfill({ status: 204, body: '' }),
  );
  await page.keyboard.press('Enter');
  await authRequest;
});

test('login reflows without document-level horizontal scrolling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await openLogin(page);

  const overflow = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));

  expect(overflow.documentWidth).toBeLessThanOrEqual(
    overflow.viewportWidth + 1,
  );
  await expect(
    page.getByRole('button', { name: 'Continue with Google' }),
  ).toBeVisible();
});

test('settled login honors the reduced-motion browser preference', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openLogin(page);

  expect(
    await page.evaluate(
      () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    ),
  ).toBe(true);

  const continuousAnimations = await page.evaluate(
    () =>
      document.getAnimations().filter((animation) => {
        const timing = animation.effect?.getComputedTiming();
        return (
          timing?.iterations === Infinity && animation.playState === 'running'
        );
      }).length,
  );
  expect(continuousAnimations).toBe(0);
});
