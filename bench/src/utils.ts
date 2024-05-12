import * as fs from "node:fs/promises"
import * as path from "node:path"
import { fileURLToPath } from 'node:url';


export type Path = string;

export const FILENAME = fileURLToPath(import.meta.url);
export const PROJECT_DIR = path.dirname(path.dirname(FILENAME));

export async function getContentsOfFilesInDir(dir: Path, filesFilter: (filePath: string) => boolean = () => true): Promise<(readonly [Path, string])[]> {
    try {
        const filenames = await fs.readdir(dir);
        return Promise.all(
            filenames
                .map(filename => path.join(dir, filename))
                .filter(filePath => filesFilter(filePath))
                .map(async filePath => {
                    try {
                        const content = await fs.readFile(filePath, "utf-8");
                        return [filePath, content] as const;
                    } catch (err) {
                        throw new Error(`Reading query file: ${new String(err).toString()}`);
                    }
                })
        )
    } catch (err) {
        throw new Error(`Reading query directory: ${new String(err).toString()}`);
    }
}

export function roughSizeOf(a: unknown): number {
    const s = JSON.stringify(a).replace(/[\[\],"]/g, ""); //stringify and remove all "stringification" extra data

    return new Blob([s]).size; // size of utf-8 string in bytes
}