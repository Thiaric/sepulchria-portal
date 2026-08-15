import "server-only";

const DEFAULT_REPOSITORY =
  "Thiaric/sepulchria-portal";
const DEFAULT_BRANCH = "master";

export const MAX_MEDIA_FILE_BYTES =
  3_500_000;

export const ALLOWED_IMAGE_TYPES =
  new Map<string, string>([
    ["image/png", ".png"],
    ["image/jpeg", ".jpg"],
    ["image/webp", ".webp"],
    ["image/gif", ".gif"],
    ["image/avif", ".avif"],
  ]);

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
};

type GitHubTreeResponse = {
  tree?: GitHubTreeItem[];
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

  const requested =
    requestedName.trim();

  const sourceName =
    requested || originalName;

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

async function getExistingFile(
  repositoryPath: string,
): Promise<GitHubContentsFile | null> {
  const config = getGitHubConfig();

  const response = await githubFetch(
    `/contents/${repositoryPath
      .split("/")
      .map(encodeURIComponent)
      .join("/")}?ref=${encodeURIComponent(
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

export async function uploadPublicImage({
  bytes,
  repositoryPath,
  replaceExisting,
}: {
  bytes: Uint8Array;
  repositoryPath: string;
  replaceExisting: boolean;
}): Promise<{
  repositoryPath: string;
  publicPath: string;
  commitUrl: string | null;
}> {
  const config = getGitHubConfig();

  const existing =
    await getExistingFile(repositoryPath);

  if (
    existing &&
    !replaceExisting
  ) {
    throw new Error(
      "A file already exists at this path. Enable Replace existing file to overwrite it.",
    );
  }

  const encodedContent =
    Buffer.from(bytes).toString("base64");

  const response = await githubFetch(
    `/contents/${repositoryPath
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    {
      method: "PUT",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        message: existing
          ? `Replace media: ${repositoryPath}`
          : `Upload media: ${repositoryPath}`,
        content: encodedContent,
        branch: config.branch,
        ...(existing
          ? { sha: existing.sha }
          : {}),
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `GitHub rejected the upload (${response.status}): ${body}`,
    );
  }

  const data =
    (await response.json()) as {
      commit?: {
        html_url?: string | null;
      };
    };

  return {
    repositoryPath,
    publicPath:
      createPublicPath(repositoryPath),
    commitUrl:
      data.commit?.html_url ?? null,
  };
}

export async function listPublicFolders(): Promise<
  string[]
> {
  const config = getGitHubConfig();

  const response = await githubFetch(
    `/git/trees/${encodeURIComponent(
      config.branch,
    )}?recursive=1`,
  );

  if (!response.ok) {
    return [];
  }

  const data =
    (await response.json()) as
      GitHubTreeResponse;

  const folders = new Set<string>();

  for (const item of data.tree ?? []) {
    if (
      item.type !== "tree" ||
      !item.path.startsWith("public/")
    ) {
      continue;
    }

    folders.add(
      item.path.replace(/^public\//, ""),
    );
  }

  return Array.from(folders).sort(
    (a, b) =>
      a.localeCompare(b, "en"),
  );
}
