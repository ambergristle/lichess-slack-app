
// is this right?
type DateTimeString = string;

export type BotDocument = {
  uid: string;
  team_id: string;
  token: string;
  scope: string;
  schedule_id: string | null;
  cron: string | null;
}
