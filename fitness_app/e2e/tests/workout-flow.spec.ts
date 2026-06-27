import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * E2E: completing both exercises today must persist and advance tomorrow's reps.
 *
 * Strategy:
 *  1. Create a fresh user via /users.
 *  2. GET /today → expect day 1, 9 reps.
 *  3. POST /today/check pushups + situps → completed=true.
 *  4. GET /today again → still day 1 (same calendar day) but completed.
 *  5. Assert /history contains today's log with target_reps=9, day_number=1, completed=true.
 *
 *  The "next day's reps" invariant is verified by the unit test
 *  `test_thirty_day_streak_advances_correctly`; this E2E proves the
 *  HTTP layer + DB persistence wire up correctly to feed it.
 */

async function newUser(api: APIRequestContext) {
  const email = `runner+${Date.now()}@fitness.test`;
  const res = await api.post('/users', {
    data: { email, name: 'E2E Runner' },
  });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()) as { id: number; email: string };
}

test('Day 1 starts at 9 reps for both exercises', async ({ request }) => {
  const user = await newUser(request);
  const res = await request.get(`/users/${user.id}/workouts/today`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.day_number).toBe(1);
  expect(body.target_reps).toBe(9);
  expect(body.pushups_done).toBe(false);
  expect(body.situps_done).toBe(false);
  expect(body.completed).toBe(false);
});

test('Checking both exercises marks the day complete', async ({ request }) => {
  const user = await newUser(request);

  const pushupsRes = await request.post(
    `/users/${user.id}/workouts/today/check`,
    { data: { exercise: 'pushups', done: true } },
  );
  expect(pushupsRes.ok()).toBeTruthy();
  const afterPushups = await pushupsRes.json();
  expect(afterPushups.pushups_done).toBe(true);
  expect(afterPushups.completed).toBe(false);

  const situpsRes = await request.post(
    `/users/${user.id}/workouts/today/check`,
    { data: { exercise: 'situps', done: true } },
  );
  expect(situpsRes.ok()).toBeTruthy();
  const afterSitups = await situpsRes.json();
  expect(afterSitups.situps_done).toBe(true);
  expect(afterSitups.completed).toBe(true);
  expect(afterSitups.day_number).toBe(1);
  expect(afterSitups.target_reps).toBe(9);
});

test('Completed day is persisted in workout history', async ({ request }) => {
  const user = await newUser(request);
  await request.post(`/users/${user.id}/workouts/today/check`, {
    data: { exercise: 'pushups', done: true },
  });
  await request.post(`/users/${user.id}/workouts/today/check`, {
    data: { exercise: 'situps', done: true },
  });

  const historyRes = await request.get(`/users/${user.id}/workouts/history`);
  expect(historyRes.ok()).toBeTruthy();
  const history = (await historyRes.json()) as Array<{
    day_number: number;
    target_reps: number;
    completed: boolean;
  }>;
  expect(history.length).toBe(1);
  expect(history[0]).toMatchObject({
    day_number: 1,
    target_reps: 9,
    completed: true,
  });

  const userRes = await request.get(`/users/${user.id}`);
  const userBody = await userRes.json();
  expect(userBody.current_day).toBe(1);
  expect(userBody.last_completed).toBeTruthy();
});

test('Unchecking an exercise reverts completion state', async ({ request }) => {
  const user = await newUser(request);
  await request.post(`/users/${user.id}/workouts/today/check`, {
    data: { exercise: 'pushups', done: true },
  });
  await request.post(`/users/${user.id}/workouts/today/check`, {
    data: { exercise: 'situps', done: true },
  });
  const undo = await request.post(`/users/${user.id}/workouts/today/check`, {
    data: { exercise: 'pushups', done: false },
  });
  const body = await undo.json();
  expect(body.pushups_done).toBe(false);
  expect(body.completed).toBe(false);
});
