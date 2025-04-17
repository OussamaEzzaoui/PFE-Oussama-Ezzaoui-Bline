export interface SafetyObservation {
  id?: string;
  project_id: string;
  company_id: string;
  submitter_name: string;
  date: string;
  time: string;
  location: string;
  description: string;
  subject: 'SOR' | 'SOP' | 'RES';
  report_group: 'operations' | 'maintenance' | 'safety' | 'contractors';
  consequences: 'minor' | 'moderate' | 'major' | 'severe';
  likelihood: 'unlikely' | 'possible' | 'likely' | 'very-likely';
  status: 'open' | 'closed';
  corrective_action: boolean;
  supporting_image?: string;
  created_at?: string;
  created_by?: string;
  selected_categories?: string[];
}

export interface ActionPlan {
  id?: string;
  observation_id?: string;
  action: string;
  due_date: string;
  responsible_person: string;
  follow_up_contact: string;
  status: 'open' | 'closed';
  supporting_image?: string;
  created_at?: string;
  created_by?: string;
}

export interface Project {
  id: string;
  name: string;
}

export interface Company {
  id: string;
  name: string;
}

export interface SafetyCategory {
  id: string;
  name: string;
  icon: string;
}

export interface MonthlySummary {
  id: string;
  month: string;
  total_observations: number;
  observation_types: Record<string, number>;
  action_status: Record<string, number>;
  risk_levels: Record<string, number>;
  trending_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}