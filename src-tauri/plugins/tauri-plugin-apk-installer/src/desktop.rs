use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::{InstallPackageRequest, InstallPackageResponse};

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<ApkInstaller<R>> {
    Ok(ApkInstaller(app.clone()))
}

pub struct ApkInstaller<R: Runtime>(#[allow(dead_code)] AppHandle<R>);

impl<R: Runtime> ApkInstaller<R> {
    pub fn install_package(
        &self,
        _payload: InstallPackageRequest,
    ) -> crate::Result<InstallPackageResponse> {
        Err(crate::Error::UnsupportedPlatform)
    }
}
