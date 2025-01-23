import type { ActionsBlock, KnownBlock, SectionBlock } from '@slack/web-api';

/**
 * Factories for creating common Slack blocks
 * @see https://api.slack.com/block-kit
 * @see https://api.slack.com/interactivity/slash-commands
 */
export const blocks = {
  actions: (elements: ActionsBlock['elements']) => {
    return {
      type: 'actions',
      elements,
    };
  },
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
  section: (props: { text: string; accessory?: SectionBlock['accessory'] }) => {
    return {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: props.text,
      },
      accessory: props.accessory,
    };
  },
  // Only return type is being enforced, args are unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} satisfies Record<string, ((...args: any[]) => KnownBlock)>;
