use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::{InstallPackageRequest, InstallPackageResponse};

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<ApkInstaller<R>> {
    #[cfg(target_os = "ios")]
    return Err(crate::Error::UnsupportedPlatform);
    #[cfg(target_os = "android")]
    let handle = api.register_android_plugin("com.cant_hop.apk_installer", "ApkInstallerPlugin")?;
    Ok(ApkInstaller(handle))
}

pub struct ApkInstaller<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> ApkInstaller<R> {
    pub fn install_package(
        &self,
        payload: InstallPackageRequest,
    ) -> crate::Result<InstallPackageResponse> {
        self.0
            .run_mobile_plugin("install_package", payload)
            .map_err(Into::into)
    }
}
