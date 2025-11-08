import { NextRequest, NextResponse } from "next/server";
import { RegexToDFAUseCase } from "@/src/application/use-cases/RegexToDFAUseCase";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const regex = searchParams.get("regex");
    const test = searchParams.get("test") || undefined;

    if (!regex) {
      return NextResponse.json(
        {
          success: false,
          regex: null,
          dfa: null,
          test_result: null,
          error: "El parámetro 'regex' es requerido",
        },
        { status: 400 }
      );
    }

    const useCase = new RegexToDFAUseCase();
    const response = useCase.execute({ regex, test });

    if (!response.success) {
      return NextResponse.json(response, { status: 400 });
    }

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        regex: null,
        dfa: null,
        test_result: null,
        error:
          error instanceof Error
            ? error.message
            : "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { regex, test } = body;

    if (!regex) {
      return NextResponse.json(
        {
          success: false,
          regex: null,
          dfa: null,
          test_result: null,
          error: "El campo 'regex' es requerido en el cuerpo de la petición",
        },
        { status: 400 }
      );
    }

    const useCase = new RegexToDFAUseCase();
    const response = useCase.execute({ regex, test });

    if (!response.success) {
      return NextResponse.json(response, { status: 400 });
    }

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        regex: null,
        dfa: null,
        test_result: null,
        error:
          error instanceof Error
            ? error.message
            : "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}

