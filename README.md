# lichess-slack-app
 
## Authorization
- Set-up grabs auth from connection request and links with Slack
- Creates record of Slack interaction


## Daily Puzzle
- Grabs + returns daily puzzle

## Direct Install
- Redirects to authorization?

## Help Text
- Some protection against replay attacks?
- Checks tokens + posts help blocks to Slack channel
  - puzzle
  - set-time 

## Set Time
- Some protection against replay attacks?
- Can return current setting
- Sets time setting by id

## Slash Command
- Pulls the Daily Puzzle from Lichess and returns the relevant board image? iframe?
- Configures puzzle data into Slack blocks
