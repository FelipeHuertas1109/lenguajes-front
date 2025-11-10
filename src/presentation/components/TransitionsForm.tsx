"use client";

import { useState, FormEvent, useImperativeHandle, forwardRef } from "react";
import { useSweetAlert } from "../../utils/useSweetAlert";

interface DFAData {
  alphabet: string[];
  states: string[];
  start: string;
  accepting: string[];
  transitions: Array<{
    from: string;
    symbol: string;
    to: string;
  }>;
}

interface Transition {
  from: string;
  symbol: string;
  to: string;
}

interface TransitionsFormProps {
  onResult: (data: {
    dfa: DFAData | null;
    testResult: { string: string; accepted: boolean } | null;
    testResults?: { string: string; accepted: boolean }[] | null;
    error: string | null;
  }) => void;
}

export interface TransitionsFormRef {
  clearForm: () => void;
  setFormData: (data: {
    states: string[];
    start: string;
    accepting: string[];
    transitions: Array<{ from: string; symbol: string; to: string }>;
  }) => void;
}

const TransitionsForm = forwardRef<TransitionsFormRef, TransitionsFormProps>(
  ({ onResult }, ref) => {
  const [states, setStates] = useState<string[]>(["S0", "S1"]);
  const [newState, setNewState] = useState("");
  const [start, setStart] = useState("S0");
  const [accepting, setAccepting] = useState<string[]>(["S1"]);
  const [transitions, setTransitions] = useState<Transition[]>([
    { from: "S0", symbol: "a", to: "S1" },
  ]);
  const [newTransition, setNewTransition] = useState<Transition>({
    from: "S0",
    symbol: "",
    to: "S0",
  });
  const [testString, setTestString] = useState("");
  const [loading, setLoading] = useState(false);
  const { showError, showSuccess, showWarning } = useSweetAlert();

  // Función para limpiar el formulario
  const clearForm = () => {
    setStates(["S0", "S1"]);
    setNewState("");
    setStart("S0");
    setAccepting(["S1"]);
    setTransitions([{ from: "S0", symbol: "a", to: "S1" }]);
    setNewTransition({ from: "S0", symbol: "", to: "S0" });
    setTestString("");
  };

  // Función para establecer los datos del formulario
  const setFormData = (data: {
    states: string[];
    start: string;
    accepting: string[];
    transitions: Array<{ from: string; symbol: string; to: string }>;
  }) => {
    setStates(data.states);
    setStart(data.start);
    setAccepting(data.accepting);
    setTransitions(data.transitions);
    // Actualizar newTransition con valores por defecto
    if (data.states.length > 0) {
      setNewTransition({ from: data.start, symbol: "", to: data.states[0] });
    }
    showSuccess("Datos copiados", "Las transiciones se han copiado al formulario");
  };

  // Exponer métodos al componente padre mediante ref
  useImperativeHandle(ref, () => ({
    clearForm,
    setFormData,
  }));

  const handleAddState = () => {
    if (newState && !states.includes(newState)) {
      const updatedStates = [...states, newState];
      setStates(updatedStates);
      setNewState("");
      // Si es el primer estado, establecerlo como inicial
      if (updatedStates.length === 1) {
        setStart(newState);
      }
    }
  };

  const handleRemoveState = async (stateToRemove: string) => {
    if (states.length <= 1) {
      await showWarning("No se puede eliminar", "Debe haber al menos un estado");
      return;
    }
    const updatedStates = states.filter((s) => s !== stateToRemove);
    setStates(updatedStates);
    
    // Si el estado eliminado era el inicial, establecer el primero como inicial
    if (start === stateToRemove) {
      setStart(updatedStates[0]);
    }
    
    // Eliminar de estados de aceptación
    setAccepting(accepting.filter((s) => s !== stateToRemove));
    
    // Eliminar transiciones relacionadas
    setTransitions(
      transitions.filter(
        (t) => t.from !== stateToRemove && t.to !== stateToRemove
      )
    );
  };

  const handleAddTransition = async () => {
    if (!newTransition.from || !newTransition.symbol || !newTransition.to) {
      await showWarning("Campos requeridos", "Todos los campos de la transición son requeridos");
      return;
    }
    
    // Validar que no exista una transición duplicada
    const exists = transitions.some(
      (t) =>
        t.from === newTransition.from &&
        t.symbol === newTransition.symbol &&
        t.to === newTransition.to
    );
    
    if (exists) {
      await showWarning("Transición duplicada", "Esta transición ya existe");
      return;
    }
    
    // Validar determinismo (no puede haber múltiples transiciones desde el mismo estado con el mismo símbolo)
    const isDeterministic = !transitions.some(
      (t) =>
        t.from === newTransition.from && t.symbol === newTransition.symbol
    );
    
    if (!isDeterministic) {
      await showError(
        "Transición no determinista",
        `Ya existe una transición desde '${newTransition.from}' con símbolo '${newTransition.symbol}'`
      );
      return;
    }
    
    setTransitions([...transitions, { ...newTransition }]);
    setNewTransition({ from: start, symbol: "", to: states[0] });
  };

  const handleRemoveTransition = (index: number) => {
    setTransitions(transitions.filter((_, i) => i !== index));
  };

  const handleToggleAccepting = (state: string) => {
    if (accepting.includes(state)) {
      setAccepting(accepting.filter((s) => s !== state));
    } else {
      setAccepting([...accepting, state]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validaciones
    if (states.length === 0) {
      await showWarning("Validación", "Debe haber al menos un estado");
      setLoading(false);
      return;
    }

    if (!start || !states.includes(start)) {
      await showWarning("Validación", "El estado inicial debe estar en la lista de estados");
      setLoading(false);
      return;
    }

    if (transitions.length === 0) {
      await showWarning("Validación", "Debe haber al menos una transición");
      setLoading(false);
      return;
    }

    try {
      const requestBody: any = {
        states,
        start,
        accepting,
        transitions,
      };

      // Procesar múltiples cadenas de prueba separadas por comas
      if (testString) {
        const tests = testString.split(",").map(t => t.trim()).filter(t => t.length > 0);
        if (tests.length > 0) {
          if (tests.length === 1) {
            // Si hay solo una cadena, usar test para compatibilidad
            requestBody.test = tests[0];
          } else {
            // Si hay múltiples, usar tests
            requestBody.tests = tests;
          }
        }
      }

      const response = await fetch("/api/transitions-to-dfa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        // Si hay múltiples resultados, usar test_results; si no, usar test_result para compatibilidad
        const testResults = data.test_results && data.test_results.length > 0 
          ? data.test_results 
          : null;
        const testResult = testResults && testResults.length > 0
          ? testResults[0] // Para compatibilidad con componentes que esperan testResult
          : data.test_result;
        
        onResult({
          dfa: data.dfa,
          testResult: testResult,
          testResults: testResults,
          error: null,
        });
        
        // Mostrar resultados si hay múltiples cadenas (solo como confirmación, ya que se muestran en DFADetails)
        if (data.test_results && data.test_results.length > 1) {
          const acceptedCount = data.test_results.filter((r: { accepted: boolean }) => r.accepted).length;
          const rejectedCount = data.test_results.length - acceptedCount;
          showSuccess(
            "Resultados de las pruebas",
            `Se procesaron ${data.test_results.length} cadenas: ${acceptedCount} aceptadas, ${rejectedCount} rechazadas`
          );
        }
      } else {
        const errorMsg = data.error || "Error al procesar las transiciones";
        await showError("Error al procesar", errorMsg);
        onResult({
          dfa: null,
          testResult: null,
          error: data.error,
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error de conexión";
      await showError("Error de conexión", errorMessage);
      onResult({
        dfa: null,
        testResult: null,
        error: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Estados */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Estados
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {states.map((state) => (
              <span
                key={state}
                className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-mono font-semibold flex items-center gap-2"
              >
                {state}
                <button
                  type="button"
                  onClick={() => handleRemoveState(state)}
                  className="text-gray-900 hover:text-gray-700"
                  title="Eliminar estado"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newState}
              onChange={(e) => setNewState(e.target.value)}
              placeholder="Nuevo estado (ej: S2)"
              className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono text-gray-900 placeholder:text-gray-500"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddState();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddState}
              className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Agregar
            </button>
          </div>
        </div>

        {/* Estado Inicial */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Estado Inicial
          </label>
          <select
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono text-gray-900"
          >
            {states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        {/* Estados de Aceptación */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Estados de Aceptación
          </label>
          <div className="flex flex-wrap gap-2">
            {states.map((state) => (
              <label
                key={state}
                className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border-2 border-gray-200 cursor-pointer hover:bg-gray-100"
              >
                <input
                  type="checkbox"
                  checked={accepting.includes(state)}
                  onChange={() => handleToggleAccepting(state)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-mono font-semibold text-gray-900">{state}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Transiciones */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Transiciones
          </label>
          <div className="space-y-2 mb-2 max-h-48 overflow-y-auto">
            {transitions.map((transition, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200"
              >
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-mono font-semibold">
                  {transition.from}
                </span>
                <span className="text-gray-900">──</span>
                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-sm font-mono font-semibold">
                  {transition.symbol}
                </span>
                <span className="text-gray-900">──</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-mono font-semibold">
                  {transition.to}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveTransition(index)}
                  className="ml-auto px-2 py-1 text-red-600 hover:text-red-800"
                  title="Eliminar transición"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <select
              value={newTransition.from}
              onChange={(e) =>
                setNewTransition({ ...newTransition, from: e.target.value })
              }
              className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono text-gray-900"
            >
              {states.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newTransition.symbol}
              onChange={(e) =>
                setNewTransition({ ...newTransition, symbol: e.target.value })
              }
              placeholder="Símbolo (ej: a, 0, ε)"
              className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono text-gray-900 placeholder:text-gray-500"
            />
            <select
              value={newTransition.to}
              onChange={(e) =>
                setNewTransition({ ...newTransition, to: e.target.value })
              }
              className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono text-gray-900"
            >
              {states.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddTransition}
              className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Agregar
            </button>
          </div>
        </div>

        {/* Cadena de Prueba */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Probar Cadena (Opcional)
          </label>
          <input
            type="text"
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            placeholder="Ej: a,aa,b (múltiples cadenas separadas por comas)"
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono text-gray-900 placeholder:text-gray-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading || states.length === 0 || transitions.length === 0}
          className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Procesando...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Convertir a DFA
            </>
          )}
        </button>
      </form>

      {/* Botón Limpiar Todo */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={clearForm}
          className="w-full py-2 px-4 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors flex items-center justify-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Limpiar Todo
        </button>
      </div>
    </div>
  );
});

TransitionsForm.displayName = "TransitionsForm";

export default TransitionsForm;

