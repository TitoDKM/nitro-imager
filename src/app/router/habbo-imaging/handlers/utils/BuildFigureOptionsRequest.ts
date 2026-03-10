import { AvatarRenderManager, AvatarSetType } from '../../../../avatar';
import { IFigureBuildOptions } from './IFigureBuildOptions';
import { RequestQuery } from './RequestQuery';

export const BuildFigureOptionsRequest = (query: RequestQuery) =>
{
    let figure = AvatarRenderManager.DEFAULT_FIGURE;

    if(query.figure && query.figure.length) figure = query.figure;

    const size = (query.size === 's') ? 0.5 : ((query.size === 'l') ? 2 : 1);
    const setType = ((query.headonly && query.headonly === '1') ? AvatarSetType.HEAD : AvatarSetType.FULL);
    const direction = ((query.direction && query.direction.length) ? parseInt(query.direction) : 2);
    const headDirection = ((query.head_direction && query.head_direction.length) ? parseInt(query.head_direction) : direction);
    const action = ((query.action && query.action.length) ? query.action : null);
    const gesture = ((query.gesture && query.gesture.length) ? query.gesture : null);
    const dance = ((query.dance && query.dance.length) ? parseInt(query.dance) : null);
    const effect = ((query.effect && query.effect.length) ? parseInt(query.effect) : null);
    const frameNumber = ((query.frame_num && query.frame_num.length) ? parseInt(query.frame_num) : -1);
    const imageFormat = ((query.img_format === 'gif') ? 'gif' : 'png');

    return {
        figure,
        size,
        setType,
        direction,
        headDirection,
        action,
        gesture,
        dance,
        effect,
        frameNumber,
        imageFormat
    } as IFigureBuildOptions;
}
