import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTemplate, extractByPath } from './vars.ts';

test('resolveTemplate substitutes known vars', () => {
  const { resolved, missing } = resolveTemplate(
    '/api/v1/events?sessionId=$SESSION_ID&afterSeq=$AFTER_SEQ&limit=100',
    { SESSION_ID: 'ses_demo_01', AFTER_SEQ: '0' },
  );
  assert.equal(resolved, '/api/v1/events?sessionId=ses_demo_01&afterSeq=0&limit=100');
  assert.deepEqual(missing, []);
});

test('resolveTemplate reports missing vars once and leaves tokens intact', () => {
  const { resolved, missing } = resolveTemplate('$SESSION_ID/$SESSION_ID?x=$OTHER', {});
  assert.equal(resolved, '$SESSION_ID/$SESSION_ID?x=$OTHER');
  assert.deepEqual(missing, ['SESSION_ID', 'OTHER']);
});

test('resolveTemplate treats empty string as missing', () => {
  const { missing } = resolveTemplate('$A', { A: '' });
  assert.deepEqual(missing, ['A']);
});

test('resolveTemplate ignores lowercase and mid-word dollars', () => {
  const { resolved, missing } = resolveTemplate('cost is $5 and $home stays', { HOME: 'x' });
  assert.equal(resolved, 'cost is $5 and $home stays');
  assert.deepEqual(missing, []);
});

test('extractByPath walks dot paths and stringifies primitives', () => {
  const body = { id: 'ses_demo_01', nextCursor: { afterSeq: 5 }, ok: true };
  assert.equal(extractByPath(body, 'id'), 'ses_demo_01');
  assert.equal(extractByPath(body, 'nextCursor.afterSeq'), '5');
  assert.equal(extractByPath(body, 'ok'), 'true');
});

test('extractByPath returns undefined for null, missing, and non-primitive targets', () => {
  assert.equal(extractByPath({ nextCursor: null }, 'nextCursor.afterSeq'), undefined);
  assert.equal(extractByPath({}, 'missing.deep'), undefined);
  assert.equal(extractByPath({ a: { b: 1 } }, 'a'), undefined);
});
