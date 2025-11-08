import { NFA } from "../../domain/entities/NFA";
import { State } from "../../domain/entities/State";
import { DFA } from "../../domain/entities/DFA";

export class SubsetConstruction {
  convert(nfa: NFA): DFA {
    const dfa = new DFA();
    const stateMap = new Map<string, Set<State>>();
    const dfaStateMap = new Map<string, State>();
    let stateCounter = 0;

    // Estado inicial del DFA: epsilon-closure del estado inicial del NFA
    const startClosure = nfa.getEpsilonClosure(new Set([nfa.startState]));
    const startKey = this.getStateSetKey(startClosure);
    stateMap.set(startKey, startClosure);
    const dfaStart = dfa.createState(`S${stateCounter++}`);
    dfaStateMap.set(startKey, dfaStart);

    const queue: string[] = [startKey];
    const processed = new Set<string>();

    // Extraer todos los caracteres únicos del alfabeto (excluyendo ".")
    let alphabet = Array.from(nfa.alphabet).filter((sym) => sym !== ".");

    // Si el alfabeto está vacío pero hay transiciones, extraer caracteres de las transiciones
    if (alphabet.length === 0) {
      const chars = new Set<string>();
      for (const transition of nfa.transitions) {
        if (transition.symbol && transition.symbol !== ".") {
          chars.add(transition.symbol);
        }
      }
      alphabet = Array.from(chars);
    }

    // Si aún está vacío, usar un conjunto por defecto (para casos como ".*")
    if (alphabet.length === 0) {
      alphabet = ["a", "b", "0", "1"];
    }

    while (queue.length > 0) {
      const currentKey = queue.shift()!;
      if (processed.has(currentKey)) continue;
      processed.add(currentKey);

      const currentStates = stateMap.get(currentKey)!;
      const currentDFAState = dfaStateMap.get(currentKey)!;

      // Determinar si este estado del DFA es de aceptación
      for (const nfaState of currentStates) {
        if (nfa.acceptingStates.has(nfaState)) {
          dfa.setAcceptingState(currentDFAState, true);
          break;
        }
      }

      // Para cada símbolo del alfabeto
      for (const symbol of alphabet) {
        // Mover con el símbolo específico
        const nextStatesFromSymbol = this.move(currentStates, symbol, nfa);
        
        // También mover con "." si existe (cualquier carácter)
        const nextStatesFromDot = this.move(currentStates, ".", nfa);
        
        // Combinar ambos resultados
        const nextStates = new Set<State>();
        for (const state of nextStatesFromSymbol) {
          nextStates.add(state);
        }
        for (const state of nextStatesFromDot) {
          nextStates.add(state);
        }

        if (nextStates.size > 0) {
          const nextKey = this.getStateSetKey(nextStates);
          if (!stateMap.has(nextKey)) {
            stateMap.set(nextKey, nextStates);
            const nextDFAState = dfa.createState(`S${stateCounter++}`);
            dfaStateMap.set(nextKey, nextDFAState);
            queue.push(nextKey);
          }
          const nextDFAState = dfaStateMap.get(nextKey)!;
          dfa.addTransition(currentDFAState, symbol, nextDFAState);
        }
      }
    }

    return dfa;
  }

  private move(states: Set<State>, symbol: string, nfa: NFA): Set<State> {
    const result = new Set<State>();

    for (const state of states) {
      const transitions = nfa.getTransitions(state, symbol);
      for (const nextState of transitions) {
        result.add(nextState);
      }
    }

    return nfa.getEpsilonClosure(result);
  }


  private getStateSetKey(states: Set<State>): string {
    const sorted = Array.from(states)
      .map((s) => s.id)
      .sort()
      .join(",");
    return `{${sorted}}`;
  }
}
