export interface AgendaItem {
  id: string;
  rawText: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: number;
  updatedAt: number;
  
  aiParsed?: {
    actionItems: string[];
    people: string[];
    tags: string[];
    dates: {
      label: string;
      iso_date: string;
      is_relative_inferred: boolean;
    }[];
  };

  // User manual overrides (Hard Anchors)
  userOverrides?: {
    people?: string[];
    tags?: string[];
    dates?: {
      label: string;
      iso_date: string;
    }[];
  };
}
