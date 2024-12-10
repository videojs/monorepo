export class LinkedListNode<T> {
  public value: T;
  public next: LinkedListNode<T> | null = null;

  public constructor(value: T) {
    this.value = value;
  }
}
