import "server-only";

const DEFAULT_REPOSITORY =
  "Thiaric/sepulchria-portal";
const DEFAULT_BRANCH = "master";

export const MAX_MEDIA_FILE_BYTES =
  3_500_000;

export const MAX_MEDIA_BATCH_CHANGES =
  100;

export const ALLOWED_IMAGE_TYPES =
  new Map<string, string>([
    ["image/png", ".png"],
    ["image/jpeg", ".jpg"],
    ["image/webp", ".webp"],
    ["image/gif", ".gif"],
    ["image/avif", ".avif"],
  ]);

const IMAGE_EXTENSIONS =
  /\.(png|jpe?g|webp|gif|avif)$/i;

type GitHubConfig = {
  token: string;
  owner: string;
  repo: string;
  branch: string;
};

type GitHubContentsFile = {
  sha: string;
};

type GitHubTreeItem = {
  path: string;
  type: "blob" | "tree" | "commit";
  size?: number;
};

type GitHubTreeResponse = {
  tree?: GitHubTreeItem[];
};

type GitHubRefResponse = {
  object?: {
    sha?: string;
  };
};

type GitHubCommitResponse = {
  sha?: string;
  tree?: {
    sha?: string;
  };
};

type GitHubBlobResponse = {
  sha?: string;
};

type GitHubCreatedCommitResponse = {
  sha?: string;
  html_url?: string | null;
};

export type PublicMediaImage = {
  repositoryPath: string;
  publicPath: string;
  previewUrl: string;
  size: number | null;
};

export type StagedPublicImage = {
  repositoryPath: string;
  publicPath: string;
  blobSha: string;
};

export type PublicMediaBatchUpload = {
  repositoryPath: string;
  blobSha: string;
};

function getGitHubConfig(): GitHubConfig {
  const token =
    process.env.GITHUB_MEDIA_TOKEN?.trim();

  if (!token) {
    throw new Error(
      "GITHUB_MEDIA_TOKEN is not configured.",
    );
  }

  const repository =
    process.env.GITHUB_MEDIA_REPOSITORY?.trim() ||
    DEFAULT_REPOSITORY;

  const [owner, repo, ...rest] =
    repository.split("/");

  if (
    !owner ||
    !repo ||
    rest.length > 0
  ) {
    throw new Error(
      "GITHUB_MEDIA_REPOSITORY must use owner/repository format.",
    );
  }

  return {
    token,
    owner,
    repo,
    branch:
      process.env.GITHUB_MEDIA_BRANCH?.trim() ||
      DEFAULT_BRANCH,
  };
}

async function githubFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const config = getGitHubConfig();

  return fetch(
    `https://api.github.com/repos/${encodeURIComponent(
      config.owner,
    )}/${encodeURIComponent(
      config.repo,
    )}${path}`,
    {
      ...init,
      headers: {
        Accept:
          "application/vnd.github+json",
        Authorization:
          `Bearer ${config.token}`,
        "X-GitHub-Api-Version":
          "2022-11-28",
        "User-Agent":
          "Sepulchria-Admin-Media",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    },
  );
}

function encodeRepositoryPath(
  repositoryPath: string,
): string {
  return repositoryPath
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}

export function normaliseFolder(
  value: string,
): string {
  const cleaned = value
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/^public(?:\/|$)/i, "")
    .replace(/^\/+|\/+$/g, "");

  if (!cleaned) {
    return "";
  }

  const parts = cleaned.split("/");

  for (const part of parts) {
    if (
      !part ||
      part === "." ||
      part === ".." ||
      !/^[a-zA-Z0-9._-]+$/.test(part)
    ) {
      throw new Error(
        "Folders may contain only letters, numbers, dots, underscores and hyphens.",
      );
    }
  }

  return parts.join("/");
}

export function normaliseFileName({
  requestedName,
  originalName,
  mimeType,
}: {
  requestedName: string;
  originalName: string;
  mimeType: string;
}): string {
  const expectedExtension =
    ALLOWED_IMAGE_TYPES.get(mimeType);

  if (!expectedExtension) {
    throw new Error(
      "Unsupported image type.",
    );
  }

  const sourceName =
    requestedName.trim() ||
    originalName;

  const lastDot =
    sourceName.lastIndexOf(".");

  const baseName = (
    lastDot > 0
      ? sourceName.slice(0, lastDot)
      : sourceName
  )
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");

  if (!baseName) {
    throw new Error(
      "Enter a valid file name.",
    );
  }

  return `${baseName}${expectedExtension}`;
}

export function createRepositoryPath(
  folder: string,
  fileName: string,
): string {
  return folder
    ? `public/${folder}/${fileName}`
    : `public/${fileName}`;
}

export function createPublicPath(
  repositoryPath: string,
): string {
  return repositoryPath.replace(
    /^public/,
    "",
  );
}

function assertPublicImagePath(
  repositoryPath: string,
): void {
  if (
    !repositoryPath.startsWith("public/") ||
    repositoryPath.includes("..") ||
    !IMAGE_EXTENSIONS.test(repositoryPath)
  ) {
    throw new Error(
      "Only image files inside public/ can be managed here.",
    );
  }
}

function assertBlobSha(
  sha: string,
): void {
  if (!/^[0-9a-f]{40}$/i.test(sha)) {
    throw new Error(
      "An invalid staged Git blob was supplied.",
    );
  }
}

async function getExistingFile(
  repositoryPath: string,
): Promise<GitHubContentsFile | null> {
  assertPublicImagePath(repositoryPath);

  const config = getGitHubConfig();

  const response = await githubFetch(
    `/contents/${encodeRepositoryPath(
      repositoryPath,
    )}?ref=${encodeURIComponent(
      config.branch,
    )}`,
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `GitHub could not inspect the target path (${response.status}): ${body}`,
    );
  }

  const data =
    (await response.json()) as
      | GitHubContentsFile
      | GitHubContentsFile[];

  if (Array.isArray(data)) {
    throw new Error(
      "The target path points to a folder, not a file.",
    );
  }

  return data;
}

export async function stagePublicImage({
  bytes,
  repositoryPath,
  replaceExisting,
}: {
  bytes: Uint8Array;
  repositoryPath: string;
  replaceExisting: boolean;
}): Promise<StagedPublicImage> {
  assertPublicImagePath(repositoryPath);

  if (!replaceExisting) {
    const existing =
      await getExistingFile(
        repositoryPath,
      );

    if (existing) {
      throw new Error(
        "A file already exists at this path. Enable Replace existing file to stage a replacement.",
      );
    }
  }

  const response = await githubFetch(
    "/git/blobs",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        content:
          Buffer.from(bytes).toString(
            "base64",
          ),
        encoding: "base64",
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `GitHub rejected the staged image (${response.status}): ${body}`,
    );
  }

  const data =
    (await response.json()) as
      GitHubBlobResponse;

  if (!data.sha) {
    throw new Error(
      "GitHub staged the image without returning a blob SHA.",
    );
  }

  return {
    repositoryPath,
    publicPath:
      createPublicPath(repositoryPath),
    blobSha: data.sha,
  };
}

export async function listPublicMedia(): Promise<{
  folders: string[];
  images: PublicMediaImage[];
}> {
  const config = getGitHubConfig();

  const response = await githubFetch(
    `/git/trees/${encodeURIComponent(
      config.branch,
    )}?recursive=1`,
  );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `GitHub could not load public media (${response.status}): ${body}`,
    );
  }

  const data =
    (await response.json()) as
      GitHubTreeResponse;

  const folders =
    new Set<string>();

  const images:
    PublicMediaImage[] = [];

  for (const item of data.tree ?? []) {
    if (
      item.type === "tree" &&
      item.path.startsWith("public/")
    ) {
      folders.add(
        item.path.replace(
          /^public\//,
          "",
        ),
      );
      continue;
    }

    if (
      item.type !== "blob" ||
      !item.path.startsWith("public/") ||
      !IMAGE_EXTENSIONS.test(item.path)
    ) {
      continue;
    }

    images.push({
      repositoryPath:
        item.path,
      publicPath:
        createPublicPath(item.path),
      previewUrl:
        `https://raw.githubusercontent.com/${encodeURIComponent(
          config.owner,
        )}/${encodeURIComponent(
          config.repo,
        )}/${encodeURIComponent(
          config.branch,
        )}/${encodeRepositoryPath(
          item.path,
        )}`,
      size:
        typeof item.size === "number"
          ? item.size
          : null,
    });
  }

  return {
    folders:
      Array.from(folders).sort(
        (a, b) =>
          a.localeCompare(
            b,
            "en",
          ),
      ),
    images: images.sort(
      (a, b) =>
        a.repositoryPath.localeCompare(
          b.repositoryPath,
          "en",
        ),
    ),
  };
}

export async function commitPublicMediaBatch({
  uploads,
  deletions,
}: {
  uploads: PublicMediaBatchUpload[];
  deletions: string[];
}): Promise<{
  commitSha: string;
  commitUrl: string;
  changedCount: number;
}> {
  const config = getGitHubConfig();

  if (
    uploads.length +
      deletions.length ===
    0
  ) {
    throw new Error(
      "There are no pending media changes to save.",
    );
  }

  if (
    uploads.length +
      deletions.length >
    MAX_MEDIA_BATCH_CHANGES
  ) {
    throw new Error(
      `A maximum of ${MAX_MEDIA_BATCH_CHANGES} media changes can be saved in one batch.`,
    );
  }

  const uploadPaths =
    new Set<string>();

  for (const upload of uploads) {
    assertPublicImagePath(
      upload.repositoryPath,
    );
    assertBlobSha(upload.blobSha);

    if (
      uploadPaths.has(
        upload.repositoryPath,
      )
    ) {
      throw new Error(
        `The upload path ${upload.repositoryPath} appears more than once.`,
      );
    }

    uploadPaths.add(
      upload.repositoryPath,
    );
  }

  const deletePaths =
    new Set<string>();

  for (const repositoryPath of deletions) {
    assertPublicImagePath(
      repositoryPath,
    );

    if (
      deletePaths.has(
        repositoryPath,
      )
    ) {
      throw new Error(
        `The deletion path ${repositoryPath} appears more than once.`,
      );
    }

    if (
      uploadPaths.has(
        repositoryPath,
      )
    ) {
      throw new Error(
        `The same path cannot be uploaded and deleted in one batch: ${repositoryPath}`,
      );
    }

    deletePaths.add(
      repositoryPath,
    );
  }

  const refResponse =
    await githubFetch(
      `/git/ref/heads/${encodeURIComponent(
        config.branch,
      )}`,
    );

  if (!refResponse.ok) {
    const body =
      await refResponse.text();

    throw new Error(
      `GitHub could not load the current branch (${refResponse.status}): ${body}`,
    );
  }

  const refData =
    (await refResponse.json()) as
      GitHubRefResponse;

  const parentCommitSha =
    refData.object?.sha;

  if (!parentCommitSha) {
    throw new Error(
      "GitHub did not return the current branch commit.",
    );
  }

  const parentResponse =
    await githubFetch(
      `/git/commits/${encodeURIComponent(
        parentCommitSha,
      )}`,
    );

  if (!parentResponse.ok) {
    const body =
      await parentResponse.text();

    throw new Error(
      `GitHub could not load the parent commit (${parentResponse.status}): ${body}`,
    );
  }

  const parentData =
    (await parentResponse.json()) as
      GitHubCommitResponse;

  const baseTreeSha =
    parentData.tree?.sha;

  if (!baseTreeSha) {
    throw new Error(
      "GitHub did not return the parent tree.",
    );
  }

  const treeEntries = [
    ...uploads.map(
      (upload) => ({
        path:
          upload.repositoryPath,
        mode: "100644",
        type: "blob",
        sha: upload.blobSha,
      }),
    ),
    ...deletions.map(
      (repositoryPath) => ({
        path: repositoryPath,
        mode: "100644",
        type: "blob",
        sha: null,
      }),
    ),
  ];

  const treeResponse =
    await githubFetch(
      "/git/trees",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeEntries,
        }),
      },
    );

  if (!treeResponse.ok) {
    const body =
      await treeResponse.text();

    throw new Error(
      `GitHub could not create the media tree (${treeResponse.status}): ${body}`,
    );
  }

  const treeData =
    (await treeResponse.json()) as {
      sha?: string;
    };

  if (!treeData.sha) {
    throw new Error(
      "GitHub created the media tree without returning its SHA.",
    );
  }

  const uploadCount =
    uploads.length;
  const deletionCount =
    deletions.length;

  const commitMessage =
    `Update media library (${uploadCount} upload${
      uploadCount === 1
        ? ""
        : "s"
    }, ${deletionCount} deletion${
      deletionCount === 1
        ? ""
        : "s"
    })`;

  const commitResponse =
    await githubFetch(
      "/git/commits",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          message:
            commitMessage,
          tree: treeData.sha,
          parents: [
            parentCommitSha,
          ],
        }),
      },
    );

  if (!commitResponse.ok) {
    const body =
      await commitResponse.text();

    throw new Error(
      `GitHub could not create the media commit (${commitResponse.status}): ${body}`,
    );
  }

  const commitData =
    (await commitResponse.json()) as
      GitHubCreatedCommitResponse;

  if (!commitData.sha) {
    throw new Error(
      "GitHub created the commit without returning its SHA.",
    );
  }

  const updateRefResponse =
    await githubFetch(
      `/git/refs/heads/${encodeURIComponent(
        config.branch,
      )}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          sha: commitData.sha,
          force: false,
        }),
      },
    );

  if (!updateRefResponse.ok) {
    const body =
      await updateRefResponse.text();

    throw new Error(
      `The media commit was created but master moved before it could be saved (${updateRefResponse.status}). Refresh the Media Library and save again. GitHub response: ${body}`,
    );
  }

  return {
    commitSha: commitData.sha,
    commitUrl:
      commitData.html_url ||
      `https://github.com/${config.owner}/${config.repo}/commit/${commitData.sha}`,
    changedCount:
      uploads.length +
      deletions.length,
  };
}
