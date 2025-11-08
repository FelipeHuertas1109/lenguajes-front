import { State } from "./State";

export class Transition {
  constructor(
    public readonly from: State,
    public readonly symbol: string | null, // null representa epsilon (ε)
    public readonly to: State
  ) {}

  isEpsilon(): boolean {
    return this.symbol === null;
  }
}

