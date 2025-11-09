import { NextRequest, NextResponse } from "next/server";

// Normalizar BASE_URL para asegurar que termine con "/"
const getBaseUrl = (): string => {
  const baseUrl = process.env.BASE_URL || "http://localhost:8000/";
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
};

const BASE_URL = getBaseUrl();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const regex = searchParams.get("regex");
  const test = searchParams.get("test") || undefined;
  const testsParam = searchParams.get("tests") || undefined;

  if (!regex) {
    return NextResponse.json(
      {
        success: false,
        regex: null,
        dfa: null,
        test_result: null,
        test_results: null,
        error: "El parámetro 'regex' es requerido",
      },
      { status: 400 }
    );
  }

  try {
    // Construir URL para la API de Django
    const apiUrl = new URL("api/regex-to-dfa/", BASE_URL);
    apiUrl.searchParams.append("regex", regex);
    
    // Si hay tests (comma-separated), procesarlos
    if (testsParam) {
      const tests = testsParam.split(",").map(t => t.trim()).filter(t => t.length > 0);
      if (tests.length > 0) {
        // Enviar como parámetro tests (comma-separated) o hacer POST
        // Por ahora, enviar como query param tests
        apiUrl.searchParams.append("tests", tests.join(","));
      }
    } else if (test) {
      // Compatibilidad hacia atrás: usar test si no hay tests
      apiUrl.searchParams.append("test", test);
    }

    console.log("Calling Django API:", apiUrl.toString());
    console.log("BASE_URL:", BASE_URL);

    
    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
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
          regex: regex,
          dfa: null,
          test_result: null,
          error: `La API de Django devolvió una respuesta no válida (${response.status} ${response.statusText}). Verifica que la API esté corriendo en ${BASE_URL} y que la ruta /api/regex-to-dfa/ exista. La respuesta recibida parece ser HTML, no JSON.`,
        },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error("Django API returned error (GET):", {
        status: response.status,
        statusText: response.statusText,
        data,
      });
      return NextResponse.json(data, { status: response.status });
    }

    console.log("Django API response successful (GET):", {
      success: data.success,
      hasDfa: !!data.dfa,
      hasTestResult: !!data.test_result,
      hasTestResults: !!data.test_results,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error calling Django API (GET):", error);
    
    // Manejar errores de timeout
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        {
          success: false,
          regex: regex ?? null,
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
          regex: regex ?? null,
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
        regex: regex || null,
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

export async function POST(request: NextRequest) {
  let regex: string | undefined;
  let test: string | undefined;
  let tests: string[] | undefined;

  try {
    const body = await request.json();
    regex = body.regex;
    test = body.test;
    tests = body.tests;

    if (!regex) {
      return NextResponse.json(
        {
          success: false,
          regex: null,
          dfa: null,
          test_result: null,
          test_results: null,
          error: "El campo 'regex' es requerido en el cuerpo de la petición",
        },
        { status: 400 }
      );
    }

    // Construir URL para la API de Django
    const apiUrl = new URL("api/regex-to-dfa/", BASE_URL);

    console.log("Calling Django API:", apiUrl.toString());
    console.log("BASE_URL:", BASE_URL);
    console.log("Request body:", { regex, test, tests });

    // Preparar el body: si hay tests (array), usarlo; si no, usar test (string) para compatibilidad
    const requestBody: any = { regex };
    if (tests !== undefined && Array.isArray(tests)) {
      requestBody.tests = tests;
    } else if (test !== undefined) {
      requestBody.test = test;
    }

    // Hacer petición POST a la API de Django
    const response = await fetch(apiUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
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
          regex: regex,
          dfa: null,
          test_result: null,
          error: `La API de Django devolvió una respuesta no válida (${response.status} ${response.statusText}). Verifica que la API esté corriendo en ${BASE_URL} y que la ruta /api/regex-to-dfa/ exista. La respuesta recibida parece ser HTML, no JSON.`,
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
      hasTestResults: !!data.test_results,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error calling Django API (POST):", error);
    
    // Manejar errores de timeout
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        {
          success: false,
          regex: regex ?? null,
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
          regex: regex ?? null,
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
        regex: regex || null,
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

