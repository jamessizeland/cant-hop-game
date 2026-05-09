import { relaunch } from "@tauri-apps/plugin-process";
import { arch, platform } from "@tauri-apps/plugin-os";
import { openUrl } from "@tauri-apps/plugin-opener";
import { check, DownloadEvent } from "@tauri-apps/plugin-updater";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { writeFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { appCacheDir, join } from "@tauri-apps/api/path";
import { getVersion } from "@tauri-apps/api/app";
import {
  notifyClickableInfo,
  notifyError,
  notifyInfo,
} from "./notifications";

let updateCheckStarted = false;

const LATEST_RELEASE_MANIFEST_URL =
  "https://github.com/jamessizeland/cant-hop-game/releases/latest/download/latest.json";
export const APP_RELEASES_URL =
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

interface UpdateManifestPlatform {
  signature?: string;
  url?: string;
}

interface UpdateManifest {
  version?: string;
  notes?: string;
  pub_date?: string;
  platforms?: Record<string, UpdateManifestPlatform>;
}

interface AndroidUpdate {
  version: string;
  url: string;
  notes?: string;
  date?: string;
}

export interface AppUpdateProgress {
  status: string;
  downloaded?: number;
  total?: number;
}

export interface AvailableAppUpdate {
  version: string;
  notes?: string;
  install: (onProgress: (progress: AppUpdateProgress) => void) => Promise<void>;
}

const installPackage = (path: string): Promise<InstallPackageResponse> =>
  invoke("plugin:apk-installer|install_package", {
    payload: { path },
  });

const downloadFile = (
  url: string,
  filePath: string,
  onProgress: (progress: DownloadProgress) => void
): Promise<void> =>
  tauriFetch(url).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const total = Number.parseInt(
      response.headers.get("content-length") ?? "0",
      10
    );
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Download response had no body");
    }

    let progress = 0;
    const progressStream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }

        progress += value.byteLength;
        onProgress({ progress, total });
        controller.enqueue(value);
      },
      cancel(reason) {
        return reader.cancel(reason);
      },
    });

    await writeFile(filePath, progressStream);
  });

const versionParts = (version: string): number[] =>
  version
    .replace(/^v/i, "")
    .split(/[+-]/)[0]
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

const checkAndroidReleaseAsset = async (
  target: string,
  currentVersion: string
): Promise<AndroidUpdate | null> => {
  const response = await tauriFetch(LATEST_RELEASE_MANIFEST_URL);
  const manifest = (await response.json()) as UpdateManifest;
  const version = manifest.version?.replace(/^v/i, "");
  if (!version || !isNewerVersion(version, currentVersion)) return null;

  const platform =
    manifest.platforms?.[target] ?? manifest.platforms?.["android-universal"];
  if (!platform?.url) {
    throw new Error(`No Android APK updater entry found for ${target}`);
  }

  return {
    version,
    url: platform.url,
    notes: manifest.notes,
    date: manifest.pub_date,
  };
};

const checkAndroidUpdate = async (
  target: string
): Promise<AndroidUpdate | null> => {
  const currentVersion = await getVersion();
  return checkAndroidReleaseAsset(target, currentVersion);
};

export async function diagnoseAppUpdate(): Promise<void> {
  try {
    const tauriRuntime = isTauriRuntime();
    const osPluginRuntime = "__TAURI_OS_PLUGIN_INTERNALS__" in window;
    const runtimePlatform = currentPlatform();
    const runtimeArch = osPluginRuntime ? arch() : "unknown";
    const androidTarget =
      runtimePlatform === "android" ? androidUpdateTarget() : "n/a";
    const currentVersion = tauriRuntime ? await getVersion() : "unknown";

    if (runtimePlatform !== "android") {
      notifyInfo(
        `Updater diagnostics: platform=${runtimePlatform ?? "unknown"}, arch=${runtimeArch}, version=${currentVersion}`,
        "appUpdateDiagnostics",
        10000
      );
      return;
    }

    const response = await tauriFetch(LATEST_RELEASE_MANIFEST_URL);
    const manifest = (await response.json()) as UpdateManifest;
    const remoteVersion = manifest.version?.replace(/^v/i, "") ?? "unknown";
    const platform =
      manifest.platforms?.[androidTarget] ??
      manifest.platforms?.["android-universal"];
    const decision = isNewerVersion(remoteVersion, currentVersion)
      ? platform?.url
        ? "update available"
        : "missing APK entry"
      : "not newer";

    notifyInfo(
      `Updater diagnostics: platform=${runtimePlatform}, arch=${runtimeArch}, target=${androidTarget}, current=${currentVersion}, remote=${remoteVersion}, decision=${decision}`,
      "appUpdateDiagnostics",
      15000
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    notifyError(`Updater diagnostics failed: ${message}`, "appUpdateDiagnostics", 15000);
    console.error("Updater diagnostics failed:", error);
  }
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export { formatBytes };

export async function getAvailableAppUpdate(
  force = false
): Promise<AvailableAppUpdate | null> {
  if (!force && updateCheckStarted) return null;
  if (!isTauriRuntime() || !isUpdaterRuntime()) {
    if (force) {
      notifyError("Updater is not available in this runtime.", "appUpdate", 8000);
    }
    return null;
  }
  updateCheckStarted = true;

  const runtimePlatform = currentPlatform();
  const androidTarget =
    runtimePlatform === "android" ? androidUpdateTarget() : null;
  if (androidTarget) {
    const androidUpdate = await checkAndroidUpdate(androidTarget);
    if (!androidUpdate) {
      if (force) {
        notifyInfo("No Android update available.", "appUpdate", 6000);
      }
      return null;
    }

    return {
      version: androidUpdate.version,
      notes: androidUpdate.notes,
      install: async (onProgress) => {
        const downloadUrl = androidUpdate.url;
        let downloaded = 0;
        let contentLength = 0;
        const apkPath = await join(
          await appCacheDir(),
          `cant-hop-${androidUpdate.version}.apk`
        );

        onProgress({
          status: `Downloading Can't Hop ${androidUpdate.version}...`,
        });
        await downloadFile(downloadUrl, apkPath, (event) => {
          downloaded = event.progress;
          contentLength = event.total;
          onProgress({
            status: contentLength
              ? `Downloading ${formatBytes(downloaded)} of ${formatBytes(
                  contentLength
                )}...`
              : `Downloading ${formatBytes(downloaded)}...`,
            downloaded,
            total: contentLength,
          });
        });

        onProgress({
          status: "Opening Android installer...",
          downloaded,
          total: contentLength,
        });
        const installResult = await installPackage(apkPath);
        if (installResult.success) {
          onProgress({
            status: "APK ready. Finish installation in Android.",
            downloaded,
            total: contentLength,
          });
          return;
        }

        notifyClickableInfo(
          `Tap to download Can't Hop ${androidUpdate.version} in your browser.`,
          () => openUrl(downloadUrl),
          "appUpdateFallback",
          false
        );
        throw new Error(installResult.error ?? "Failed to open APK installer.");
      },
    };
  }

  const update = await check(
    androidTarget ? { target: androidTarget } : undefined
  );

  if (!update) return null;

  return {
    version: update.version,
    notes: update.body,
    install: async (onProgress) => {
      let downloaded = 0;
      let contentLength: number | undefined;
      const onDownloadEvent = (event: DownloadEvent) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength;
            onProgress({
              status: `Downloading Can't Hop ${update.version}...`,
              total: contentLength,
            });
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            onProgress({
              status: contentLength
                ? `Downloading ${formatBytes(downloaded)} of ${formatBytes(
                    contentLength
                  )}...`
                : `Downloading ${formatBytes(downloaded)}...`,
              downloaded,
              total: contentLength,
            });
            break;
          case "Finished":
            onProgress({
              status: "Installing update...",
              downloaded,
              total: contentLength,
            });
            break;
        }
      };

      await update.downloadAndInstall(onDownloadEvent);
      onProgress({
        status: "Update installed. Restarting...",
        downloaded,
        total: contentLength,
      });
      await relaunch();
    },
  };
}

/** Check GitHub Releases for an update and open the manual download page. */
export async function checkForAppUpdate(force = false): Promise<void> {
  try {
    const update = await getAvailableAppUpdate(force);
    if (!update) return;

    notifyInfo(
      `Can't Hop ${update.version} is available. Opening GitHub Releases...`,
      "appUpdate",
      8000
    );
    await openUrl(APP_RELEASES_URL);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (force) {
      notifyError(`Update check failed: ${message}`, "appUpdate", 12000);
    }
    console.error("Error during app update:", error);
  }
}
