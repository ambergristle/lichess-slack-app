# lichess-slack-app
 This integration's core responsibility is to relay the daily puzzle to registered players on request or schedule. Additional interactivity or configuration may be introduced post-mvp, but any enhancements should build on this foundational purpose.

 https://github.com/arex1337/lichess-daily-puzzle-slack-app

 ## API

### `/api/v1/auth`
- Authorize connection between Slack and LichessSlackApp
  - Set-up grabs auth from connection request and links with Slack
  - Creates record of Slack interaction

### `/api/v1/puzzle`
- Post Daily Puzzle to request origin Slack channel

### Direct Install: 
<!-- honestly, no idea what this does, or if it's necessary -->
- Redirects to authorization?

### `/api/v1/help`
- Delineate command and configuration options
  - Some protection against replay attacks?
  - Check tokens + post help blocks to Slack channel
    - puzzle
    - set-time 

### `/api/v1/set-time`
- Some protection against replay attacks?
- Can return current setting
- Sets time setting by id

### Slash Command
<!-- this is actually get puzzle; for w/e reason the logic was just duped between the chron job + the api -->
<!-- should also figure out how to handle ssl cert requets -->
- Pulls the Daily Puzzle from Lichess and returns the relevant board image? iframe?
- Configures puzzle data into Slack blocks

## Errors
- Basic error handling + response

## References
- [Slack Slash Commands](https://api.slack.com/interactivity/slash-commands)
- [Slack Messaging Webhooks](https://api.slack.com/messaging/webhooks)
