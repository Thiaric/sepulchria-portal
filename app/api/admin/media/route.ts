import { NextResponse } from "next/server";

import {
  ALLOWED_IMAGE_TYPES,
  MAX_MEDIA_FILE_BYTES,
  createRepositoryPath,
  listPublicFolders,
  normaliseFileName,
  normaliseFolder,
  uploadPublicImage,
} from "@/lib/github/public-media";
import {
  getStaffSession,
} from "@/lib/auth/require-staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getApiAdmin() {
  const session =
    await getStaffSession();

  if (
    !session ||
    (session.role !== "owner" &&
      session.role !== "admin")
  ) {
    return null;
  }

  return session;
}

export async function GET() {
  const session =
    await getApiAdmin();

  if (!session) {
    return NextResponse.json(
      {
        error:
          "Owner or Administrator access is required.",
      },
      {
        status: 403,
      },
    );
  }

  try {
    return NextResponse.json({
      folders:
        await listPublicFolders(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load public folders.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: Request,
) {
  const session =
    await getApiAdmin();

  if (!session) {
    return NextResponse.json(
      {
        error:
          "Owner or Administrator access is required.",
      },
      {
        status: 403,
      },
    );
  }

  try {
    const formData =
      await request.formData();

    const file =
      formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error:
            "Choose an image to upload.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !ALLOWED_IMAGE_TYPES.has(
        file.type,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Supported image types are PNG, JPG, WebP, GIF and AVIF.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      file.size <= 0 ||
      file.size >
        MAX_MEDIA_FILE_BYTES
    ) {
      return NextResponse.json(
        {
          error:
            "Images must be smaller than 3.5 MB.",
        },
        {
          status: 400,
        },
      );
    }

    const folder =
      normaliseFolder(
        String(
          formData.get("folder") ??
            "",
        ),
      );

    const fileName =
      normaliseFileName({
        requestedName: String(
          formData.get("fileName") ??
            "",
        ),
        originalName: file.name,
        mimeType: file.type,
      });

    const repositoryPath =
      createRepositoryPath(
        folder,
        fileName,
      );

    const replaceExisting =
      formData.get(
        "replaceExisting",
      ) === "true";

    const bytes = new Uint8Array(
      await file.arrayBuffer(),
    );

    const result =
      await uploadPublicImage({
        bytes,
        repositoryPath,
        replaceExisting,
      });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to upload the image.",
      },
      {
        status: 500,
      },
    );
  }
}
