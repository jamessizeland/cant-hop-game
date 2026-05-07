use tauri::{command, AppHandle, Runtime};

use crate::{ApkInstallerExt, InstallPackageRequest, InstallPackageResponse, Result};

#[command]
pub(crate) async fn install_package<R: Runtime>(
    app: AppHandle<R>,
    payload: InstallPackageRequest,
) -> Result<InstallPackageResponse> {
    app.apk_installer().install_package(payload)
}
