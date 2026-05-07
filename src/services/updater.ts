import { relaunch } from "@tauri-apps/plugin-process";
import { arch, platform } from "@tauri-apps/plugin-os";
import { openUrl } from "@tauri-apps/plugin-opener";
import { check, DownloadEvent } from "@tauri-apps/plugin-updater";
import { Channel, invoke } from "@tauri-apps/api/core";
import { appCacheDir, join } from "@tauri-apps/api/path";
import { getVersion } from "@tauri-apps/api/app";
import { notifyClickableInfo, notifyProgress } from "./notifications";

let updateCheckStarted = false;

const LATEST_RELEASE_URL =
  "https://github.com/jamessizeland/cant-hop-game/releases/latest";
const LATEST_UPDATE_JSON_URL =
  "https://github.com/jamessizeland/cant-hop-game/releases/latest/download/latest.json";

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

interface AndroidUpdateManifest {
  version?: string;
  pub_date?: string;
  date?: string;
  notes?: string;
  body?: string;
  platforms?: Record<string, { url?: string; signature?: string }>;
  url?: string;
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

const versionParts = (version: string): number[] =>
  version
    .replace(/^v/i, "")
    .split(/[.+-]/)[0]
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);

const isNewerVersion = (remoteVersion: string, currentVersion: string) => {
  const remote = versionParts(remoteVersion);
  const current = versionParts(currentVersion);
  const length = Math.max(remote.length, current.length);

  for (let index = 0; index < length; index += 1) {
    const remotePart = remote[index] ?? 0;
    const currentPart = current[index] ?? 0;
    if (remotePart > currentPart) return true;
    if (remotePart < currentPart) return false;
  }

  return false;
};

const checkAndroidUpdate = async (
  target: string
): Promise<AndroidUpdateManifest | null> => {
  const [currentVersion, response] = await Promise.all([
    getVersion(),
    fetch(LATEST_UPDATE_JSON_URL, { cache: "no-store" }),
  ]);

  if (!response.ok) {
    throw new Error(`Update manifest returned ${response.status}`);
  }

  const manifest = (await response.json()) as AndroidUpdateManifest;
  if (!manifest.version || !isNewerVersion(manifest.version, currentVersion)) {
    return null;
  }

  const downloadUrl = updateDownloadUrl(
    manifest as Record<string, unknown>,
    target
  );
  if (downloadUrl === LATEST_RELEASE_URL) {
    throw new Error(`No Android APK URL found for ${target}`);
  }

  return manifest;
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
    if (androidTarget) {
      const androidUpdate = await checkAndroidUpdate(androidTarget);
      if (!androidUpdate?.version) return;

      const downloadUrl = updateDownloadUrl(
        androidUpdate as Record<string, unknown>,
        androidTarget
      );
      let downloaded = 0;
      let contentLength = 0;
      const progress = notifyProgress(
        `Updating Can't Hop to ${androidUpdate.version}...`,
        "appUpdate"
      );
      const apkPath = await join(
        await appCacheDir(),
        `cant-hop-${androidUpdate.version}.apk`
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
          `Tap to download Can't Hop ${androidUpdate.version} in your browser.`,
          () => openUrl(downloadUrl),
          "appUpdateFallback",
          false
        );
      }
      return;
    }

    const update = await check(
      androidTarget ? { target: androidTarget } : undefined
    );

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
  }
}
