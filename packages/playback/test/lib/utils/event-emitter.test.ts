import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from '../../../src/lib/utils/event-emitter';

describe('EventEmitter', () => {
  let emitter: EventEmitter<{ testEvent: string; anotherEvent: string; all: string }>;

  beforeEach(() => {
    emitter = new EventEmitter('all');
  });

  it('should register an event listener when added', () => {
    const listener = vi.fn();

    emitter.addEventListener('testEvent', listener);
    emitter.emitEvent({ type: 'testEvent' });

    expect(listener).toHaveBeenNthCalledWith(1, { type: 'testEvent' });
  });

  it('should unregister an event listener successfully', () => {
    const listener = vi.fn();

    emitter.addEventListener('testEvent', listener);
    emitter.removeEventListener('testEvent', listener);
    emitter.emitEvent({ type: 'testEvent' });

    expect(listener).not.toHaveBeenCalled();
  });

  it('should trigger all registered listeners when event is emitted', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    emitter.addEventListener('testEvent', listener1);
    emitter.addEventListener('testEvent', listener2);
    emitter.emitEvent({ type: 'testEvent' });

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  it('should trigger "all" event listener alongside with the specific event listeners', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const listener3 = vi.fn();

    emitter.addEventListener('testEvent', listener1);
    emitter.addEventListener('testEvent', listener2);
    emitter.addEventListener('all', listener3);

    emitter.emitEvent({ type: 'testEvent' });

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
    expect(listener3).toHaveBeenCalledTimes(1);
  });

  it('should register a listener that is triggered only once when using "once"', () => {
    const listener = vi.fn();

    emitter.once('testEvent', listener);
    emitter.emitEvent({ type: 'testEvent' });
    emitter.emitEvent({ type: 'testEvent' });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should clear all listeners for a specific event when removed', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const listener3 = vi.fn();

    emitter.addEventListener('testEvent', listener1);
    emitter.addEventListener('testEvent', listener2);
    emitter.addEventListener('anotherEvent', listener3);

    emitter.removeAllEventListenersFor('testEvent');
    emitter.emitEvent({ type: 'testEvent' });
    emitter.emitEvent({ type: 'anotherEvent' });

    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).not.toHaveBeenCalled();
    expect(listener3).toHaveBeenCalledTimes(1);
  });

  it('should clear all event listeners when removeAllEventListeners is called', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    emitter.addEventListener('testEvent', listener1);
    emitter.addEventListener('anotherEvent', listener2);

    emitter.removeAllEventListeners();
    emitter.emitEvent({ type: 'testEvent' });
    emitter.emitEvent({ type: 'anotherEvent' });

    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).not.toHaveBeenCalled();
  });

  it('should register the same listener only once for the same event', () => {
    const listener = vi.fn();

    emitter.addEventListener('testEvent', listener);
    emitter.addEventListener('testEvent', listener);
    emitter.emitEvent({ type: 'testEvent' });

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
