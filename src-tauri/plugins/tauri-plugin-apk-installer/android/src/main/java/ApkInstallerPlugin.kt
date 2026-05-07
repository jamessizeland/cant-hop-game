package com.cant_hop.apk_installer

import android.app.Activity
import android.content.Intent
import androidx.core.content.FileProvider
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.File

@InvokeArg
class InstallPackageRequestArgs {
    var path: String? = null
}

@TauriPlugin
class ApkInstallerPlugin(private val activity: Activity) : Plugin(activity) {
    @Command
    fun install_package(invoke: Invoke) {
        val args = invoke.parseArgs(InstallPackageRequestArgs::class.java)
        val ret = JSObject()

        try {
            val file = File(args.path ?: "")
            if (!file.exists()) {
                ret.put("success", false)
                ret.put("error", "APK file does not exist")
                invoke.resolve(ret)
                return
            }

            val apkUri = FileProvider.getUriForFile(
                activity,
                "${activity.packageName}.fileprovider",
                file
            )
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            val resolveInfos = activity.packageManager.queryIntentActivities(intent, 0)
            for (resolveInfo in resolveInfos) {
                activity.grantUriPermission(
                    resolveInfo.activityInfo.packageName,
                    apkUri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                )
            }

            activity.startActivity(intent)
            ret.put("success", true)
        } catch (error: Exception) {
            ret.put("success", false)
            ret.put("error", error.message)
        }

        invoke.resolve(ret)
    }
}
