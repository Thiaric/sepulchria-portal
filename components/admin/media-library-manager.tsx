"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type PublicMediaImage = {
  repositoryPath: string;
  publicPath: string;
  previewUrl: string;
  size: number | null;
};

type StagedUpload = {
  repositoryPath: string;
  publicPath: string;
  blobSha: string;
  originalName: string;
};

type SaveResult = {
  commitSha: string;
  commitUrl: string;
  changedCount: number;
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

function mediaAnchorId(
  repositoryPath: string,
): string {
  return `admin-media-${encodeURIComponent(
    repositoryPath,
  ).replace(/%/g, "_")}`;
}

function formatBytes(
  bytes: number | null,
): string {
  if (bytes === null) {
    return "Size unavailable";
  }

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
  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const [folders, setFolders] =
    useState<string[]>([]);
  const [images, setImages] =
    useState<PublicMediaImage[]>([]);
  const [folder, setFolder] =
    useState("");
  const [customFileName, setCustomFileName] =
    useState("");
  const [selectedFiles, setSelectedFiles] =
    useState<File[]>([]);
  const [
    replaceExisting,
    setReplaceExisting,
  ] = useState(false);
  const [
    pendingUploads,
    setPendingUploads,
  ] = useState<StagedUpload[]>([]);
  const [
    pendingDeletions,
    setPendingDeletions,
  ] = useState<Set<string>>(
    new Set(),
  );
  const [loadingMedia, setLoadingMedia] =
    useState(true);
  const [staging, setStaging] =
    useState(false);
  const [saving, setSaving] =
    useState(false);
  const [error, setError] =
    useState("");
  const [saveResult, setSaveResult] =
    useState<SaveResult | null>(
      null,
    );

  const loadMedia =
    useCallback(
      async () => {
        setLoadingMedia(true);

        try {
          const response =
            await fetch(
              "/api/admin/media",
              {
                cache:
                  "no-store",
              },
            );

          const data =
            (await response.json()) as {
              folders?: string[];
              images?:
                PublicMediaImage[];
              error?: string;
            };

          if (!response.ok) {
            throw new Error(
              data.error ||
                "Unable to load media.",
            );
          }

          setFolders(
            data.folders ?? [],
          );
          setImages(
            data.images ?? [],
          );
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load media.",
          );
        } finally {
          setLoadingMedia(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadMedia();
  }, [loadMedia]);

  function chooseFiles(
    fileList: FileList | null,
  ) {
    setError("");
    setSaveResult(null);

    const next =
      Array.from(fileList ?? []);

    for (const file of next) {
      if (
        !ACCEPTED_TYPES.includes(
          file.type,
        )
      ) {
        setError(
          `${file.name} is not a supported image type.`,
        );
        return;
      }

      if (
        file.size <= 0 ||
        file.size >
          MAX_FILE_SIZE
      ) {
        setError(
          `${file.name} must be smaller than 3.5 MB.`,
        );
        return;
      }
    }

    setSelectedFiles(next);

    if (
      next.length !== 1
    ) {
      setCustomFileName("");
    }
  }

  async function stageSelectedFiles() {
    if (
      selectedFiles.length === 0
    ) {
      setError(
        "Choose at least one image.",
      );
      return;
    }

    if (
      selectedFiles.length > 1 &&
      customFileName.trim()
    ) {
      setError(
        "A custom filename can only be used when staging one image at a time.",
      );
      return;
    }

    setStaging(true);
    setError("");
    setSaveResult(null);

    try {
      for (
        let index = 0;
        index <
        selectedFiles.length;
        index += 1
      ) {
        const file =
          selectedFiles[index];

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
          selectedFiles.length === 1
            ? customFileName
            : "",
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
            staged?: {
              repositoryPath:
                string;
              publicPath: string;
              blobSha: string;
            };
          };

        if (
          !response.ok ||
          !data.staged
        ) {
          throw new Error(
            data.error ||
              `Unable to stage ${file.name}.`,
          );
        }

        const staged:
          StagedUpload = {
          ...data.staged,
          originalName:
            file.name,
        };

        setPendingUploads(
          (current) => [
            ...current.filter(
              (item) =>
                item.repositoryPath !==
                staged.repositoryPath,
            ),
            staged,
          ],
        );

        setPendingDeletions(
          (current) => {
            const next =
              new Set(current);

            next.delete(
              staged.repositoryPath,
            );

            return next;
          },
        );
      }

      setSelectedFiles([]);
      setCustomFileName("");
      setReplaceExisting(false);

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    } catch (stageError) {
      setError(
        stageError instanceof Error
          ? stageError.message
          : "Unable to stage images.",
      );
    } finally {
      setStaging(false);
    }
  }

  function toggleDeletion(
    repositoryPath: string,
  ) {
    if (
      pendingUploads.some(
        (upload) =>
          upload.repositoryPath ===
          repositoryPath,
      )
    ) {
      setError(
        "Remove the staged replacement before marking this image for deletion.",
      );
      return;
    }

    setError("");
    setSaveResult(null);

    setPendingDeletions(
      (current) => {
        const next =
          new Set(current);

        if (
          next.has(
            repositoryPath,
          )
        ) {
          next.delete(
            repositoryPath,
          );
        } else {
          next.add(
            repositoryPath,
          );
        }

        return next;
      },
    );
  }

  function removeStagedUpload(
    repositoryPath: string,
  ) {
    setPendingUploads(
      (current) =>
        current.filter(
          (item) =>
            item.repositoryPath !==
            repositoryPath,
        ),
    );
  }

  function discardPendingChanges() {
    if (
      pendingUploads.length ===
        0 &&
      pendingDeletions.size ===
        0
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Discard all pending uploads and deletions? Nothing has been committed yet.",
      );

    if (!confirmed) {
      return;
    }

    setPendingUploads([]);
    setPendingDeletions(
      new Set(),
    );
    setError("");
    setSaveResult(null);
  }

  async function saveChanges() {
    if (
      pendingUploads.length ===
        0 &&
      pendingDeletions.size ===
        0
    ) {
      setError(
        "There are no pending media changes.",
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Save ${pendingUploads.length} upload(s) and ${pendingDeletions.size} deletion(s) as one GitHub commit?`,
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setSaveResult(null);

    try {
      const response =
        await fetch(
          "/api/admin/media",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              uploads:
                pendingUploads.map(
                  (upload) => ({
                    repositoryPath:
                      upload.repositoryPath,
                    blobSha:
                      upload.blobSha,
                  }),
                ),
              deletions:
                Array.from(
                  pendingDeletions,
                ),
            }),
          },
        );

      const data =
        (await response.json()) as {
          error?: string;
          commitSha?: string;
          commitUrl?: string;
          changedCount?: number;
        };

      if (
        !response.ok ||
        !data.commitSha ||
        !data.commitUrl ||
        typeof data.changedCount !==
          "number"
      ) {
        throw new Error(
          data.error ||
            "Unable to save media changes.",
        );
      }

      setSaveResult({
        commitSha:
          data.commitSha,
        commitUrl:
          data.commitUrl,
        changedCount:
          data.changedCount,
      });

      setPendingUploads([]);
      setPendingDeletions(
        new Set(),
      );

      await loadMedia();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save media changes.",
      );
    } finally {
      setSaving(false);
    }
  }

  const pendingCount =
    pendingUploads.length +
    pendingDeletions.size;

  return (
    <div className="mt-5 space-y-4 components_admin_media_library_manager_div_container">
      <section className="border border-[rgb(var(--sep-colour-8b673d))]/55 bg-[rgb(var(--sep-colour-17100c))] components_admin_media_library_manager_section_section">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-110d0a))] px-5 py-4 components_admin_media_library_manager_div_container_2">
          <div className="components_admin_media_library_manager_div_media_batch">
            <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-a68152))] components_admin_media_library_manager_p_media_batch">
              Pending changes
            </p>

            <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dfc99f))] components_admin_media_library_manager_h3_media_batch">
              Media Batch
            </h3>

            <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-817567))] components_admin_media_library_manager_p_media_batch_2">
              Stage as many changes as you
              need. Master is updated only
              when you click Save changes.
            </p>
          </div>

          <div className="flex gap-2 components_admin_media_library_manager_div_container_3">
            <button
              type="button"
              disabled={
                pendingCount === 0 ||
                saving
              }
              onClick={
                discardPendingChanges
              }
              className="border border-[rgb(var(--sep-colour-60482e))]/50 px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-a99069))] disabled:opacity-40 components_admin_media_library_manager_button_discard"
            >
              Discard
            </button>

            <button
              type="button"
              disabled={
                pendingCount === 0 ||
                saving
              }
              onClick={() =>
                void saveChanges()
              }
              className="border border-[rgb(var(--sep-colour-a37843))] bg-[rgb(var(--sep-colour-49311c))] px-4 py-2 text-[8px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-f0d5a6))] transition hover:bg-[rgb(var(--sep-colour-5b3d23))] disabled:opacity-40 components_admin_media_library_manager_button_action"
            >
              {saving
                ? "Saving…"
                : `Save changes (${pendingCount})`}
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-2 components_admin_media_library_manager_div_container_4">
          <div className="components_admin_media_library_manager_div_container_5">
            <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_admin_media_library_manager_p_text">
              Staged uploads ·{" "}
              {pendingUploads.length}
            </p>

            <div className="mt-2 space-y-2 components_admin_media_library_manager_div_container_6">
              {pendingUploads.length ===
              0 ? (
                <p className="text-[10px] text-[rgb(var(--sep-colour-706452))] components_admin_media_library_manager_p_text_2">
                  No images staged.
                </p>
              ) : (
                pendingUploads.map(
                  (upload) => (
                    <div
                      key={
                        upload.repositoryPath
                      }
                      className="flex items-center justify-between gap-3 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2 components_admin_media_library_manager_div_container_7"
                    >
                      <div className="min-w-0 components_admin_media_library_manager_div_container_8">
                        <code className="block truncate text-[10px] text-[rgb(var(--sep-colour-c9b28e))]">
                          {
                            upload.publicPath
                          }
                        </code>
                        <span className="text-[8px] text-[rgb(var(--sep-colour-6f6251))] components_admin_media_library_manager_span_text">
                          staged from{" "}
                          {
                            upload.originalName
                          }
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeStagedUpload(
                            upload.repositoryPath,
                          )
                        }
                        className="shrink-0 text-[8px] uppercase tracking-[0.12em] text-red-300 components_admin_media_library_manager_button_remove"
                      >
                        Remove
                      </button>
                    </div>
                  ),
                )
              )}
            </div>
          </div>

          <div className="components_admin_media_library_manager_div_container_9">
            <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_admin_media_library_manager_p_text_3">
              Marked for deletion ·{" "}
              {pendingDeletions.size}
            </p>

            <div className="mt-2 space-y-2 components_admin_media_library_manager_div_container_10">
              {pendingDeletions.size ===
              0 ? (
                <p className="text-[10px] text-[rgb(var(--sep-colour-706452))] components_admin_media_library_manager_p_text_4">
                  No images marked.
                </p>
              ) : (
                Array.from(
                  pendingDeletions,
                ).map(
                  (repositoryPath) => (
                    <div
                      key={
                        repositoryPath
                      }
                      className="flex items-center justify-between gap-3 border border-red-900/35 bg-red-950/10 px-3 py-2 components_admin_media_library_manager_div_container_11"
                    >
                      <code className="min-w-0 truncate text-[10px] text-red-200/80">
                        {repositoryPath.replace(
                          /^public/,
                          "",
                        )}
                      </code>

                      <button
                        type="button"
                        onClick={() =>
                          toggleDeletion(
                            repositoryPath,
                          )
                        }
                        className="shrink-0 text-[8px] uppercase tracking-[0.12em] text-red-300 components_admin_media_library_manager_button_undo"
                      >
                        Undo
                      </button>
                    </div>
                  ),
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div
          role="alert"
          className="border border-red-900/60 bg-red-950/20 px-4 py-3 text-xs text-red-300 components_admin_media_library_manager_div_alert"
        >
          {error}
        </div>
      ) : null}

      {saveResult ? (
        <section className="border border-emerald-900/50 bg-emerald-950/15 px-4 py-3 components_admin_media_library_manager_section_section_2">
          <p className="text-[8px] uppercase tracking-[0.18em] text-emerald-400 components_admin_media_library_manager_p_text_5">
            Batch saved
          </p>

          <p className="mt-2 text-xs text-emerald-100/75 components_admin_media_library_manager_p_text_6">
            {
              saveResult.changedCount
            }{" "}
            media change
            {saveResult.changedCount ===
            1
              ? ""
              : "s"}{" "}
            committed together.
          </p>

          <a
            href={
              saveResult.commitUrl
            }
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block border border-emerald-800/50 px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-emerald-300 components_admin_media_library_manager_a_open_git_hub_commit"
          >
            Open GitHub commit
          </a>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] components_admin_media_library_manager_div_container_12">
        <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] components_admin_media_library_manager_section_section_3">
          <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-110d0a))] px-5 py-4 components_admin_media_library_manager_div_stage_images">
            <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-8c704b))] components_admin_media_library_manager_p_stage_images">
              Upload
            </p>

            <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dfc99f))] components_admin_media_library_manager_h3_stage_images">
              Stage images
            </h3>
          </div>

          <div className="space-y-5 p-5 components_admin_media_library_manager_div_container_13">
            <label className="block components_admin_media_library_manager_label_label">
              <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_admin_media_library_manager_span_text_2">
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
                className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0c0907))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] components_admin_media_library_manager_input_images_orders"
              />

              <datalist id="media-folders">
                {folders.map(
                  (item) => (
                    <option className="components_admin_media_library_manager_option_media_folders"
                      key={item}
                      value={item}
                    />
                  ),
                )}
              </datalist>
            </label>

            <label className="block components_admin_media_library_manager_label_label_2">
              <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_admin_media_library_manager_span_text_3">
                Custom file name
              </span>

              <input
                type="text"
                value={
                  customFileName
                }
                disabled={
                  selectedFiles.length >
                  1
                }
                onChange={(event) =>
                  setCustomFileName(
                    event.target.value,
                  )
                }
                placeholder={
                  selectedFiles.length >
                  1
                    ? "Available for single-image staging only"
                    : "Optional — original name is used"
                }
                className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0c0907))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] disabled:opacity-45 components_admin_media_library_manager_input_field"
              />
            </label>

            <div className="components_admin_media_library_manager_div_container_14">
              <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_admin_media_library_manager_span_text_4">
                Images
              </span>

              <input
                ref={
                  fileInputRef
                }
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.webp,.gif,.avif,image/png,image/jpeg,image/webp,image/gif,image/avif"
                onChange={(event) =>
                  chooseFiles(
                    event.target.files,
                  )
                }
                className="hidden components_admin_media_library_manager_input_field_2"
              />

              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 text-left text-xs text-[rgb(var(--sep-colour-bba687))] transition hover:border-[rgb(var(--sep-colour-9b7446))] components_admin_media_library_manager_button_action_2"
              >
                {selectedFiles.length >
                0
                  ? `${selectedFiles.length} image${
                      selectedFiles.length ===
                      1
                        ? ""
                        : "s"
                    } selected`
                  : "Choose one or more images…"}
              </button>

              {selectedFiles.length >
              0 ? (
                <div className="mt-2 max-h-32 overflow-y-auto border border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-0b0806))] components_admin_media_library_manager_div_container_15">
                  {selectedFiles.map(
                    (file) => (
                      <div
                        key={`${file.name}-${file.size}-${file.lastModified}`}
                        className="flex justify-between gap-3 border-b border-[rgb(var(--sep-colour-60482e))]/20 px-3 py-2 text-[10px] last:border-b-0 components_admin_media_library_manager_div_container_16"
                      >
                        <span className="truncate text-[rgb(var(--sep-colour-ae9a7c))] components_admin_media_library_manager_span_text_5">
                          {file.name}
                        </span>
                        <span className="shrink-0 text-[rgb(var(--sep-colour-6d6151))] components_admin_media_library_manager_span_text_6">
                          {formatBytes(
                            file.size,
                          )}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              ) : null}
            </div>

            <label className="flex items-start gap-3 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 components_admin_media_library_manager_label_label_3">
              <input
                type="checkbox"
                checked={
                  replaceExisting
                }
                onChange={(event) =>
                  setReplaceExisting(
                    event.target.checked,
                  )
                }
                className="mt-0.5 h-4 w-4 accent-[rgb(var(--sep-colour-9b7446))] components_admin_media_library_manager_input_field_3"
              />

              <span className="components_admin_media_library_manager_span_text_7">
                <span className="block text-[9px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-bca27b))] components_admin_media_library_manager_span_text_8">
                  Allow replacement
                </span>

                <span className="mt-1 block text-[9px] leading-4 text-[rgb(var(--sep-colour-756957))] components_admin_media_library_manager_span_text_9">
                  Lets staged uploads replace
                  files already at the same
                  public path when the batch
                  is saved.
                </span>
              </span>
            </label>

            <button
              type="button"
              disabled={
                staging ||
                selectedFiles.length ===
                  0
              }
              onClick={() =>
                void stageSelectedFiles()
              }
              className="w-full border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-3 text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))] disabled:opacity-50 components_admin_media_library_manager_button_action_3"
            >
              {staging
                ? "Staging…"
                : "Add to pending changes"}
            </button>

            <p className="text-[9px] leading-4 text-[rgb(var(--sep-colour-756957))] components_admin_media_library_manager_p_text_7">
              Staging uploads the image bytes
              as Git blobs only. It does not
              change master and does not
              trigger Vercel.
            </p>
          </div>
        </section>

        <aside className="space-y-4 components_admin_media_library_manager_aside_sidebar">
          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 components_admin_media_library_manager_section_section_4">
            <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))] components_admin_media_library_manager_p_text_8">
              Existing folders
            </p>

            <p className="mt-2 text-[9px] leading-4 text-[rgb(var(--sep-colour-756957))] components_admin_media_library_manager_p_text_9">
              {loadingMedia
                ? "Loading repository media…"
                : `${folders.length} public subfolder${
                    folders.length ===
                    1
                      ? ""
                      : "s"
                  } detected.`}
            </p>

            {!loadingMedia &&
            folders.length > 0 ? (
              <div className="mt-3 max-h-64 overflow-y-auto border border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-0c0907))] components_admin_media_library_manager_div_container_17">
                {folders.map(
                  (item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setFolder(
                          item,
                        )
                      }
                      className="block w-full border-b border-[rgb(var(--sep-colour-60482e))]/20 px-3 py-2 text-left text-[10px] text-[rgb(var(--sep-colour-a99678))] last:border-b-0 hover:bg-[rgb(var(--sep-colour-1d140e))] hover:text-[rgb(var(--sep-colour-dec69d))] components_admin_media_library_manager_button_action_4"
                    >
                      /{item}
                    </button>
                  ),
                )}
              </div>
            ) : null}
          </section>

          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 components_admin_media_library_manager_section_section_5">
            <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))] components_admin_media_library_manager_p_text_10">
              Commit behaviour
            </p>

            <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-817567))] components_admin_media_library_manager_p_text_11">
              Upload staging and deletion
              marking create no commits.
              Save changes creates exactly
              one commit containing the
              entire pending batch.
            </p>
          </section>
        </aside>
      </div>

      <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] components_admin_media_library_manager_section_section_6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-110d0a))] px-5 py-4 components_admin_media_library_manager_div_container_18">
          <div className="components_admin_media_library_manager_div_existing_images">
            <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-8c704b))] components_admin_media_library_manager_p_existing_images">
              Library
            </p>

            <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dfc99f))] components_admin_media_library_manager_h3_existing_images">
              Existing Images
            </h3>
          </div>

          <button
            type="button"
            disabled={
              loadingMedia
            }
            onClick={() =>
              void loadMedia()
            }
            className="border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-18110d))] px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-bca27b))] disabled:opacity-50 components_admin_media_library_manager_button_refresh"
          >
            Refresh
          </button>
        </div>

        <div className="p-5 components_admin_media_library_manager_div_container_19">
          {loadingMedia ? (
            <p className="text-xs text-[rgb(var(--sep-colour-817567))] components_admin_media_library_manager_p_text_12">
              Loading images from GitHub…
            </p>
          ) : images.length === 0 ? (
            <p className="text-xs text-[rgb(var(--sep-colour-817567))] components_admin_media_library_manager_p_text_13">
              No supported images were found
              inside public/.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 components_admin_media_library_manager_div_container_20">
              {images.map(
                (image) => {
                  const marked =
                    pendingDeletions.has(
                      image.repositoryPath,
                    );

                  const replacing =
                    pendingUploads.some(
                      (upload) =>
                        upload.repositoryPath ===
                        image.repositoryPath,
                    );

                  return (
                    <article
                      key={
                        image.repositoryPath
                      }
                      id={mediaAnchorId(
                        image.repositoryPath,
                      )}
                      className={[((`scroll-mt-4 overflow-hidden border ${
                        marked
                          ? "border-red-800/70 bg-red-950/10"
                          : replacing
                            ? "border-amber-700/60 bg-amber-950/10"
                            : "border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))]"
                      }`)), "components_admin_media_library_manager_article_article"].filter(Boolean).join(" ")}
                    >
                      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[rgb(var(--sep-colour-090705))] p-2 components_admin_media_library_manager_div_container_21">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            image.previewUrl
                          }
                          alt=""
                          loading="lazy"
                          className={[((`max-h-full max-w-full object-contain ${
                            marked
                              ? "opacity-35"
                              : ""
                          }`)), "components_admin_media_library_manager_img_image"].filter(Boolean).join(" ")}
                        />

                        {marked ? (
                          <span className="absolute inset-x-3 top-3 border border-red-800/60 bg-red-950/90 px-2 py-1 text-center text-[7px] uppercase tracking-[0.14em] text-red-200 components_admin_media_library_manager_span_text_10">
                            Pending deletion
                          </span>
                        ) : replacing ? (
                          <span className="absolute inset-x-3 top-3 border border-amber-700/60 bg-amber-950/90 px-2 py-1 text-center text-[7px] uppercase tracking-[0.14em] text-amber-200 components_admin_media_library_manager_span_text_11">
                            Pending replacement
                          </span>
                        ) : null}
                      </div>

                      <div className="p-3 components_admin_media_library_manager_div_container_22">
                        <code className="block break-all text-[10px] leading-4 text-[rgb(var(--sep-colour-c4ae8d))]">
                          {
                            image.publicPath
                          }
                        </code>

                        <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-706452))] components_admin_media_library_manager_p_text_14">
                          {formatBytes(
                            image.size,
                          )}
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-2 components_admin_media_library_manager_div_container_23">
                          <button
                            type="button"
                            onClick={() =>
                              void navigator.clipboard.writeText(
                                image.publicPath,
                              )
                            }
                            className="border border-[rgb(var(--sep-colour-60482e))]/50 px-2 py-2 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-a99069))] components_admin_media_library_manager_button_copy_path"
                          >
                            Copy path
                          </button>

                          <button
                            type="button"
                            disabled={
                              replacing
                            }
                            onClick={() =>
                              toggleDeletion(
                                image.repositoryPath,
                              )
                            }
                            className={[((`border px-2 py-2 text-[7px] uppercase tracking-[0.14em] disabled:opacity-35 ${
                              marked
                                ? "border-[rgb(var(--sep-colour-80613e))] text-[rgb(var(--sep-colour-c5a77c))]"
                                : "border-red-900/60 bg-red-950/15 text-red-300"
                            }`)), "components_admin_media_library_manager_button_action_5"].filter(Boolean).join(" ")}
                          >
                            {marked
                              ? "Undo delete"
                              : "Mark delete"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
