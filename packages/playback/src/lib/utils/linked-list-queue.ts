class LinkedListQueueNode<T> {
  public value: T;
  public next: LinkedListQueueNode<T> | null = null;

  public constructor(value: T) {
    this.value = value;
  }
}

export class LinkedListQueue<T> {
  private head_: LinkedListQueueNode<T> | null = null;
  private tail_: LinkedListQueueNode<T> | null = null;
  private length_: number = 0;

  public enqueue(value: T): void {
    const newNode = new LinkedListQueueNode(value);

    if (this.tail_) {
      this.tail_.next = newNode;
    }

    this.tail_ = newNode;

    if (!this.head_) {
      this.head_ = newNode;
    }

    this.length_++;
  }

  public dequeue(): T | null {
    if (!this.head_) {
      return null;
    }

    const value = this.head_.value;
    this.head_ = this.head_.next;

    if (!this.head_) {
      this.tail_ = null;
    }

    this.length_--;
    return value;
  }

  public empty(): void {
    this.head_ = null;
    this.tail_ = null;
    this.length_ = 0;
  }

  public get peek(): T | null {
    return this.head_ ? this.head_.value : null;
  }

  // Get size of the queue
  public get size(): number {
    return this.length_;
  }

  public get isEmpty(): boolean {
    return this.length_ === 0;
  }
}
