import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GODSPEED_TASKS_URL, createTask, describeFailure, summarizeResults } from '../src/godspeed.ts';
import type { HttpRequest, HttpResponse } from '../src/godspeed.ts';

function fakeRequest(response: HttpResponse | Error) {
  const calls: HttpRequest[] = [];
  const request = async (req: HttpRequest) => {
    calls.push(req);
    if (response instanceof Error) throw response;
    return response;
  };
  return { request, calls };
}

test('creates a task with the right URL, method, headers and body', async () => {
  const { request, calls } = fakeRequest({ status: 200, text: '{"id":"t1"}' });
  await createTask(request, 'secret-key', { title: 'title: A link: obsidian://x', list_id: 'l1' });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.godspeedapp.com/tasks');
  assert.equal(calls[0].url, GODSPEED_TASKS_URL);
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].headers.Authorization, 'Bearer secret-key');
  assert.equal(calls[0].headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(calls[0].body), { title: 'title: A link: obsidian://x', list_id: 'l1' });
});

test('an empty or non-JSON success body is not a failure', async () => {
  await createTask(fakeRequest({ status: 201, text: '' }).request, 'k', { title: 't' });
  await createTask(fakeRequest({ status: 200, text: 'OK' }).request, 'k', { title: 't' });
});

test('the API\'s message or error field is used for a failure', async () => {
  await assert.rejects(
    createTask(fakeRequest({ status: 401, text: '{"message":"Bad token"}' }).request, 'k', { title: 't' }),
    { message: 'Bad token' }
  );
  await assert.rejects(
    createTask(fakeRequest({ status: 400, text: '{"error":"Invalid list"}' }).request, 'k', { title: 't' }),
    { message: 'Invalid list' }
  );
});

test('with no readable message the status and body are shown', async () => {
  assert.equal(describeFailure(500, 'boom'), 'HTTP 500: boom');
  assert.equal(describeFailure(404, '{}'), 'HTTP 404');
  await assert.rejects(
    createTask(fakeRequest({ status: 502, text: '<html>Bad gateway</html>' }).request, 'k', { title: 't' }),
    { message: 'HTTP 502: <html>Bad gateway</html>' }
  );
});

test('a network failure surfaces as an error', async () => {
  await assert.rejects(
    createTask(fakeRequest(new Error('net::ERR_INTERNET_DISCONNECTED')).request, 'k', { title: 't' }),
    { message: 'net::ERR_INTERNET_DISCONNECTED' }
  );
});

test('one success: "Sent successfully" for 3 seconds', () => {
  assert.deepEqual(summarizeResults([{ name: 'A' }]), [
    { type: 'success', message: 'Sent successfully', duration: 3000 },
  ]);
});

test('several successes give a count', () => {
  assert.deepEqual(summarizeResults([{ name: 'A' }, { name: 'B' }, { name: 'C' }]), [
    { type: 'success', message: '3 notes sent successfully', duration: 3000 },
  ]);
});

test('every failure gets its own message for 10 seconds', () => {
  assert.deepEqual(
    summarizeResults([
      { name: 'A', error: new Error('Bad token') },
      { name: 'B', error: new Error('HTTP 500') },
    ]),
    [
      { type: 'error', message: 'Failed to send "A": Bad token', duration: 10000 },
      { type: 'error', message: 'Failed to send "B": HTTP 500', duration: 10000 },
    ]
  );
});

test('a mix shows the count that worked and each failure', () => {
  assert.deepEqual(
    summarizeResults([{ name: 'A' }, { name: 'B', error: new Error('nope') }, { name: 'C' }]),
    [
      { type: 'success', message: '2 of 3 notes sent successfully', duration: 3000 },
      { type: 'error', message: 'Failed to send "B": nope', duration: 10000 },
    ]
  );
});

test('nothing sent, nothing to say', () => {
  assert.deepEqual(summarizeResults([]), []);
});
