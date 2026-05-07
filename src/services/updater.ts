import { relaunch } from "@tauri-apps/plugin-process";
import { arch, platform } from "@tauri-apps/plugin-os";
import { openUrl } from "@tauri-apps/plugin-opener";
import { check, DownloadEvent } from "@tauri-apps/plugin-updater";
import { Channel, invoke } from "@tauri-apps/api/core";
import { appCacheDir, join } from "@tauri-apps/api/path";
import { notifyClickableInfo, notifyProgress } from "./notifications";

let updateCheckStarted = false;

const LATEST_RELEASE_URL =
  "https://github.com/jamessizeland/cant-hop-game/releases/latest";

const isTauriRuntime = (): boolean => "__TAURI_INTERNALS__" in window;

const currentPlatform = () =>
  "__TAURI_OS_PLUGIN_INTERNALS__" in window ? platform() : null;

const isUpdaterRuntime = (): boolean =>
  "__TAURI_OS_PLUGIN_INTERNALS__" in window &&
  ["android", "linux", "macos", "windows"].includes(platform());

const androidUpdateTarget = (): string => {
  switch (arch()) {
    case "aarch64":
      return "android-arm64";
    case "arm":
      return "android-arm";
    case "x86":
      return "android-x86";
    case "x86_64":
      return "android-x86_64";
    default:
      return "android";
  }
};

interface DownloadProgress {
  progress: number;
  total: number;
}

interface InstallPackageResponse {
  success: boolean;
  error?: string;
}

const installPackage = (path: string): Promise<InstallPackageResponse> =>
  invoke("plugin:apk-installer|install_package", {
    payload: { path },
  });

const downloadFile = (
  url: string,
  filePath: string,
  onProgress: (progress: DownloadProgress) => void
): Promise<void> => {
  const channel = new Channel<DownloadProgress>();
  channel.onmessage = onProgress;
  return invoke("download_file", {
    url,
    filePath,
    onProgress: channel,
  });
};

const updateDownloadUrl = (
  rawJson: Record<string, unknown>,
  target: string
): string => {
  const platforms = rawJson.platforms;
  if (platforms && typeof platforms === "object") {
    const platformMap = platforms as Record<string, unknown>;
    const platformEntry = platformMap[target] ?? platformMap.android;
    if (
      platformEntry &&
      typeof platformEntry === "object" &&
      "url" in platformEntry
    ) {
      const url = (platformEntry as Record<string, unknown>).url;
      if (typeof url === "string") return url;
    }
  }

  const url = rawJson.url;
  return typeof url === "string" ? url : LATEST_RELEASE_URL;
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/** Check GitHub Releases for a signed updater bundle and install it when found. */
export async function checkForAppUpdate(): Promise<void> {
  if (updateCheckStarted || !isTauriRuntime() || !isUpdaterRuntime()) return;
  updateCheckStarted = true;

  try {
    const runtimePlatform = currentPlatform();
    const androidTarget =
      runtimePlatform === "android" ? androidUpdateTarget() : null;
    const update = await check(
      androidTarget ? { target: androidTarget } : undefined
    );

    if (!update) return;

    if (androidTarget) {
      const downloadUrl = updateDownloadUrl(update.rawJson, androidTarget);
      let downloaded = 0;
      let contentLength = 0;
      const progress = notifyProgress(
        `Updating Can't Hop to ${update.version}...`,
        "appUpdate"
      );
      const apkPath = await join(
        await appCacheDir(),
        `cant-hop-${update.version}.apk`
      );

      await downloadFile(downloadUrl, apkPath, (event) => {
        downloaded = event.progress;
        contentLength = event.total;
        progress.update(
          contentLength
            ? `Downloading ${formatBytes(downloaded)} of ${formatBytes(
                contentLength
              )}...`
            : `Downloading ${formatBytes(downloaded)}...`
        );
      });

      progress.update("Opening Android installer...");
      const installResult = await installPackage(apkPath);
      if (installResult.success) {
        progress.success("APK ready. Finish installation in Android.", 8000);
      } else {
        progress.error(installResult.error ?? "Failed to open APK installer.");
        notifyClickableInfo(
          `Tap to download Can't Hop ${update.version} in your browser.`,
          () => openUrl(downloadUrl),
          "appUpdateFallback",
          false
        );
      }
      return;
    }

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
  }
}
