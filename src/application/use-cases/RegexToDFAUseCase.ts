import { DFA, DFASerialized } from "../../domain/entities/DFA";
import { ThompsonBuilder } from "../../infrastructure/nfa/ThompsonBuilder";
import { SubsetConstruction } from "../../infrastructure/dfa/SubsetConstruction";

export interface RegexToDFARequest {
  regex: string;
  test?: string;
}

export interface RegexToDFAResponse {
  success: boolean;
  regex: string;
  dfa: DFASerialized | null;
  test_result: {
    string: string;
    accepted: boolean;
  } | null;
  error: string | null;
}

export class RegexToDFAUseCase {
  private thompsonBuilder: ThompsonBuilder;
  private subsetConstruction: SubsetConstruction;

  constructor() {
    this.thompsonBuilder = new ThompsonBuilder();
    this.subsetConstruction = new SubsetConstruction();
  }

  execute(request: RegexToDFARequest): RegexToDFAResponse {
    try {
      if (!request.regex || request.regex.trim() === "") {
        return {
          success: false,
          regex: request.regex,
          dfa: null,
          test_result: null,
          error: "La expresión regular no puede estar vacía",
        };
      }

      // Construir NFA usando el algoritmo de Thompson
      const nfa = this.thompsonBuilder.build(request.regex);

      // Convertir NFA a DFA usando construcción de subconjuntos
      const dfa = this.subsetConstruction.convert(nfa);

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
        regex: request.regex,
        dfa: dfaSerialized,
        test_result: testResult,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        regex: request.regex,
        dfa: null,
        test_result: null,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido al procesar la expresión regular",
      };
    }
  }
}

