export interface iMessage {
  model: string;
  temperature: number;
  messages: {role: string,  content: string}[];
  max_tokens: number;
  stream: boolean;
}
