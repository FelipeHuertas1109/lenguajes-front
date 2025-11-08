import { DFA, DFASerialized, DFATransition } from "../../domain/entities/DFA";
import { State } from "../../domain/entities/State";

export interface TransitionsToDFARequest {
  states: string[];
  start: string;
  accepting: string[];
  transitions: DFATransition[];
  test?: string;
}

export interface TransitionsToDFAResponse {
  success: boolean;
  dfa: DFASerialized | null;
  test_result: {
    string: string;
    accepted: boolean;
  } | null;
  error: string | null;
}

export class TransitionsToDFAUseCase {
  execute(request: TransitionsToDFARequest): TransitionsToDFAResponse {
    try {
      // Validar parámetros requeridos
      if (!request.states || !Array.isArray(request.states) || request.states.length === 0) {
        return {
          success: false,
          dfa: null,
          test_result: null,
          error: "Parámetro 'states' requerido",
        };
      }

      if (!request.start) {
        return {
          success: false,
          dfa: null,
          test_result: null,
          error: "Parámetro 'start' requerido",
        };
      }

      if (!request.accepting || !Array.isArray(request.accepting)) {
        return {
          success: false,
          dfa: null,
          test_result: null,
          error: "Parámetro 'accepting' requerido",
        };
      }

      if (!request.transitions || !Array.isArray(request.transitions)) {
        return {
          success: false,
          dfa: null,
          test_result: null,
          error: "Parámetro 'transitions' requerido",
        };
      }

      // Validar que el estado inicial existe en la lista de estados
      if (!request.states.includes(request.start)) {
        return {
          success: false,
          dfa: null,
          test_result: null,
          error: `Estado inicial '${request.start}' no está en la lista de estados`,
        };
      }

      // Validar que todos los estados de aceptación existen
      for (const acceptingState of request.accepting) {
        if (!request.states.includes(acceptingState)) {
          return {
            success: false,
            dfa: null,
            test_result: null,
            error: `Estado de aceptación '${acceptingState}' no está en la lista de estados`,
          };
        }
      }

      // Validar transiciones
      const transitionMap = new Map<string, Map<string, string>>(); // from -> symbol -> to
      
      for (const transition of request.transitions) {
        if (!transition.from || !transition.symbol || !transition.to) {
          return {
            success: false,
            dfa: null,
            test_result: null,
            error: "Transición inválida: falta 'from', 'symbol' o 'to'",
          };
        }

        // Validar que los estados existen
        if (!request.states.includes(transition.from)) {
          return {
            success: false,
            dfa: null,
            test_result: null,
            error: `Estado origen '${transition.from}' en transición no está en la lista de estados`,
          };
        }

        if (!request.states.includes(transition.to)) {
          return {
            success: false,
            dfa: null,
            test_result: null,
            error: `Estado destino '${transition.to}' en transición no está en la lista de estados`,
          };
        }

        // Validar determinismo (no puede haber múltiples transiciones desde el mismo estado con el mismo símbolo)
        if (!transitionMap.has(transition.from)) {
          transitionMap.set(transition.from, new Map());
        }
        const symbolMap = transitionMap.get(transition.from)!;
        
        if (symbolMap.has(transition.symbol)) {
          return {
            success: false,
            dfa: null,
            test_result: null,
            error: `Transición no determinista: desde '${transition.from}' con símbolo '${transition.symbol}' hay múltiples transiciones`,
          };
        }
        
        symbolMap.set(transition.symbol, transition.to);
      }

      // Construir DFA
      const dfa = new DFA();
      
      // Crear estados
      const stateMap = new Map<string, State>();
      for (const stateId of request.states) {
        let state: State;
        if (stateId === "S0" && dfa.states.has("S0")) {
          // Reutilizar el estado S0 creado por defecto
          state = dfa.states.get("S0")!;
        } else {
          // Crear nuevo estado
          state = dfa.createState(stateId);
        }
        stateMap.set(stateId, state);
      }

      // Establecer estado inicial (antes de limpiar S0 si es necesario)
      const startState = stateMap.get(request.start)!;
      dfa.setStartState(startState);

      // Limpiar el estado S0 por defecto si no está en la lista de estados
      if (!request.states.includes("S0")) {
        // Solo eliminar si no es el estado inicial
        if (dfa.startState.id !== "S0") {
          dfa.states.delete("S0");
          dfa.transitions.delete("S0");
        }
      }
      
      // Limpiar estados de aceptación por defecto y establecer los correctos
      dfa.acceptingStates.clear();
      for (const acceptingStateId of request.accepting) {
        const acceptingState = stateMap.get(acceptingStateId)!;
        dfa.setAcceptingState(acceptingState, true);
      }

      // Agregar transiciones
      for (const transition of request.transitions) {
        const fromState = stateMap.get(transition.from)!;
        const toState = stateMap.get(transition.to)!;
        dfa.addTransition(fromState, transition.symbol, toState);
      }

      // Serializar el DFA
      const dfaSerialized = dfa.serialize();

      // Probar la cadena si se proporciona
      let testResult = null;
      if (request.test !== undefined) {
        const accepted = dfa.accepts(request.test);
        testResult = {
          string: request.test,
          accepted,
        };
      }

      return {
        success: true,
        dfa: dfaSerialized,
        test_result: testResult,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        dfa: null,
        test_result: null,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido al procesar las transiciones",
      };
    }
  }
}

