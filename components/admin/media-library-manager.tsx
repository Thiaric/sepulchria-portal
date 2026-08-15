"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type UploadResult = {
  repositoryPath: string;
  publicPath: string;
  commitUrl: string | null;
};

const MAX_FILE_SIZE =
  3_500_000;

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
];

function formatBytes(
  bytes: number,
): string {
  if (bytes < 1000) {
    return `${bytes} B`;
  }

  if (bytes < 1_000_000) {
    return `${(
      bytes / 1000
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes / 1_000_000
  ).toFixed(2)} MB`;
}

export function MediaLibraryManager() {
  const inputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const [folders, setFolders] =
    useState<string[]>([]);
  const [folder, setFolder] =
    useState("");
  const [fileName, setFileName] =
    useState("");
  const [file, setFile] =
    useState<File | null>(null);
  const [
    replaceExisting,
    setReplaceExisting,
  ] = useState(false);
  const [loadingFolders, setLoadingFolders] =
    useState(true);
  const [uploading, setUploading] =
    useState(false);
  const [error, setError] =
    useState("");
  const [result, setResult] =
    useState<UploadResult | null>(
      null,
    );

  useEffect(() => {
    let active = true;

    async function loadFolders() {
      try {
        const response =
          await fetch(
            "/api/admin/media",
            {
              cache: "no-store",
            },
          );

        const data =
          (await response.json()) as {
            folders?: string[];
            error?: string;
          };

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to load folders.",
          );
        }

        if (active) {
          setFolders(
            data.folders ?? [],
          );
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load folders.",
          );
        }
      } finally {
        if (active) {
          setLoadingFolders(false);
        }
      }
    }

    void loadFolders();

    return () => {
      active = false;
    };
  }, []);

  const previewUrl = useMemo(
    () =>
      file
        ? URL.createObjectURL(file)
        : null,
    [file],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl,
        );
      }
    };
  }, [previewUrl]);

  function chooseFile(
    selectedFile:
      | File
      | null,
  ) {
    setError("");
    setResult(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (
      !ACCEPTED_TYPES.includes(
        selectedFile.type,
      )
    ) {
      setError(
        "Choose a PNG, JPG, WebP, GIF or AVIF image.",
      );
      return;
    }

    if (
      selectedFile.size >
      MAX_FILE_SIZE
    ) {
      setError(
        "The image must be smaller than 3.5 MB.",
      );
      return;
    }

    setFile(selectedFile);
  }

  async function upload() {
    if (!file) {
      setError(
        "Choose an image first.",
      );
      return;
    }

    setUploading(true);
    setError("");
    setResult(null);

    try {
      const formData =
        new FormData();

      formData.set(
        "file",
        file,
      );
      formData.set(
        "folder",
        folder,
      );
      formData.set(
        "fileName",
        fileName,
      );
      formData.set(
        "replaceExisting",
        replaceExisting
          ? "true"
          : "false",
      );

      const response =
        await fetch(
          "/api/admin/media",
          {
            method: "POST",
            body: formData,
          },
        );

      const data =
        (await response.json()) as {
          error?: string;
          repositoryPath?: string;
          publicPath?: string;
          commitUrl?: string | null;
        };

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Upload failed.",
        );
      }

      if (
        !data.repositoryPath ||
        !data.publicPath
      ) {
        throw new Error(
          "The upload completed without a valid path.",
        );
      }

      setResult({
        repositoryPath:
          data.repositoryPath,
        publicPath:
          data.publicPath,
        commitUrl:
          data.commitUrl ?? null,
      });

      const newFolder =
        data.repositoryPath
          .replace(/^public\/?/, "")
          .split("/")
          .slice(0, -1)
          .join("/");

      if (newFolder) {
        setFolders((current) =>
          Array.from(
            new Set([
              ...current,
              newFolder,
            ]),
          ).sort(),
        );
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="border border-[#60482e]/45 bg-[#15100d]">
        <div className="border-b border-[#60482e]/35 bg-[#110d0a] px-5 py-4">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[#8c704b]">
            Upload
          </p>
          <h3 className="mt-1 font-serif text-xl text-[#dfc99f]">
            Add image to /public
          </h3>
        </div>

        <div className="space-y-5 p-5">
          <label className="block">
            <span className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">
              Subfolder
            </span>

            <input
              type="text"
              value={folder}
              onChange={(event) =>
                setFolder(
                  event.target.value,
                )
              }
              list="media-folders"
              placeholder="images/orders"
              className="mt-2 w-full border border-[#60482e]/55 bg-[#0c0907] px-3 py-2.5 text-xs text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
            />

            <datalist id="media-folders">
              {folders.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  />
                ),
              )}
            </datalist>

            <span className="mt-1 block text-[9px] leading-4 text-[#756957]">
              Leave blank for public/. A new
              subfolder is created when its
              first image is uploaded.
            </span>
          </label>

          <label className="block">
            <span className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">
              Custom file name
            </span>

            <input
              type="text"
              value={fileName}
              onChange={(event) =>
                setFileName(
                  event.target.value,
                )
              }
              placeholder="Optional — original name is used"
              className="mt-2 w-full border border-[#60482e]/55 bg-[#0c0907] px-3 py-2.5 text-xs text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
            />
          </label>

          <div>
            <span className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">
              Image
            </span>

            <input
              ref={inputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.gif,.avif,image/png,image/jpeg,image/webp,image/gif,image/avif"
              onChange={(event) =>
                chooseFile(
                  event.target
                    .files?.[0] ??
                    null,
                )
              }
              className="hidden"
            />

            <button
              type="button"
              onClick={() =>
                inputRef.current?.click()
              }
              className="mt-2 w-full border border-[#60482e]/55 bg-[#100c09] px-4 py-3 text-left text-xs text-[#bba687] transition hover:border-[#9b7446]"
            >
              {file
                ? `${file.name} · ${formatBytes(
                    file.size,
                  )}`
                : "Choose image…"}
            </button>

            <span className="mt-1 block text-[9px] leading-4 text-[#756957]">
              PNG, JPG, WebP, GIF or AVIF.
              Maximum 3.5 MB.
            </span>
          </div>

          <label className="flex items-start gap-3 border border-[#60482e]/40 bg-[#100c09] px-4 py-3">
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={(event) =>
                setReplaceExisting(
                  event.target.checked,
                )
              }
              className="mt-0.5 h-4 w-4 accent-[#9b7446]"
            />
            <span>
              <span className="block text-[9px] uppercase tracking-[0.15em] text-[#bca27b]">
                Replace existing file
              </span>
              <span className="mt-1 block text-[9px] leading-4 text-[#756957]">
                Otherwise an existing path
                blocks the upload.
              </span>
            </span>
          </label>

          {error ? (
            <div
              role="alert"
              className="border border-red-900/60 bg-red-950/20 px-4 py-3 text-xs text-red-300"
            >
              {error}
            </div>
          ) : null}

          <button
            type="button"
            disabled={
              uploading || !file
            }
            onClick={() =>
              void upload()
            }
            className="w-full border border-[#987344] bg-[#3b2919] px-4 py-3 text-[8px] uppercase tracking-[0.2em] text-[#efd6a8] transition hover:border-[#b98c50] hover:bg-[#50371f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading
              ? "Uploading…"
              : "Upload to public"}
          </button>
        </div>
      </section>

      <aside className="space-y-4">
        <section className="border border-[#60482e]/45 bg-[#15100d] p-4">
          <p className="text-[8px] uppercase tracking-[0.2em] text-[#806b50]">
            Preview
          </p>

          <div className="mt-3 flex min-h-52 items-center justify-center overflow-hidden border border-[#60482e]/35 bg-[#090705] p-3">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Selected upload preview"
                className="max-h-64 max-w-full object-contain"
              />
            ) : (
              <span className="text-[9px] uppercase tracking-[0.14em] text-[#625747]">
                No image selected
              </span>
            )}
          </div>
        </section>

        <section className="border border-[#60482e]/45 bg-[#15100d] p-4">
          <p className="text-[8px] uppercase tracking-[0.2em] text-[#806b50]">
            Existing folders
          </p>

          <p className="mt-2 text-[9px] leading-4 text-[#756957]">
            {loadingFolders
              ? "Loading repository folders…"
              : `${folders.length} public subfolder${
                  folders.length === 1
                    ? ""
                    : "s"
                } detected.`}
          </p>

          {!loadingFolders &&
          folders.length > 0 ? (
            <div className="mt-3 max-h-48 overflow-y-auto border border-[#60482e]/30 bg-[#0c0907]">
              {folders.map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      setFolder(item)
                    }
                    className="block w-full border-b border-[#60482e]/20 px-3 py-2 text-left text-[10px] text-[#a99678] last:border-b-0 hover:bg-[#1d140e] hover:text-[#dec69d]"
                  >
                    /{item}
                  </button>
                ),
              )}
            </div>
          ) : null}
        </section>

        {result ? (
          <section className="border border-emerald-900/50 bg-emerald-950/15 p-4">
            <p className="text-[8px] uppercase tracking-[0.2em] text-emerald-400">
              Upload committed
            </p>

            <ResultPath
              label="Repository path"
              value={
                result.repositoryPath
              }
            />

            <ResultPath
              label="Site path"
              value={result.publicPath}
            />

            {result.commitUrl ? (
              <a
                href={result.commitUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block border border-emerald-800/50 px-3 py-2 text-center text-[8px] uppercase tracking-[0.16em] text-emerald-300 transition hover:border-emerald-600"
              >
                Open GitHub commit
              </a>
            ) : null}

            <p className="mt-3 text-[9px] leading-4 text-emerald-200/65">
              The image is committed to the
              repository and becomes live
              after a deployment containing
              that commit completes.
            </p>
          </section>
        ) : null}
      </aside>
    </div>
  );
}

function ResultPath({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  async function copy() {
    await navigator.clipboard.writeText(
      value,
    );
  }

  return (
    <div className="mt-3">
      <span className="block text-[7px] uppercase tracking-[0.16em] text-emerald-400/70">
        {label}
      </span>

      <div className="mt-1 flex gap-2">
        <code className="min-w-0 flex-1 break-all border border-emerald-900/40 bg-black/20 px-2 py-2 text-[10px] text-emerald-100/80">
          {value}
        </code>

        <button
          type="button"
          onClick={() =>
            void copy()
          }
          className="shrink-0 border border-emerald-900/50 px-2 text-[7px] uppercase tracking-[0.12em] text-emerald-300"
        >
          Copy
        </button>
      </div>
    </div>
  );
}
