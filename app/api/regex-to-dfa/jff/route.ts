import { NextRequest, NextResponse } from "next/server";
import { JFLAPExporter } from "@/src/infrastructure/jflap/JFLAPExporter";
import { DFASerialized } from "@/src/domain/entities/DFA";

// Normalizar BASE_URL para asegurar que termine con "/"
const getBaseUrl = (): string => {
  const baseUrl = process.env.BASE_URL || "http://localhost:8000/";
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
};

const BASE_URL = getBaseUrl();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const regex = searchParams.get("regex");

  if (!regex) {
    return NextResponse.json(
      {
        success: false,
        error: "El parámetro 'regex' es requerido",
      },
      { status: 400 }
    );
  }

  try {
    // Construir URL para la API de Django
    const apiUrl = new URL("api/regex-to-dfa/", BASE_URL);
    apiUrl.searchParams.append("regex", regex);

    console.log("Calling Django API for JFLAP:", apiUrl.toString());

    // Hacer petición a la API de Django
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
          error: `La API de Django devolvió una respuesta no válida (${response.status} ${response.statusText}). Verifica que la API esté corriendo en ${BASE_URL} y que la ruta /api/regex-to-dfa/ exista.`,
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

    // Verificar que la respuesta tenga el DFA
    if (!data.success || !data.dfa) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || "No se pudo generar el DFA",
        },
        { status: 500 }
      );
    }

    // Convertir DFA a formato JFLAP
    const dfa: DFASerialized = data.dfa;
    const jflapXml = JFLAPExporter.exportToJFLAP(dfa);
    const fileName = JFLAPExporter.generateFileName(regex);
    
    // Escapar el nombre del archivo para el header Content-Disposition
    const escapedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

    // Devolver el archivo JFLAP
    return new NextResponse(jflapXml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Content-Disposition": `attachment; filename="${escapedFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    console.error("Error calling Django API (GET):", error);

    // Manejar errores de timeout
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        {
          success: false,
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
          error: `Error de conexión: No se pudo conectar con la API de Django en ${BASE_URL}. Verifica que el servidor esté corriendo.`,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
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

  try {
    const body = await request.json();
    regex = body.regex;

    if (!regex) {
      return NextResponse.json(
        {
          success: false,
          error: "El campo 'regex' es requerido en el cuerpo de la petición",
        },
        { status: 400 }
      );
    }

    // Construir URL para la API de Django
    const apiUrl = new URL("api/regex-to-dfa/", BASE_URL);

    console.log("Calling Django API for JFLAP (POST):", apiUrl.toString());
    console.log("Request body:", { regex });

    // Hacer petición POST a la API de Django
    const response = await fetch(apiUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ regex }),
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
          error: `La API de Django devolvió una respuesta no válida (${response.status} ${response.statusText}). Verifica que la API esté corriendo en ${BASE_URL} y que la ruta /api/regex-to-dfa/ exista.`,
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

    // Verificar que la respuesta tenga el DFA
    if (!data.success || !data.dfa) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || "No se pudo generar el DFA",
        },
        { status: 500 }
      );
    }

    // Convertir DFA a formato JFLAP
    const dfa: DFASerialized = data.dfa;
    const jflapXml = JFLAPExporter.exportToJFLAP(dfa);
    const fileName = JFLAPExporter.generateFileName(regex);
    
    // Escapar el nombre del archivo para el header Content-Disposition
    const escapedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

    // Devolver el archivo JFLAP
    return new NextResponse(jflapXml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Content-Disposition": `attachment; filename="${escapedFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    console.error("Error calling Django API (POST):", error);

    // Manejar errores de timeout
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        {
          success: false,
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
          error: `Error de conexión: No se pudo conectar con la API de Django en ${BASE_URL}. Verifica que el servidor esté corriendo.`,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? `Error al conectar con la API: ${error.message}`
            : "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}

