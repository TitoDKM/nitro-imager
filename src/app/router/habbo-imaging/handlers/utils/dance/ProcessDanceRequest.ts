import { AvatarAction, IAvatarImage } from '../../../../../avatar';
import { RequestQuery } from '../RequestQuery';

export const ProcessDanceRequest = (query: RequestQuery, avatar: IAvatarImage) =>
{
    const dance: number = ((query.dance && query.dance.length) ? parseInt(query.dance) : null);

    if(!dance) return;

    switch(dance)
    {
        case 1:
        case 2:
        case 3:
        case 4:
            avatar.appendAction(AvatarAction.DANCE, dance);
            return;
    }
}
