import { useEffect, useState } from "react";
import Modal from "@/components/elements/modal";
import {
  AppUpdateProgress,
  AvailableAppUpdate,
  formatBytes,
  getAvailableAppUpdate,
} from "@/services/updater";

export function AppUpdatePrompt() {
  const [update, setUpdate] = useState<AvailableAppUpdate | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [progress, setProgress] = useState<AppUpdateProgress>({
    status: "Ready to download.",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAvailableAppUpdate()
      .then((availableUpdate) => {
        if (availableUpdate) {
          setUpdate(availableUpdate);
          setProgress({ status: "Ready to download." });
        }
      })
      .catch((reason) => {
        console.error("Error checking for app update:", reason);
      });
  }, []);

  if (!update) return null;

  const percentage =
    progress.total && progress.downloaded
      ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100))
      : 0;

  async function handleInstall() {
    if (!update) return;

    setIsInstalling(true);
    setError(null);
    try {
      await update.install(setProgress);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      setError(message);
      setIsInstalling(false);
    }
  }

  return (
    <>
      <button
        className="btn outline-4 fixed top-1 left-1/2 w-[90%] z-40 -translate-x-1/2 shadow-lg"
        onClick={() => setIsOpen(true)}
      >
        Update available - {update.version}
      </button>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          if (!isInstalling) setIsOpen(false);
        }}
        title={`Update to ${update.version}?`}
        actions={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => setIsOpen(false)}
              disabled={isInstalling}
            >
              Later
            </button>
            <button
              className="btn btn-primary"
              onClick={handleInstall}
              disabled={isInstalling}
            >
              Download
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm max-h-[60vh] overflow-hidden">
          {update.notes ? <p className="opacity-80 overflow-auto">{update.notes}</p> : null}
          <div>
            <progress
              className="progress progress-primary w-full"
              value={percentage}
              max="100"
            />
            <div className="mt-2 flex items-center justify-between gap-3 opacity-75">
              <span>{progress.status}</span>
              {progress.total && progress.downloaded ? (
                <span className="shrink-0">
                  {formatBytes(progress.downloaded)} /{" "}
                  {formatBytes(progress.total)}
                </span>
              ) : null}
            </div>
          </div>
          {error ? <p className="text-error">{error}</p> : null}
        </div>
      </Modal>
    </>
  );
}
