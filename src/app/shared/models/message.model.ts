export interface Message {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isForexWidget?: boolean;
  forexData?: any;
}
