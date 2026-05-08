import { relaunch } from "@tauri-apps/plugin-process";
import { arch, platform } from "@tauri-apps/plugin-os";
import { openUrl } from "@tauri-apps/plugin-opener";
import { check, DownloadEvent } from "@tauri-apps/plugin-updater";
import { Channel, invoke } from "@tauri-apps/api/core";
import { appCacheDir, join } from "@tauri-apps/api/path";
import { getVersion } from "@tauri-apps/api/app";
import { notifyClickableInfo, notifyProgress } from "./notifications";

let updateCheckStarted = false;

const LATEST_RELEASE_API_URL =
  "https://api.github.com/repos/jamessizeland/cant-hop-game/releases/latest";

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

interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name?: string;
  name?: string;
  body?: string;
  published_at?: string;
  assets?: GitHubReleaseAsset[];
}

interface AndroidUpdate {
  version: string;
  url: string;
  notes?: string;
  date?: string;
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

const releaseVersion = (release: GitHubRelease): string | null => {
  const rawVersion = release.tag_name ?? release.name ?? "";
  const match = rawVersion.match(/v?(\d+\.\d+\.\d+(?:[-+][\w.-]+)?)/);
  return match?.[1] ?? null;
};

const androidAssetUrl = (
  release: GitHubRelease,
  target: string
): string | null => {
  const assets = release.assets ?? [];
  const matchingAsset = assets.find(
    (asset) => asset.name.endsWith(".apk") && asset.name.includes(target)
  );
  const fallbackAsset = assets.find(
    (asset) =>
      asset.name.endsWith(".apk") &&
      (asset.name.includes("android-universal") ||
        asset.name.includes("universal"))
  );

  return (
    matchingAsset?.browser_download_url ??
    fallbackAsset?.browser_download_url ??
    null
  );
};

const checkAndroidReleaseAsset = async (
  target: string,
  currentVersion: string
): Promise<AndroidUpdate | null> => {
  const response = await fetch(LATEST_RELEASE_API_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`GitHub release API returned ${response.status}`);
  }

  const release = (await response.json()) as GitHubRelease;
  const version = releaseVersion(release);
  if (!version || !isNewerVersion(version, currentVersion)) return null;

  const url = androidAssetUrl(release, target);
  if (!url) {
    throw new Error(`No Android APK release asset found for ${target}`);
  }

  return {
    version,
    url,
    notes: release.body,
    date: release.published_at,
  };
};

const checkAndroidUpdate = async (
  target: string
): Promise<AndroidUpdate | null> => {
  const currentVersion = await getVersion();
  return checkAndroidReleaseAsset(target, currentVersion);
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
      if (!androidUpdate) return;

      const downloadUrl = androidUpdate.url;
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
