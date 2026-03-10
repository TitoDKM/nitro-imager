import { AvatarSetType, IAvatarImage } from '../../../../../avatar';
import { RequestQuery } from '../RequestQuery';

export const ProcessDirectionRequest = (query: RequestQuery, avatar: IAvatarImage) =>
{
    const direction = ((query.direction && query.direction.length) ? parseInt(query.direction) : 2);
    const headDirection = ((query.head_direction && query.head_direction.length) ? parseInt(query.head_direction) : direction);

    avatar.setDirection(AvatarSetType.FULL, direction);
    avatar.setDirection(AvatarSetType.HEAD, headDirection);
}
