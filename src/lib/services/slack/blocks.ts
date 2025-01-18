import type { KnownBlock } from '@slack/web-api';


/**
 * @see https://api.slack.com/interactivity/slash-commands#responding_immediate_response
 * @see https://api.slack.com/block-kit
 */
export const blocks = {
  divider: () => {
    return {
      type: 'divider',
    };
  },
  image: (props: { title: string; href: string; alt: string; }) => {
    return {
      type: 'image',
      title: {
        type: 'plain_text',
        text: props.title,
      },
      image_url: props.href,
      alt_text: props.alt,
    };
  },
  section: (props: { text: string; }) => {
    return {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: props.text,
      },
    };
  },
  // eslint-disable-next-line
} satisfies Record<string, ((...args: any[]) => KnownBlock)>;