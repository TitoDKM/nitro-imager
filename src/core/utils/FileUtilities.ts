import { readFile } from 'fs';
import { promisify } from 'util';
import { File } from './File';

const readFileAsync = promisify(readFile);

export class FileUtilities
{
    public static getDirectory(baseFolderPath: string, childFolderName: string = null): File
    {
        let folder = new File(baseFolderPath);

        if(!folder.isDirectory()) folder.mkdirs();

        if(childFolderName)
        {
            folder = new File(folder.path + childFolderName);

            if(!folder.isDirectory()) folder.mkdirs();
        }

        return folder;
    }

    public static async readFileAsBuffer(url: string): Promise<Buffer>
    {
        if(!url) return null;

        let content: Buffer = null;

        if(url.startsWith('//')) url = ('https:' + url);

        if(url.startsWith('http'))
        {
            const data = await fetch(url);

            if(!data.ok) return null;

            const arrayBuffer = await data.arrayBuffer();

            if(arrayBuffer) content = Buffer.from(arrayBuffer);
        }
        else
        {
            content = await readFileAsync(url);
        }

        return content;
    }

    public static async readFileAsString(url: string): Promise<string>
    {
        if(!url) return null;

        let content = null;

        if(url.startsWith('//')) url = ('https:' + url);

        if(url.startsWith('http'))
        {
            const data = await fetch(url);
            if(data.status === 404) return null;

            if(data) content = await data.text();
        }
        else
        {
            const data = await readFileAsync(url);

            content = data.toString('utf-8');
        }

        return content;
    }
}
