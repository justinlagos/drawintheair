/**
 * E2E Playwright test: Full classroom activity lifecycle.
 *
 * Requires:
 *   - `npm run dev` running on http://localhost:5175
 *   - Supabase local/dev with migrations applied
 *   - A teacher test account
 *
 * This test opens TWO isolated browser contexts:
 *   TEACHER: signs in, starts a class, picks an activity
 *   STUDENT: joins the class, waits, receives the activity
 *
 * Run:
 *   npx playwright test tests/e2e-playwright/classroom-flow.spec.ts
 *
 * Or with Playwright UI:
 *   npx playwright test --ui
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';

const TEACHER_URL = 'http://localhost:5175/class';
const STUDENT_URL = 'http://localhost:5175/join';

// Configure via env vars or defaults
const TEACHER_EMAIL = process.env.TEACHER_EMAIL || 'test-teacher@example.com';
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || 'test-password';

test.describe('Full classroom activity flow', () => {
  let teacherPage: Page;
  let studentPage: Page;
  let studentContext: BrowserContext;
  let classCode: string;

  test.beforeEach(async ({ browser }) => {
    // Create two completely isolated browser contexts
    const teacherContext = await browser.newContext();
    teacherPage = await teacherContext.newPage();

    studentContext = await browser.newContext();
    studentPage = await studentContext.newPage();
  });

  test.afterEach(async () => {
    await teacherPage?.close();
    await studentPage?.close();
  });

  test('1. Teacher signs in and starts a class', async () => {
    // Teacher: sign in via Google (or test auth flow)
    await teacherPage.goto(TEACHER_URL);
    await teacherPage.waitForLoadState('networkidle');

    // Check teacher sees the "Start Class" dashboard
    await expect(teacherPage.locator('text=Start Class')).toBeVisible({ timeout: 15000 });

    // Click Start Class
    await teacherPage.click('text=Start Class');

    // Wait for the class code to appear
    const codeElement = teacherPage.locator('.cd-code-value');
    await expect(codeElement).toBeVisible({ timeout: 10000 });
    classCode = await codeElement.textContent() || '';
    expect(classCode).toMatch(/^\d{4}$/);

    // Verify session is in lobby (waiting)
    await expect(teacherPage.locator('text=Waiting')).toBeVisible({ timeout: 5000 });
  });

  test('2. Student joins with the class code', async () => {
    // First: teacher starts class
    await teacherPage.goto(TEACHER_URL);
    await teacherPage.waitForLoadState('networkidle');
    await teacherPage.click('text=Start Class');
    const codeElement = teacherPage.locator('.cd-code-value');
    await expect(codeElement).toBeVisible({ timeout: 10000 });
    classCode = await codeElement.textContent() || '';

    // Student: navigate to /join
    await studentPage.goto(STUDENT_URL);
    await studentPage.waitForLoadState('networkidle');

    // Enter the 4-digit code
    for (let i = 0; i < 4; i++) {
      await studentPage.locator('.cm-code-input').nth(i).fill(classCode[i]);
    }
    await studentPage.click('text=Next');

    // Verify student sees name entry form
    await expect(studentPage.locator('text=What\\\'s your name?')).toBeVisible({ timeout: 5000 });

    // Enter name and join
    await studentPage.locator('.cm-name-input').fill('Ebby');
    await studentPage.click('text=Join class');

    // Verify student transitions AWAY from name entry
    // Should now see the waiting screen
    await expect(studentPage.locator('.cd-student-shell')).toBeVisible({ timeout: 10000 });
    await expect(studentPage.locator('text=You\\\'re in!')).toBeVisible({ timeout: 5000 });

    // Verify teacher sees Ebby in the roster
    await expect(teacherPage.locator('text=Ebby')).toBeVisible({ timeout: 10000 });
  });

  test('3. Teacher starts Bubble Pop - student receives it automatically', async () => {
    // Setup: teacher starts class, student joins
    await teacherPage.goto(TEACHER_URL);
    await teacherPage.waitForLoadState('networkidle');
    await teacherPage.click('text=Start Class');
    const codeElement = teacherPage.locator('.cd-code-value');
    await expect(codeElement).toBeVisible({ timeout: 10000 });
    classCode = await codeElement.textContent() || '';

    await studentPage.goto(STUDENT_URL);
    await studentPage.waitForLoadState('networkidle');
    for (let i = 0; i < 4; i++) {
      await studentPage.locator('.cm-code-input').nth(i).fill(classCode[i]);
    }
    await studentPage.click('text=Next');
    await expect(studentPage.locator('text=What\\\'s your name?')).toBeVisible({ timeout: 5000 });
    await studentPage.locator('.cm-name-input').fill('Ebby');
    await studentPage.click('text=Join class');
    await expect(studentPage.locator('.cd-student-shell')).toBeVisible({ timeout: 10000 });
    await expect(teacherPage.locator('text=Ebby')).toBeVisible({ timeout: 10000 });

    // Teacher: click Bubble Pop (or whatever the first activity is)
    // The ActivityLauncher shows SCOREABLE_MODES
    const bubblePopButton = teacherPage.locator('.cm-activity-card').first();
    await expect(bubblePopButton).toBeVisible({ timeout: 5000 });
    await bubblePopButton.click();

    // Teacher: confirm the backend response shows active status
    // The loading spinner appears while the RPC executes
    await expect(teacherPage.locator('.cd-now')).toBeVisible({ timeout: 10000 });

    // Verify teacher sees "Now playing" panel
    await expect(teacherPage.locator('text=Now playing')).toBeVisible({ timeout: 5000 });

    // Student: should automatically transition from waiting to playing
    // WITHOUT any manual refresh or second join
    await expect(studentPage.locator('.cd-student-pip')).toBeVisible({ timeout: 15000 });
    await expect(studentPage.locator('text=Ebby')).toBeVisible({ timeout: 5000 });

    // The student should be in the game (not the waiting screen)
    await expect(studentPage.locator('text=You\\\'re in!')).not.toBeVisible({ timeout: 3000 });
  });

  test('4. Teacher ends activity - student sees between-activities', async () => {
    // Setup: full join + start activity
    await setupFullSession(teacherPage, studentPage);

    // Teacher ends the activity
    const endButton = teacherPage.locator('text=End activity');
    await expect(endButton).toBeVisible({ timeout: 5000 });
    await endButton.click();

    // Student should see "Great job!" or between-activities message
    await expect(studentPage.locator('text=Great job!')).toBeVisible({ timeout: 10000 });
  });

  test('5. Teacher ends class - student sees finished', async () => {
    // Setup: full join + start activity
    await setupFullSession(teacherPage, studentPage);

    // Teacher ends the class
    const endClassButton = teacherPage.locator('text=End class');
    await expect(endClassButton).toBeVisible({ timeout: 5000 });

    // Hold-to-confirm mechanism, need to hold the button
    await endClassButton.dispatchEvent('mousedown');
    await teacherPage.waitForTimeout(2500);
    await endClassButton.dispatchEvent('mouseup');

    // Student should see "Great class!" or class-finished message
    await expect(studentPage.locator('text=Great class!')).toBeVisible({ timeout: 15000 });
  });

  test('6. Refresh restores student session', async () => {
    // Setup: full join
    await setupFullSession(teacherPage, studentPage);

    // Refresh student page
    await studentPage.reload();
    await studentPage.waitForLoadState('networkidle');

    // Student should be restored to the classroom (not asked to re-enter code)
    await expect(studentPage.locator('.cd-student-shell')).toBeVisible({ timeout: 10000 });

    // Student name should appear
    await expect(studentPage.locator('text=Ebby')).toBeVisible({ timeout: 5000 });
  });
});

/**
 * Helper: sets up teacher class + student join + activity start.
 */
async function setupFullSession(teacherPage: Page, studentPage: Page) {
  // Teacher starts class
  await teacherPage.goto(TEACHER_URL);
  await teacherPage.waitForLoadState('networkidle');
  await teacherPage.click('text=Start Class');
  const codeElement = teacherPage.locator('.cd-code-value');
  await expect(codeElement).toBeVisible({ timeout: 10000 });
  const classCode = await codeElement.textContent() || '';

  // Student joins
  await studentPage.goto(STUDENT_URL);
  await studentPage.waitForLoadState('networkidle');
  for (let i = 0; i < 4; i++) {
    await studentPage.locator('.cm-code-input').nth(i).fill(classCode[i]);
  }
  await studentPage.click('text=Next');
  await expect(studentPage.locator('text=What\\\'s your name?')).toBeVisible({ timeout: 5000 });
  await studentPage.locator('.cm-name-input').fill('Ebby');
  await studentPage.click('text=Join class');
  await expect(studentPage.locator('.cd-student-shell')).toBeVisible({ timeout: 10000 });
  await expect(teacherPage.locator('text=Ebby')).toBeVisible({ timeout: 10000 });

  // Teacher starts the first activity
  const activityButton = teacherPage.locator('.cm-activity-card').first();
  await expect(activityButton).toBeVisible({ timeout: 5000 });
  await activityButton.click();

  // Wait for teacher to confirm activity started
  await expect(teacherPage.locator('.cd-now')).toBeVisible({ timeout: 10000 });
  await expect(studentPage.locator('.cd-student-pip')).toBeVisible({ timeout: 15000 });
}
