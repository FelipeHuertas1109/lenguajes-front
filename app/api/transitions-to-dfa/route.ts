import { NextRequest, NextResponse } from "next/server";

// Normalizar BASE_URL para asegurar que termine con "/"
const getBaseUrl = (): string => {
  const baseUrl = process.env.BASE_URL || "http://localhost:8000/";
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
};

const BASE_URL = getBaseUrl();

export async function POST(request: NextRequest) {
  let states: string[] | undefined;
  let start: string | undefined;
  let accepting: string[] | undefined;
  let transitions: Array<{ from: string; symbol: string; to: string }> | undefined;
  let test: string | undefined;

  try {
    const body = await request.json();
    states = body.states;
    start = body.start;
    accepting = body.accepting;
    transitions = body.transitions;
    test = body.test;

    // Validar parámetros requeridos
    if (!states || !Array.isArray(states) || states.length === 0) {
      return NextResponse.json(
        {
          success: false,
          dfa: null,
          test_result: null,
          error: "Parámetro 'states' requerido",
        },
        { status: 400 }
      );
    }

    if (!start) {
      return NextResponse.json(
        {
          success: false,
          dfa: null,
          test_result: null,
          error: "Parámetro 'start' requerido",
        },
        { status: 400 }
      );
    }

    if (!accepting || !Array.isArray(accepting)) {
      return NextResponse.json(
        {
          success: false,
          dfa: null,
          test_result: null,
          error: "Parámetro 'accepting' requerido",
        },
        { status: 400 }
      );
    }

    if (!transitions || !Array.isArray(transitions)) {
      return NextResponse.json(
        {
          success: false,
          dfa: null,
          test_result: null,
          error: "Parámetro 'transitions' requerido",
        },
        { status: 400 }
      );
    }

    // Construir URL para la API de Django
    const apiUrl = new URL("api/transitions-to-dfa/", BASE_URL);

    console.log("Calling Django API:", apiUrl.toString());
    console.log("BASE_URL:", BASE_URL);
    console.log("Request body:", { states, start, accepting, transitions, test });

    // Hacer petición POST a la API de Django
    const response = await fetch(apiUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ states, start, accepting, transitions, test }),
      // Timeout de 30 segundos
      signal: AbortSignal.timeout(30000),
    });

    // Leer la respuesta como texto primero para poder manejar HTML
    const responseText = await response.text();
    const contentType = response.headers.get("content-type") || "";

    // Intentar parsear como JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      // Si no es JSON, probablemente es HTML (página de error)
      console.error("Django API returned non-JSON response:", {
        status: response.status,
        statusText: response.statusText,
        contentType,
        url: apiUrl.toString(),
        preview: responseText.substring(0, 300),
      });
      return NextResponse.json(
        {
          success: false,
          dfa: null,
          test_result: null,
          error: `La API de Django devolvió una respuesta no válida (${response.status} ${response.statusText}). Verifica que la API esté corriendo en ${BASE_URL} y que la ruta /api/transitions-to-dfa/ exista. La respuesta recibida parece ser HTML, no JSON.`,
        },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error("Django API returned error (POST):", {
        status: response.status,
        statusText: response.statusText,
        data,
      });
      return NextResponse.json(data, { status: response.status });
    }

    console.log("Django API response successful (POST):", {
      success: data.success,
      hasDfa: !!data.dfa,
      hasTestResult: !!data.test_result,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error calling Django API (POST):", error);
    
    // Manejar errores de timeout
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        {
          success: false,
          dfa: null,
          test_result: null,
          error: "Timeout: La API de Django no respondió en el tiempo esperado. Verifica que esté corriendo.",
        },
        { status: 504 }
      );
    }
    
    // Manejar errores de conexión
    if (error instanceof Error && error.message.includes("fetch failed")) {
      return NextResponse.json(
        {
          success: false,
          dfa: null,
          test_result: null,
          error: `Error de conexión: No se pudo conectar con la API de Django en ${BASE_URL}. Verifica que el servidor esté corriendo.`,
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        dfa: null,
        test_result: null,
        error:
          error instanceof Error
            ? `Error al conectar con la API: ${error.message}`
            : "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}

