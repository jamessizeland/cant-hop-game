import { relaunch } from "@tauri-apps/plugin-process";
import { platform } from "@tauri-apps/plugin-os";
import { check, DownloadEvent } from "@tauri-apps/plugin-updater";
import { notifyError, notifyProgress } from "./notifications";

let updateCheckStarted = false;

const isTauriRuntime = (): boolean => "__TAURI_INTERNALS__" in window;

const isDesktopRuntime = (): boolean =>
  "__TAURI_OS_PLUGIN_INTERNALS__" in window &&
  ["linux", "macos", "windows"].includes(platform());

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/** Check GitHub Releases for a signed updater bundle and install it when found. */
export async function checkForAppUpdate(): Promise<void> {
  if (updateCheckStarted || !isTauriRuntime() || !isDesktopRuntime()) return;
  updateCheckStarted = true;

  try {
    const update = await check();

    if (!update) return;

    let downloaded = 0;
    let contentLength: number | undefined;
    const progress = notifyProgress(
      `Updating Can't Hop to ${update.version}...`,
      "appUpdate"
    );

    const onDownloadEvent = (event: DownloadEvent) => {
      switch (event.event) {
        case "Started":
          contentLength = event.data.contentLength;
          progress.update(`Downloading Can't Hop ${update.version}...`);
          break;
        case "Progress":
          downloaded += event.data.chunkLength;
          progress.update(
            contentLength
              ? `Downloading ${formatBytes(downloaded)} of ${formatBytes(
                  contentLength
                )}...`
              : `Downloading ${formatBytes(downloaded)}...`
          );
          break;
        case "Finished":
          progress.update("Installing update...");
          break;
      }
    };

    await update.downloadAndInstall(onDownloadEvent);
    progress.success("Update installed. Restarting...");
    await relaunch();
  } catch (error) {
    console.error("Error during app update:", error);
    // notifyError(`Could not update app: ${error}`, "appUpdateError", 6000);
  }
}
