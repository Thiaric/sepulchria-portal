import {
  NextResponse,
} from "next/server";

import {
  ALLOWED_IMAGE_TYPES,
  MAX_MEDIA_FILE_BYTES,
  commitPublicMediaBatch,
  createRepositoryPath,
  listPublicMedia,
  normaliseFileName,
  normaliseFolder,
  stagePublicImage,
  type PublicMediaBatchUpload,
} from "@/lib/github/public-media";
import {
  canAccessAdminSection,
  getStaffSession,
} from "@/lib/auth/require-staff";

export const runtime = "nodejs";
export const dynamic =
  "force-dynamic";

async function getApiAdmin() {
  const session =
    await getStaffSession();

  if (
    !session ||
    !canAccessAdminSection(
      session.role,
      "media",
    )
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
          "Owner access is required.",
      },
      {
        status: 403,
      },
    );
  }

  try {
    return NextResponse.json(
      await listPublicMedia(),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load public media.",
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
          "Owner access is required.",
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
            "Choose an image to stage.",
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
          formData.get(
            "fileName",
          ) ?? "",
        ),
        originalName:
          file.name,
        mimeType:
          file.type,
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

    const bytes =
      new Uint8Array(
        await file.arrayBuffer(),
      );

    const staged =
      await stagePublicImage({
        bytes,
        repositoryPath,
        replaceExisting,
      });

    return NextResponse.json({
      success: true,
      staged,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to stage the image.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: Request,
) {
  const session =
    await getApiAdmin();

  if (!session) {
    return NextResponse.json(
      {
        error:
          "Owner access is required.",
      },
      {
        status: 403,
      },
    );
  }

  try {
    const body =
      (await request.json()) as {
        uploads?: unknown;
        deletions?: unknown;
      };

    if (
      !Array.isArray(
        body.uploads,
      ) ||
      !Array.isArray(
        body.deletions,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid pending media changes.",
        },
        {
          status: 400,
        },
      );
    }

    const uploads:
      PublicMediaBatchUpload[] =
      body.uploads.map(
        (item) => {
          if (
            !item ||
            typeof item !==
              "object"
          ) {
            throw new Error(
              "Invalid staged upload.",
            );
          }

          const record =
            item as Record<
              string,
              unknown
            >;

          if (
            typeof record.repositoryPath !==
              "string" ||
            typeof record.blobSha !==
              "string"
          ) {
            throw new Error(
              "Invalid staged upload.",
            );
          }

          return {
            repositoryPath:
              record.repositoryPath,
            blobSha:
              record.blobSha,
          };
        },
      );

    const deletions =
      body.deletions.map(
        (item) => {
          if (
            typeof item !==
            "string"
          ) {
            throw new Error(
              "Invalid pending deletion.",
            );
          }

          return item;
        },
      );

    const result =
      await commitPublicMediaBatch({
        uploads,
        deletions,
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
            : "Unable to save media changes.",
      },
      {
        status: 500,
      },
    );
  }
}
