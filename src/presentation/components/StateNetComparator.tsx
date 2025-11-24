"use client";

import {
  FormEvent,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { useSweetAlert } from "../../utils/useSweetAlert";

const DEFAULT_DATASET_PATH = "models/statenet/dataset6000.csv";
const DEFAULT_STATES_PATH = "models/statenet/states_for_acceptnet.pt";

type RequestMethod = "GET" | "POST";

interface DFADescription {
  states: string[];
  start_state: string;
  accepting_states: string[];
  alphabet?: string[];
  transitions: Array<{
    from: string;
    to: string;
    symbol: string;
  }>;
}

export interface StateNetResult {
  success: boolean;
  regex?: string | null;
  dfa_id?: number | null;
  test_strings?: string[] | null;
  results?: Array<{
    string: string;
    real_accepts: boolean;
    model_accepts: boolean;
    matches: boolean;
  }> | null;
  accuracy?: number | null;
  matches?: number | null;
  total?: number | null;
  real_dfa?: DFADescription | null;
  model_dfa?: DFADescription | null;
  dataset_path?: string | null;
  states_path?: string | null;
  error?: string | null;
}

interface StateNetComparatorProps {
  onResult: (data: StateNetResult) => void;
}

export interface StateNetComparatorRef {
  clearForm: () => void;
}

const parseStringsInput = (value: string): string[] => {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const StateNetComparator = forwardRef<
  StateNetComparatorRef,
  StateNetComparatorProps
>(({ onResult }, ref) => {
  const [regex, setRegex] = useState("");
  const [dfaId, setDfaId] = useState("");
  const [stringsInput, setStringsInput] = useState("");
  const [datasetPath, setDatasetPath] = useState(DEFAULT_DATASET_PATH);
  const [statesPath, setStatesPath] = useState(DEFAULT_STATES_PATH);
  const [requestMethod, setRequestMethod] = useState<RequestMethod>("GET");
  const [loading, setLoading] = useState(false);
  const { showError, showSuccess } = useSweetAlert();

  const parsedStrings = useMemo(
    () => parseStringsInput(stringsInput),
    [stringsInput]
  );

  const clearForm = () => {
    setRegex("");
    setDfaId("");
    setStringsInput("");
    setDatasetPath(DEFAULT_DATASET_PATH);
    setStatesPath(DEFAULT_STATES_PATH);
    setRequestMethod("GET");
  };

  useImperativeHandle(ref, () => ({
    clearForm,
  }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!regex.trim() && !dfaId.trim()) {
      await showError(
        "Campos requeridos",
        "Debes ingresar una expresión regular o un dfa_id."
      );
      return;
    }

    if (dfaId && isNaN(Number(dfaId))) {
      await showError("dfa_id inválido", "El dfa_id debe ser un entero.");
      return;
    }

    setLoading(true);

    try {
      let response: Response;
      if (requestMethod === "GET") {
        const searchParams = new URLSearchParams();
        if (regex.trim()) searchParams.append("regex", regex.trim());
        if (dfaId.trim()) searchParams.append("dfa_id", dfaId.trim());
        if (datasetPath.trim())
          searchParams.append("dataset_path", datasetPath.trim());
        if (statesPath.trim())
          searchParams.append("states_path", statesPath.trim());
        parsedStrings.forEach((value) => searchParams.append("string", value));

        response = await fetch(
          `/api/regex-to-statenet/?${searchParams.toString()}`
        );
      } else {
        const body: Record<string, unknown> = {};
        if (regex.trim()) body.regex = regex.trim();
        if (dfaId.trim()) body.dfa_id = Number(dfaId.trim());
        if (datasetPath.trim()) body.dataset_path = datasetPath.trim();
        if (statesPath.trim()) body.states_path = statesPath.trim();
        if (parsedStrings.length > 0) body.strings = parsedStrings;

        response = await fetch("/api/regex-to-statenet/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
      }

      const data: StateNetResult = await response.json();
      if (data.success) {
        await showSuccess(
          "Comparación completada",
          data.accuracy !== undefined && data.accuracy !== null
            ? `Precisión del modelo: ${(data.accuracy * 100).toFixed(2)}%`
            : "La comparación se realizó correctamente."
        );
      } else {
        await showError("Error al comparar", data.error || "Error desconocido.");
      }
      onResult(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error desconocido.";
      await showError("Error de conexión", message);
      onResult({
        success: false,
        regex: regex || null,
        dfa_id: dfaId ? Number(dfaId) : null,
        error: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const exampleQueries = [
    {
      title: "Regex + strings personalizados",
      description: 'GET /api/regex-to-statenet/?regex=[LCIG]+&string=C&string=CG',
      action: () => {
        setRequestMethod("GET");
        setRegex("[LCIG]+");
        setStringsInput("C\nG\nCG\nIL");
        setDfaId("");
      },
    },
    {
      title: "Solo regex",
      description: "GET /api/regex-to-statenet/?regex=(AB|CD)*EF",
      action: () => {
        setRequestMethod("GET");
        setRegex("(AB|CD)*EF");
        setStringsInput("");
        setDfaId("");
      },
    },
    {
      title: "POST con dfa_id",
      description: "POST dfa_id=42 con rutas personalizadas",
      action: () => {
        setRequestMethod("POST");
        setRegex("");
        setDfaId("42");
        setStringsInput("C\nG\nCG\nIL");
        setDatasetPath(DEFAULT_DATASET_PATH);
        setStatesPath(DEFAULT_STATES_PATH);
      },
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="regex-statenet"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Expresión Regular
            </label>
            <input
              id="regex-statenet"
              type="text"
              value={regex}
              onChange={(e) => setRegex(e.target.value.toUpperCase())}
              placeholder="Ej: (AB|CD)*EF"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg font-mono text-black placeholder:text-gray-400 uppercase"
            />
            <p className="mt-2 text-xs text-gray-500">
              Debes ingresar una regex o un dfa_id.
            </p>
          </div>
          <div>
            <label
              htmlFor="dfa-id"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              dfa_id
            </label>
            <input
              id="dfa-id"
              type="number"
              min="0"
              value={dfaId}
              onChange={(e) => setDfaId(e.target.value)}
              placeholder="Ej: 42"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg text-black placeholder:text-gray-400"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="strings"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            Cadenas a evaluar (opcional)
          </label>
          <textarea
            id="strings"
            value={stringsInput}
            onChange={(e) => setStringsInput(e.target.value.toUpperCase())}
            placeholder="Una cadena por línea o separadas por comas. Si lo dejas vacío se usan las cadenas del dataset."
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono text-black placeholder:text-gray-400 uppercase min-h-[110px]"
          />
          {parsedStrings.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              Se enviarán {parsedStrings.length} cadenas.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="dataset-path"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              dataset_path
            </label>
            <input
              id="dataset-path"
              type="text"
              value={datasetPath}
              onChange={(e) => setDatasetPath(e.target.value)}
              placeholder={DEFAULT_DATASET_PATH}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono text-black placeholder:text-gray-400"
            />
            <p className="mt-1 text-xs text-gray-500">
              Por defecto: {DEFAULT_DATASET_PATH}
            </p>
          </div>
          <div>
            <label
              htmlFor="states-path"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              states_path
            </label>
            <input
              id="states-path"
              type="text"
              value={statesPath}
              onChange={(e) => setStatesPath(e.target.value)}
              placeholder={DEFAULT_STATES_PATH}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono text-black placeholder:text-gray-400"
            />
            <p className="mt-1 text-xs text-gray-500">
              Por defecto: {DEFAULT_STATES_PATH}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            Método HTTP
          </label>
          <div className="flex gap-3">
            {(["GET", "POST"] as RequestMethod[]).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setRequestMethod(method)}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold border-2 transition-colors ${
                  requestMethod === method
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
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
              Consultando StateNet...
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
                  d="M15 9h3m-3 3h3m-6 4h6m-6 4h6m-6-8h6m-6-4h6M5 5l7-2 7 2M5 5v6c0 5.523 4.477 10 10 10s10-4.477 10-10V5M5 11c0 5.523 4.477 10 10 10"
                />
              </svg>
              Consultar StateNet
            </>
          )}
        </button>

        <button
          type="button"
          onClick={clearForm}
          className="w-full py-2 px-4 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors flex items-center justify-center gap-2"
        >
          Limpiar formulario
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
        <p className="text-sm font-semibold text-gray-700">
          Ejemplos rápidos:
        </p>
        <div className="grid grid-cols-1 gap-3">
          {exampleQueries.map((example) => (
            <button
              key={example.title}
              type="button"
              onClick={example.action}
              className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              <p className="text-sm font-semibold text-indigo-600">
                {example.title}
              </p>
              <p className="text-xs text-gray-600 mt-1">{example.description}</p>
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="font-semibold text-gray-700 mb-1">Tips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              Si no envías cadenas, se usan los ejemplos del dataset seleccionado.
            </li>
            <li>
              Usa variables de entorno{" "}
              <code className="bg-gray-100 px-1 rounded">
                STATENET_DATASET_PATH
              </code>{" "}
              y{" "}
              <code className="bg-gray-100 px-1 rounded">
                STATENET_STATES_PATH
              </code>{" "}
              si mueves los archivos.
            </li>
            <li>
              Observa <strong>accuracy</strong> y <strong>matches</strong> para
              validar la concordancia entre DFA real y modelo.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
});

StateNetComparator.displayName = "StateNetComparator";

export default StateNetComparator;


