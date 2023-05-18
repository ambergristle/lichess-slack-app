# lichess-slack-app
 This integration's core responsibility is to relay the daily puzzle to registered players on request or schedule. Additional interactivity or configuration may be introduced post-mvp, but any enhancements should build on this foundational purpose.

 ## API

### `/api/v1/auth`
- Authorize connection between Slack and LichessSlackApp
  - Set-up grabs auth from connection request and links with Slack
  - Creates record of Slack interaction

### `/api/v1/puzzle`
- Post Daily Puzzle to request origin Slack channel

### Direct Install: 
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
- Pulls the Daily Puzzle from Lichess and returns the relevant board image? iframe?
- Configures puzzle data into Slack blocks

## Errors

TODO