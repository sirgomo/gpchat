export interface Message {
  model: string;
  temperature: number;
  messages: {role: string,  content: string}[];
  max_tokens: number;
}
