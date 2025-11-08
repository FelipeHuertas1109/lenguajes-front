export class State {
  constructor(public readonly id: string) {}

  equals(other: State): boolean {
    return this.id === other.id;
  }

  toString(): string {
    return this.id;
  }
}

