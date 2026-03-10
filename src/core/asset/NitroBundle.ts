import { wrap } from 'bytebuffer';
import { Image, loadImage } from 'canvas';
import { Data, inflate } from 'pako';
import { IAssetData } from './interfaces';

export class NitroBundle
{
    private static TEXT_DECODER: TextDecoder = new TextDecoder('utf-8');

    private _jsonFile: IAssetData = null;
    private _baseTexture: Image = null;

    public static async from(buffer: ArrayBuffer | Uint8Array): Promise<NitroBundle>
    {
        const bundle = new NitroBundle();

        await bundle.parse(buffer);

        return bundle;
    }

    private static toArrayBuffer(buffer: ArrayBuffer | Uint8Array): ArrayBuffer
    {
        if(buffer instanceof Uint8Array)
        {
            const copy = new Uint8Array(buffer.byteLength);

            copy.set(buffer);

            return copy.buffer;
        }

        return buffer;
    }

    private static arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string
    {
        let binary = '';

        const bytes = new Uint8Array(NitroBundle.toArrayBuffer(buffer));
        const len   = bytes.byteLength;

        for(let i = 0; i < len; i++) (binary += String.fromCharCode(bytes[i]));

        const newBuffer = Buffer.from(binary.toString(), 'binary');

        return newBuffer.toString('base64');
    }

    private async parse(arrayBuffer: ArrayBuffer | Uint8Array): Promise<void>
    {
        const binaryReader = wrap(NitroBundle.toArrayBuffer(arrayBuffer));

        let fileCount = binaryReader.readShort();

        while(fileCount > 0)
        {
            const fileNameLength = binaryReader.readShort();
            const fileName = binaryReader.readString(fileNameLength);
            const fileLength = binaryReader.readInt();
            const buffer = binaryReader.readBytes(fileLength);

            if(fileName.endsWith('.json'))
            {
                const decompressed = inflate((buffer.toArrayBuffer() as unknown as Data));

                this._jsonFile = JSON.parse(NitroBundle.TEXT_DECODER.decode(decompressed));
            }
            else
            {
                const decompressed = inflate((buffer.toArrayBuffer() as unknown as Data));
                const base64 = NitroBundle.arrayBufferToBase64(decompressed);
                const baseTexture = await loadImage('data:image/png;base64,' + base64);

                this._baseTexture = baseTexture;
            }

            fileCount--;
        }
    }

    public get jsonFile(): IAssetData
    {
        return this._jsonFile;
    }

    public get baseTexture(): Image
    {
        return this._baseTexture;
    }
}
