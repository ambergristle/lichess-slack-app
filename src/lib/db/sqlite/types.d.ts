
// is this right?
type DateTimeString = string;

export type BotDocument = {
  uid: string;
  team_id: string;
  token: string;
  scope: string;
  scheduled_at: DateTimeString | null;
}
