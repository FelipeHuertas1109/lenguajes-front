import { NextRequest, NextResponse } from "next/server";

const getBaseUrl = (): string => {
  const baseUrl = process.env.BASE_URL || "http://localhost:8000/";
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
};

const BASE_URL = getBaseUrl();

const parseStringsFromQuery = (searchParams: URLSearchParams): string[] => {
  const list: string[] = [];

  const repeatedStrings = searchParams.getAll("string");
  if (repeatedStrings.length > 0) {
    repeatedStrings.forEach((value) => {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        list.push(trimmed);
      }
    });
  }

  const stringsParam = searchParams.get("strings");
  if (stringsParam) {
    stringsParam.split(",").forEach((value) => {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        list.push(trimmed);
      }
    });
  }

  return list;
};

const parseStringsFromBody = (strings: unknown): string[] | undefined => {
  if (!strings) {
    return undefined;
  }

  if (Array.isArray(strings)) {
    return strings
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value) => value.length > 0);
  }

  if (typeof strings === "string") {
    return strings
      .split(/[\n,]+/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  return undefined;
};

const forwardResponse = async (response: Response, fallbackError: string) => {
  const responseText = await response.text();
  const contentType = response.headers.get("content-type") || "";

  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    console.error("Django API returned non-JSON response:", {
      status: response.status,
      statusText: response.statusText,
      contentType,
      preview: responseText.substring(0, 300),
    });

    return NextResponse.json(
      {
        success: false,
        error: `La API de Django devolvió una respuesta no válida (${response.status} ${response.statusText}). ${fallbackError}`,
      },
      { status: 500 }
    );
  }

  if (!response.ok) {
    console.error("Django API returned error:", {
      status: response.status,
      statusText: response.statusText,
      data,
    });
    return NextResponse.json(data, { status: response.status });
  }

  return NextResponse.json(data);
};

const handleFetchError = (error: unknown, payload: Record<string, unknown>) => {
  console.error("Error calling Django API:", error);

  if (error instanceof Error && error.name === "TimeoutError") {
    return NextResponse.json(
      {
        success: false,
        ...payload,
        error:
          "Timeout: La API de Django no respondió en el tiempo esperado. Verifica que esté corriendo.",
      },
      { status: 504 }
    );
  }

  if (error instanceof Error && error.message.includes("fetch failed")) {
    return NextResponse.json(
      {
        success: false,
        ...payload,
        error: `Error de conexión: No se pudo conectar con la API de Django en ${BASE_URL}. Verifica que el servidor esté corriendo.`,
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      ...payload,
      error:
        error instanceof Error
          ? `Error al conectar con la API: ${error.message}`
          : "Error interno del servidor",
    },
    { status: 500 }
  );
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const regex = searchParams.get("regex");
  const dfaIdParam = searchParams.get("dfa_id");
  const datasetPath = searchParams.get("dataset_path");
  const statesPath = searchParams.get("states_path");
  const strings = parseStringsFromQuery(searchParams);

  if (!regex && dfaIdParam === null) {
    return NextResponse.json(
      {
        success: false,
        error: "Debes proporcionar al menos 'regex' o 'dfa_id'.",
      },
      { status: 400 }
    );
  }

  if (dfaIdParam !== null && isNaN(Number(dfaIdParam))) {
    return NextResponse.json(
      {
        success: false,
        error: "El parámetro 'dfa_id' debe ser un entero válido.",
      },
      { status: 400 }
    );
  }

  try {
    const apiUrl = new URL("api/regex-to-statenet/", BASE_URL);
    if (regex) {
      apiUrl.searchParams.append("regex", regex);
    }
    if (dfaIdParam !== null) {
      apiUrl.searchParams.append("dfa_id", dfaIdParam);
    }
    if (datasetPath) {
      apiUrl.searchParams.append("dataset_path", datasetPath);
    }
    if (statesPath) {
      apiUrl.searchParams.append("states_path", statesPath);
    }
    strings.forEach((value) => apiUrl.searchParams.append("string", value));

    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(30000),
    });

    return forwardResponse(
      response,
      `Verifica que la ruta /api/regex-to-statenet/ exista y que la API esté disponible en ${BASE_URL}.`
    );
  } catch (error) {
    return handleFetchError(error, {
      regex: regex ?? null,
      dfa_id: dfaIdParam ?? null,
    });
  }
}

export async function POST(request: NextRequest) {
  let regex: string | undefined;
  let dfaId: number | undefined;
  let datasetPath: string | undefined;
  let statesPath: string | undefined;
  let stringsPayload: string[] | undefined;

  try {
    const body = await request.json();
    regex = typeof body.regex === "string" ? body.regex : undefined;
    if (body.dfa_id !== undefined) {
      const parsed = Number(body.dfa_id);
      if (!Number.isInteger(parsed)) {
        return NextResponse.json(
          {
            success: false,
            error: "El campo 'dfa_id' debe ser un entero válido.",
          },
          { status: 400 }
        );
      }
      dfaId = parsed;
    }

    datasetPath =
      typeof body.dataset_path === "string" ? body.dataset_path : undefined;
    statesPath =
      typeof body.states_path === "string" ? body.states_path : undefined;
    stringsPayload = parseStringsFromBody(body.strings);

    if (!regex && typeof dfaId !== "number") {
      return NextResponse.json(
        {
          success: false,
          error: "Debes enviar al menos 'regex' o 'dfa_id' en el cuerpo.",
        },
        { status: 400 }
      );
    }

    const apiUrl = new URL("api/regex-to-statenet/", BASE_URL);
    const requestBody: Record<string, unknown> = {};
    if (regex) {
      requestBody.regex = regex;
    }
    if (typeof dfaId === "number") {
      requestBody.dfa_id = dfaId;
    }
    if (stringsPayload && stringsPayload.length > 0) {
      requestBody.strings = stringsPayload;
    }
    if (datasetPath) {
      requestBody.dataset_path = datasetPath;
    }
    if (statesPath) {
      requestBody.states_path = statesPath;
    }

    const response = await fetch(apiUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000),
    });

    return forwardResponse(
      response,
      `Verifica que la ruta /api/regex-to-statenet/ exista y que la API esté disponible en ${BASE_URL}.`
    );
  } catch (error) {
    return handleFetchError(error, {
      regex: regex ?? null,
      dfa_id: dfaId ?? null,
    });
  }
}


