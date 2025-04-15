import { type as osType } from '@tauri-apps/plugin-os';
import { appDataDir, BaseDirectory, downloadDir } from '@tauri-apps/api/path';
import { lstat, mkdir } from '@tauri-apps/plugin-fs';



const LIBRARY_DIR = 'library';
/** This class provides information about the app's paths */
export class Paths {
    /** Get the downloads directory */
    public static async downloadDir(): Promise<string> {
        return downloadDir();
    }
    /** Get the app's library directory */
    public static async libDir(): Promise<string> {
        const libraryDir = await appDataDir();
        console.log('Library directory:', libraryDir);
        console.log(BaseDirectory.AppData);
        const libFolder = `${libraryDir}/${LIBRARY_DIR}`;
        try {
            const libFolderInfo = await lstat(libFolder);
            console.log('Library directory exists:', libFolderInfo);
            if (!libFolderInfo.isDirectory) {
                console.log('Library directory is not a directory');
                await mkdir(LIBRARY_DIR, { recursive: true, baseDir: BaseDirectory.AppData });
            }
        } catch {
            console.log('Library directory does not exist');
            await mkdir(LIBRARY_DIR, { recursive: true, baseDir: BaseDirectory.AppData });
        }
        console.log("lib folder", libFolder);
        return `${libraryDir}/${LIBRARY_DIR}`;
    }
    /** The library folder */
    public static libFolder = LIBRARY_DIR;
}


const OS_TYPE = osType();
/** This class provides information about the operating system */
export class Os {
    public static type = OS_TYPE;
    public static readonly isAndroid = OS_TYPE === 'android';
    public static readonly isLinux = OS_TYPE === 'linux';
    public static readonly isMacOS = OS_TYPE === 'macos';
    public static readonly isWindows = OS_TYPE === 'windows';
}