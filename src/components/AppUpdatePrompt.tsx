import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import Modal from "@/components/elements/modal";
import {
  APP_RELEASES_URL,
  AvailableAppUpdate,
  getAvailableAppUpdate,
} from "@/services/updater";

export function AppUpdatePrompt() {
  const [update, setUpdate] = useState<AvailableAppUpdate | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAvailableAppUpdate()
      .then((availableUpdate) => {
        if (availableUpdate) {
          setUpdate(availableUpdate);
        }
      })
      .catch((reason) => {
        console.error("Error checking for app update:", reason);
      });
  }, []);

  if (!update) return null;

  async function handleOpenReleases() {
    setError(null);
    try {
      await openUrl(APP_RELEASES_URL);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      setError(message);
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
        onClose={() => setIsOpen(false)}
        title={`Update to ${update.version}?`}
        actions={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => setIsOpen(false)}
            >
              Later
            </button>
            <button
              className="btn btn-primary"
              onClick={handleOpenReleases}
            >
              Open Releases
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm max-h-[60vh] overflow-hidden">
          {update.notes ? <p className="opacity-80 overflow-auto">{update.notes}</p> : null}
          <p className="opacity-75">
            Download the latest build from GitHub Releases to update manually.
          </p>
          {error ? <p className="text-error">{error}</p> : null}
        </div>
      </Modal>
    </>
  );
}
