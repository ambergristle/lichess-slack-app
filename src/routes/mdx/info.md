# Info

Sign in to a Slack workspace and follow the link at [] to install the bot in a channel of your choice. The bot responds to slash commands, detailed below.

This project is an expression of gratitude for the contributors at Lichess and across the web who work to make the internet a freer and richer space.


## Slash Commands

- ### `/help`
  Get a description of all available commands.

- ### `/puzzle`
  Take a break from all the huddles with the starting position for the Lichess Daily Puzzle. Think you've got what it takes? Follow the accompanying link to test your skills!

- ### `/schedule`
  Remind yourself to make some time for chess with the Lichess Daily Puzzle starting position, delivered daily.
  Each user in the channel can schedule their own reminder. Schedules are set based on your Slack timezone preferences. For more info on how your data is used, check out our [privacy section.](#privacy)

## Data and Privacy {#privacy}
To support Slack messages in your language, and schedule reminders in your timezone, the bot needs access to the [Channel Info](https://api.slack.com/methods/users.info) for the channel it's registered in, and the [User Info](https://api.slack.com/methods/users.info) for any users creating a schedule.
To respect your privacy, the bot only reads the channel locale (e.g., `fr-FR`) and user timezone (e.g., `Europe/Paris`), and only asks Slack for this info when you use a slash command.
If you'd like to know more, the bot's source code is available on GitHub: [https://github.com/ambergristle/lichess-slack-app](https://github.com/ambergristle/lichess-slack-app)

## Languages
This app is built with multi-language support, but translation is hard.
