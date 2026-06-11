export type Category = {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  is_default?: boolean;
};

export type Budget = {
  id: string;
  user_id: string;
  category_id: string;
  month: string;
  amount: number;
};

export type Transaction = {
  id: string;
  user_id: string;
  category_id?: string | null;
  amount: number;
  type: "expense" | "income";
  description?: string;
  merchant?: string;
  date: string;
  source?: string;
  raw_input?: string;
  ai_parsed?: boolean;
};
