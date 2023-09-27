# Lichess Daily Puzzle Slack App
**Bring the Lichess daily puzzle into a channel of your choice!**
Chess is a wellspring of friendship and community. A similar spirit animates the open-sourcing of software, and information more broadly. I believe that innovation is driven by curiosity, and that sharing is the cornerstone of any healthy society.

This project is an expression of gratitude for the contributors at Lichess and across the web who work to make the internet a freer and richer space.

 This integration's core responsibility is to relay the daily puzzle to registered players on request or schedule. Additional interactivity or configuration may be introduced post-mvp, but any enhancements should build on this foundational purpose.

## How it works

Sign in to a Slack workspace and follow the link at [] to install the app bot in a channel of your choice. The bot responds to slash commands, detailed below.

### `/help`
Lists available commands and arguments

### `/puzzle`
Posts an image of the daily puzzle starting position, and a link to the puzzle.

### `/schedule`
Displays the time (`HH:MM`) the puzzle is scheduled to be posted. To subscribe, include (`HH:MM`)

## Data and Privacy
When you install the bot, the app creates a record associating the selected workspace id (`team_id`) with the bot's unique id. This is necessary to schedule daily delivery, and for administrative tasks (e.g., uninstalling the bot). If you do choose to uninstall the bot, the record will be erased. The app does not persist any personal or personally-identifying data. Slack includes your id and username when executing slash commands, but these are stripped from documents before they reach the business layer. 
> For more information on what Slack includes in their requests, see their documentation: [https://api.slack.com/interactivity/slash-commands#app_command_handling](https://api.slack.com/interactivity/slash-commands#app_command_handling)

## Implementation Details
I decided to translate this app into TypeScript for a number of reasons. 

Slack offers two layers of convenience over their web api: 1\) service-specific sdks, some of which have already been phased out in favor of 2\) their new-ish Bolt server framework. I went back and forth quite a bit, but ultimately decided to handle interactions with Slack's api directly.

Assuming full responsibility for staying in sync with their api isn't ideal, but it felt like a lighter&ndash;and in some ways more resilient&ndash;solution. 

<!-- should also figure out how to handle ssl cert requets -->

## References
[https://github.com/arex1337/lichess-daily-puzzle-slack-app](https://github.com/arex1337/lichess-daily-puzzle-slack-app)
**Lichess**
- Project: [https://github.com/lichess-org/lila](https://github.com/lichess-org/lila)
- Puzzles: [https://lichess.org/api#tag/Puzzles](https://lichess.org/api#tag/Puzzles)

**Slack**
- Slash Commands: [https://api.slack.com/interactivity/slash-commands](https://api.slack.com/interactivity/slash-commands)
- Webhooks: [https://api.slack.com/messaging/webhooks](https://api.slack.com/messaging/webhooks)