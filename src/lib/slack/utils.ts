import type { ICommandBlockResponse, ICommandTextResponse } from './schemas';

export const helpCommandResponse: ICommandBlockResponse = {
  response_type: 'in_channel',
  text: '',
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'hi',
      },
    },
  ],
};

export const puzzleCommandResponse: ICommandBlockResponse = {
  response_type: 'in_channel',
  text: '',
  blocks: [
    {
      type: 'image',
      title: { 
        type: 'plain_text',
        text: 'imgUrl', 
      },
      alt_text: '',
      image_url: '',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '',
      },
    },
  ],
};

export const setTimeCommandResponse: ICommandTextResponse = {
  response_type: 'in_channel',
  text: '',
};
