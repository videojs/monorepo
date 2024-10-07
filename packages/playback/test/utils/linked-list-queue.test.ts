import { beforeEach, describe, expect, it } from 'vitest';
import { LinkedListQueue } from '../../src/lib/utils/linked-list-queue';

describe('LinkedListQueue', () => {
  let queue: LinkedListQueue<number>;

  beforeEach(() => {
    queue = new LinkedListQueue<number>();
  });

  it('should start empty', () => {
    expect(queue.isEmpty).toBe(true);
    expect(queue.size).toBe(0);
    expect(queue.peek).toBe(null);
    expect(queue.dequeue()).toBe(null);
  });

  it('should enqueue and dequeue items correctly', () => {
    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);

    expect(queue.size).toBe(3);
    expect(queue.peek).toBe(1);

    expect(queue.dequeue()).toBe(1);
    expect(queue.size).toBe(2);
    expect(queue.peek).toBe(2);

    expect(queue.dequeue()).toBe(2);
    expect(queue.dequeue()).toBe(3);
    expect(queue.size).toBe(0);
    expect(queue.peek).toBe(null);
  });

  it('should handle dequeue from empty queue', () => {
    expect(queue.dequeue()).toBe(null);
  });

  it('should peek the front item without removing it', () => {
    queue.enqueue(10);
    queue.enqueue(20);

    expect(queue.peek).toBe(10); // Peek does not remove
    expect(queue.size).toBe(2); // Size remains the same

    queue.dequeue();
    expect(queue.peek).toBe(20); // Now 20 should be at the front
  });

  it('should correctly report the size of the queue', () => {
    expect(queue.size).toBe(0);

    queue.enqueue(100);
    queue.enqueue(200);

    expect(queue.size).toBe(2);

    queue.dequeue();
    expect(queue.size).toBe(1);
  });

  it('should correctly check if the queue is empty', () => {
    expect(queue.isEmpty).toBe(true);

    queue.enqueue(5);
    expect(queue.isEmpty).toBe(false);

    queue.dequeue();
    expect(queue.isEmpty).toBe(true);
  });

  it('should empty the queue', () => {
    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);

    expect(queue.size).toBe(3);

    queue.empty();
    expect(queue.size).toBe(0);
    expect(queue.isEmpty).toBe(true);
    expect(queue.peek).toBe(null);
    expect(queue.dequeue()).toBe(null);
  });
});
