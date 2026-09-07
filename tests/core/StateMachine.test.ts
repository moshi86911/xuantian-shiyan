import { describe, it, expect } from 'vitest';
import { StateMachine } from '../../src/core/StateMachine';

describe('StateMachine', () => {
  it('starts in initial state', () => {
    const sm = new StateMachine<'idle' | 'loading' | 'done'>('idle');
    expect(sm.state).toBe('idle');
  });

  it('transitions to new state', () => {
    const sm = new StateMachine<'idle' | 'loading' | 'done'>('idle');
    const result = sm.transition('loading');
    expect(result).toBe(true);
    expect(sm.state).toBe('loading');
  });

  it('invokes enter/exit hooks in order', () => {
    const sm = new StateMachine<'a' | 'b'>('a');
    const events: string[] = [];
    sm.onExit('a', () => events.push('exit-a'));
    sm.onEnter('b', () => events.push('enter-b'));
    sm.transition('b');
    expect(events).toEqual(['exit-a', 'enter-b']);
  });

  it('does not transition when guard returns false', () => {
    const sm = new StateMachine<'a' | 'b'>('a');
    sm.guard('b', () => false);
    const result = sm.transition('b');
    expect(result).toBe(false);
    expect(sm.state).toBe('a');
  });

  it('transition succeeds when guard returns true', () => {
    const sm = new StateMachine<'a' | 'b'>('a');
    sm.guard('b', () => true);
    const result = sm.transition('b');
    expect(result).toBe(true);
    expect(sm.state).toBe('b');
  });

  it('multiple hooks on same state fire in registration order', () => {
    const sm = new StateMachine<'a' | 'b'>('a');
    const events: string[] = [];
    sm.onEnter('b', () => events.push('first'));
    sm.onEnter('b', () => events.push('second'));
    sm.transition('b');
    expect(events).toEqual(['first', 'second']);
  });
});