import { State } from "./State";
import { Transition } from "./Transition";

export class NFA {
  private stateCounter = 0;
  public readonly states: Set<State>;
  public readonly alphabet: Set<string>;
  public readonly transitions: Transition[];
  public readonly startState: State;
  public readonly acceptingStates: Set<State>;

  constructor() {
    this.states = new Set();
    this.alphabet = new Set();
    this.transitions = [];
    this.startState = this.createState();
    this.acceptingStates = new Set();
  }

  createState(): State {
    const state = new State(`S${this.stateCounter++}`);
    this.states.add(state);
    return state;
  }

  addTransition(from: State, symbol: string | null, to: State): void {
    this.transitions.push(new Transition(from, symbol, to));
    if (symbol !== null) {
      this.alphabet.add(symbol);
    }
  }

  setAcceptingState(state: State, isAccepting: boolean): void {
    if (isAccepting) {
      this.acceptingStates.add(state);
    } else {
      this.acceptingStates.delete(state);
    }
  }

  getEpsilonClosure(states: Set<State>): Set<State> {
    const closure = new Set<State>(states);
    const stack = Array.from(states);

    while (stack.length > 0) {
      const state = stack.pop()!;
      for (const transition of this.transitions) {
        if (transition.from.equals(state) && transition.isEpsilon()) {
          if (!closure.has(transition.to)) {
            closure.add(transition.to);
            stack.push(transition.to);
          }
        }
      }
    }

    return closure;
  }

  getTransitions(state: State, symbol: string): Set<State> {
    const result = new Set<State>();
    for (const transition of this.transitions) {
      if (transition.from.equals(state) && transition.symbol === symbol) {
        result.add(transition.to);
      }
    }
    return result;
  }
}

