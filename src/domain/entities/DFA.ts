import { State } from "./State";
import { Transition } from "./Transition";

export interface DFATransition {
  from: string;
  symbol: string;
  to: string;
}

export interface DFASerialized {
  alphabet: string[];
  states: string[];
  start: string;
  accepting: string[];
  transitions: DFATransition[];
}

export class DFA {
  public readonly states: Map<string, State>;
  public readonly alphabet: Set<string>;
  public readonly transitions: Map<string, Map<string, State>>;
  public readonly startState: State;
  public readonly acceptingStates: Set<State>;

  constructor() {
    this.states = new Map();
    this.alphabet = new Set();
    this.transitions = new Map();
    this.startState = this.createState("S0");
    this.acceptingStates = new Set();
  }

  createState(id: string): State {
    const state = new State(id);
    this.states.set(id, state);
    this.transitions.set(id, new Map());
    return state;
  }

  addTransition(from: State, symbol: string, to: State): void {
    if (!this.states.has(from.id)) {
      this.states.set(from.id, from);
      this.transitions.set(from.id, new Map());
    }
    if (!this.states.has(to.id)) {
      this.states.set(to.id, to);
      this.transitions.set(to.id, new Map());
    }
    this.transitions.get(from.id)!.set(symbol, to);
    this.alphabet.add(symbol);
  }

  setAcceptingState(state: State, isAccepting: boolean): void {
    if (isAccepting) {
      this.acceptingStates.add(state);
    } else {
      this.acceptingStates.delete(state);
    }
  }

  accepts(input: string): boolean {
    let currentState = this.startState;

    for (const symbol of input) {
      const transitions = this.transitions.get(currentState.id);
      if (!transitions || !transitions.has(symbol)) {
        return false;
      }
      currentState = transitions.get(symbol)!;
    }

    return this.acceptingStates.has(currentState);
  }

  serialize(): DFASerialized {
    const transitions: DFATransition[] = [];
    for (const [fromId, symbolMap] of this.transitions.entries()) {
      for (const [symbol, toState] of symbolMap.entries()) {
        transitions.push({
          from: fromId,
          symbol,
          to: toState.id,
        });
      }
    }

    return {
      alphabet: Array.from(this.alphabet).sort(),
      states: Array.from(this.states.keys()).sort(),
      start: this.startState.id,
      accepting: Array.from(this.acceptingStates).map((s) => s.id).sort(),
      transitions: transitions.sort((a, b) => {
        if (a.from !== b.from) return a.from.localeCompare(b.from);
        if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol);
        return a.to.localeCompare(b.to);
      }),
    };
  }
}

