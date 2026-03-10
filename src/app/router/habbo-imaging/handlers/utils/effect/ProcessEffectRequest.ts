import { AvatarAction, IAvatarImage } from '../../../../../avatar';
import { RequestQuery } from '../RequestQuery';

export const ProcessEffectRequest = (query: RequestQuery, avatar: IAvatarImage) =>
{
    const effect: number = ((query.effect && query.effect.length) ? parseInt(query.effect) : null);

    if(!effect) return;

    avatar.appendAction(AvatarAction.EFFECT, effect);
}
