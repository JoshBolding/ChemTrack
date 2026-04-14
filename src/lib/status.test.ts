import { describe, expect, it } from 'vitest';
import { actionsForStatus, isFull, isPartial } from './status';
import type { Tote } from '../types';
import { TOTE_CAPACITY_GAL } from '../types';

function makeTote(overrides: Partial<Tote> = {}): Tote {
  return {
    id: 'RH-260414-001',
    productId: 'prod-a',
    status: 'in_yard',
    location: { kind: 'yard' },
    currentQtyGal: TOTE_CAPACITY_GAL,
    receivedAt: '2026-04-14T00:00:00.000Z',
    createdBy: 'test',
    syncState: 'synced',
    updatedAt: '2026-04-14T00:00:00.000Z',
    updatedBy: 'test',
    ...overrides,
  };
}

describe('actionsForStatus', () => {
  it('in_yard: offers assign + note, no usage or discard', () => {
    const actions = actionsForStatus('in_yard', 'RH-260414-001');
    const ids = actions.map((a) => a.id);
    expect(ids).toContain('assign');
    expect(ids).toContain('note');
    expect(ids).not.toContain('usage');
    expect(ids).not.toContain('discard');
    // Primary action is assign
    const assign = actions.find((a) => a.id === 'assign');
    expect(assign?.tone).toBe('primary');
  });

  it('assigned_to_unit: offers usage, change job, transfer, return, mark empty', () => {
    const actions = actionsForStatus('assigned_to_unit', 'RH-260414-001');
    const ids = actions.map((a) => a.id);
    expect(ids).toEqual(
      expect.arrayContaining(['usage', 'job', 'transfer', 'return', 'empty']),
    );
    expect(ids).not.toContain('discard');
    // Primary action is usage
    expect(actions.find((a) => a.id === 'usage')?.tone).toBe('primary');
    // Transfer routes under the detail base
    expect(actions.find((a) => a.id === 'transfer')?.to).toBe(
      '/tote/RH-260414-001/transfer',
    );
  });

  it('transfer action is only offered for assigned_to_unit', () => {
    for (const status of ['in_yard', 'empty', 'hold', 'discarded'] as const) {
      const ids = actionsForStatus(status, 'RH-260414-001').map((a) => a.id);
      expect(ids).not.toContain('transfer');
    }
  });

  it('empty: offers discard + note only', () => {
    const actions = actionsForStatus('empty', 'RH-260414-001');
    const ids = actions.map((a) => a.id);
    expect(ids).toEqual(['discard', 'note']);
    expect(actions.find((a) => a.id === 'discard')?.tone).toBe('danger');
  });

  it('hold: only offers note', () => {
    const actions = actionsForStatus('hold', 'RH-260414-001');
    expect(actions.map((a) => a.id)).toEqual(['note']);
  });

  it('discarded: terminal state with no actions', () => {
    expect(actionsForStatus('discarded', 'RH-260414-001')).toEqual([]);
  });

  it('routes are scoped under /tote/:id and URI-encode the id', () => {
    const actions = actionsForStatus('in_yard', 'RH-260414-001');
    for (const a of actions) {
      expect(a.to.startsWith('/tote/RH-260414-001/')).toBe(true);
    }
  });

  it('URI-encodes special characters in tote ids', () => {
    const actions = actionsForStatus('in_yard', 'RH foo/bar');
    for (const a of actions) {
      expect(a.to).toContain(encodeURIComponent('RH foo/bar'));
    }
  });
});

describe('isPartial / isFull', () => {
  it('isFull: true when qty >= capacity', () => {
    expect(isFull(makeTote({ currentQtyGal: TOTE_CAPACITY_GAL }))).toBe(true);
    expect(isFull(makeTote({ currentQtyGal: TOTE_CAPACITY_GAL + 1 }))).toBe(
      true,
    );
    expect(isFull(makeTote({ currentQtyGal: TOTE_CAPACITY_GAL - 1 }))).toBe(
      false,
    );
  });

  it('isPartial: true strictly between 0 and capacity', () => {
    expect(isPartial(makeTote({ currentQtyGal: 0 }))).toBe(false);
    expect(isPartial(makeTote({ currentQtyGal: 1 }))).toBe(true);
    expect(isPartial(makeTote({ currentQtyGal: TOTE_CAPACITY_GAL - 1 }))).toBe(
      true,
    );
    expect(isPartial(makeTote({ currentQtyGal: TOTE_CAPACITY_GAL }))).toBe(
      false,
    );
  });

  it('isPartial: a full tote is not partial; an empty tote is not partial', () => {
    expect(isPartial(makeTote({ currentQtyGal: TOTE_CAPACITY_GAL }))).toBe(
      false,
    );
    expect(isPartial(makeTote({ currentQtyGal: 0 }))).toBe(false);
  });
});
