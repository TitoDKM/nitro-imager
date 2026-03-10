import { Canvas, createCanvas } from 'canvas';
import { Request, Response } from 'express';
import { createWriteStream, writeFile } from 'fs';
import { File, FileUtilities, Point } from '../../../../core';
import { Application } from '../../../Application';
import { AvatarScaleType, IAvatarImage } from '../../../avatar';
import
    {
        BuildFigureOptionsRequest,
        BuildFigureOptionsStringRequest,
        ProcessActionRequest,
        ProcessDanceRequest,
        ProcessDirectionRequest,
        ProcessEffectRequest,
        ProcessGestureRequest,
        RequestQuery,
    } from './utils';

const GIFEncoder = require('gif-encoder-2');

export const HabboImagingRouterGet = async (
    request: Request<any, any, any, RequestQuery>,
    response: Response,
) => {
    const query = request.query;

    try {
        const buildOptions = BuildFigureOptionsRequest(query);
        const saveFile = getSaveFilePath(buildOptions);

        if (await handleCacheHit(saveFile, buildOptions.imageFormat, response))
            return;

        await ensureEffectIsReady(buildOptions.effect);

        const avatar = await createConfiguredAvatar(query, buildOptions.figure);
        const avatarCanvas = Application.instance.avatar.structure.getCanvas(
            avatar.getScale(),
            avatar.mainAction.definition.geometryType,
        );
        const tempCanvas = createCanvas(
            avatarCanvas.width * buildOptions.size,
            avatarCanvas.height * buildOptions.size,
        );

        if (buildOptions.imageFormat === 'gif') {
            await renderGif(tempCanvas, avatar, buildOptions, saveFile.path);

            const buffer = await FileUtilities.readFileAsBuffer(saveFile.path);

            response
                .writeHead(200, {
                    'Content-Type': 'image/gif',
                })
                .end(buffer);

            return;
        }

        const pngBuffer = await renderPng(tempCanvas, avatar, buildOptions);

        response
            .writeHead(200, {
                'Content-Type': 'image/png',
            })
            .end(pngBuffer);

        writeFile(saveFile.path, pngBuffer, () => {});
    } catch (err) {
        Application.instance.logger.error(err.message);

        response.writeHead(500).end();
    }
};

function getSaveFilePath(
    buildOptions: ReturnType<typeof BuildFigureOptionsRequest>,
): File {
    const saveDirectory = process.env.AVATAR_SAVE_PATH as string;
    const directory = FileUtilities.getDirectory(saveDirectory);
    const avatarString = BuildFigureOptionsStringRequest(buildOptions);

    return new File(
        `${directory.path}/${avatarString}.${buildOptions.imageFormat}`,
    );
}

async function handleCacheHit(
    saveFile: File,
    imageFormat: string,
    response: Response,
): Promise<boolean> {
    if (!saveFile.exists()) return false;

    const buffer = await FileUtilities.readFileAsBuffer(saveFile.path);

    if (buffer) {
        response
            .writeHead(200, {
                'Content-Type':
                    imageFormat === 'gif' ? 'image/gif' : 'image/png',
            })
            .end(buffer);
    }

    return true;
}

async function ensureEffectIsReady(effect: number): Promise<void> {
    if (effect <= 0) return;

    if (Application.instance.avatar.effectManager.isAvatarEffectReady(effect))
        return;

    await Application.instance.avatar.effectManager.downloadAvatarEffect(
        effect,
    );
}

async function createConfiguredAvatar(
    query: RequestQuery,
    figure: string,
): Promise<IAvatarImage> {
    const avatar = await Application.instance.avatar.createAvatarImage(
        figure,
        AvatarScaleType.LARGE,
        'M',
    );

    ProcessDirectionRequest(query, avatar);

    avatar.initActionAppends();

    ProcessActionRequest(query, avatar);
    ProcessGestureRequest(query, avatar);
    ProcessDanceRequest(query, avatar);
    ProcessEffectRequest(query, avatar);

    avatar.endActionAppends();

    return avatar;
}

async function renderPng(
    canvas: Canvas,
    avatar: IAvatarImage,
    buildOptions: ReturnType<typeof BuildFigureOptionsRequest>,
): Promise<Buffer> {
    if (buildOptions.frameNumber > 0)
        avatar.updateAnimationByFrames(buildOptions.frameNumber);

    await renderFrame(canvas, avatar, buildOptions);

    return canvas.toBuffer();
}

async function renderGif(
    tempCanvas: Canvas,
    avatar: IAvatarImage,
    buildOptions: ReturnType<typeof BuildFigureOptionsRequest>,
    savePath: string,
): Promise<void> {
    const bgColor = 376510773;
    const totalFrames = avatar.getTotalFrameCount() * 2 || 1;
    const tempCtx = tempCanvas.getContext('2d');
    const encoder = new GIFEncoder(tempCanvas.width, tempCanvas.height);
    const stream = encoder.createReadStream().pipe(createWriteStream(savePath));

    encoder.setTransparent(bgColor);
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(1);
    encoder.setQuality(10);

    for (let i = 0; i < totalFrames; i++) {
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

        if (totalFrames && i > 0) avatar.updateAnimationByFrames(1);

        await renderFrame(tempCanvas, avatar, buildOptions);
        encoder.addFrame((tempCtx as any));
    }

    encoder.finish();

    await new Promise<void>((resolve, reject) => {
        stream.on('finish', () => resolve());
        stream.on('error', reject);
    });
}

async function renderFrame(
    tempCanvas: Canvas,
    avatar: IAvatarImage,
    buildOptions: ReturnType<typeof BuildFigureOptionsRequest>,
): Promise<void> {
    const tempCtx = tempCanvas.getContext('2d');
    const canvas = await avatar.getImage(
        buildOptions.setType,
        0,
        false,
        buildOptions.size,
    );
    const avatarOffset = new Point();
    const canvasOffset = new Point(
        (tempCanvas.width - canvas.width) / 2,
        (tempCanvas.height - canvas.height) / 2,
    );

    for (const sprite of avatar.getSprites()) {
        if (sprite.id !== 'avatar') continue;

        const layerData = avatar.getLayerData(sprite);

        avatarOffset.x = sprite.getDirectionOffsetX(buildOptions.direction);
        avatarOffset.y = sprite.getDirectionOffsetY(buildOptions.direction);

        if (layerData) {
            avatarOffset.x += layerData.dx;
            avatarOffset.y += layerData.dy;
        }
    }

    const avatarSize = 64;
    const sizeOffset = new Point(
        (canvas.width - avatarSize) / 2,
        canvas.height - avatarSize / 4,
    );
    const drawOffset = canvasOffset.add(sizeOffset);

    ProcessAvatarSprites(tempCanvas, avatar, avatarOffset, drawOffset, false);
    tempCtx.drawImage(
        canvas,
        avatarOffset.x,
        avatarOffset.y,
        canvas.width,
        canvas.height,
    );
    ProcessAvatarSprites(tempCanvas, avatar, avatarOffset, drawOffset, true);
}

function ProcessAvatarSprites(
    canvas: Canvas,
    avatar: IAvatarImage,
    avatarOffset: Point,
    canvasOffset: Point,
    frontSprites: boolean = true,
) {
    const ctx = canvas.getContext('2d');

    for (const sprite of avatar.getSprites()) {
        if (sprite.id === 'avatar') continue;

        const layerData = avatar.getLayerData(sprite);

        let offsetX = sprite.getDirectionOffsetX(avatar.getDirection());
        let offsetY = sprite.getDirectionOffsetY(avatar.getDirection());
        let offsetZ = sprite.getDirectionOffsetZ(avatar.getDirection());
        let direction = 0;
        let frame = 0;

        if (!frontSprites) {
            if (offsetZ >= 0) continue;
        } else if (offsetZ < 0) continue;

        if (sprite.hasDirections) direction = avatar.getDirection();

        if (layerData) {
            frame = layerData.animationFrame;
            offsetX = offsetX + layerData.dx;
            offsetY = offsetY + layerData.dy;
            direction = direction + layerData.dd;
        }

        if (direction < 0) direction = direction + 8;

        if (direction > 7) direction = direction - 8;

        const assetName =
            avatar.getScale() +
            '_' +
            sprite.member +
            '_' +
            direction +
            '_' +
            frame;
        const asset = avatar.getAsset(assetName);

        if (!asset) continue;

        const texture = asset.texture;

        let x = canvasOffset.x - 1 * asset.offsetX + offsetX;
        let y = canvasOffset.y - 1 * asset.offsetY + offsetY;

        ctx.save();

        if (sprite.ink === 33) ctx.globalCompositeOperation = 'lighter';

        ctx.transform(1, 0, 0, 1, x - avatarOffset.x, y - avatarOffset.y);
        ctx.drawImage(
            texture.drawableCanvas,
            0,
            0,
            texture.width,
            texture.height,
        );

        ctx.restore();
    }
}
