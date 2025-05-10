import { createClient } from '@supabase/supabase-js';
import type { SafetyObservation, ActionPlan, MonthlySummary } from './types';
import { format } from 'date-fns';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'present' : 'missing',
    key: supabaseAnonKey ? 'present' : 'missing'
  });
  throw new Error('Missing Supabase environment variables');
}

// Create a Supabase client with the anon key for regular operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create a Supabase client with the service role key for admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Add connection test
supabase.auth.getSession().then(({ data: { session }, error }) => {
  if (error) {
    console.error('Supabase connection error:', error);
  } else {
    console.log('Supabase connection successful');
  }
});

export const isAdmin = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.user_metadata?.is_admin === true;
};

export const fetchProjects = async () => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('name');

  if (error) throw error;
  return data;
};

export const fetchCompanies = async () => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('name');

  if (error) throw error;
  return data;
};

export const fetchSafetyCategories = async () => {
  const { data, error } = await supabase
    .from('safety_categories')
    .select('*')
    .order('name');

  if (error) throw error;
  return data;
};

export const saveObservation = async (observation: SafetyObservation, actionPlans: ActionPlan[]) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    // Upload image if exists
    let imagePath = observation.supporting_image;
    if (imagePath instanceof File) {
      const { data: imageData, error: imageError } = await supabase.storage
        .from('safety-images')
        .upload(`${Date.now()}-${imagePath.name}`, imagePath);

      if (imageError) throw imageError;
      imagePath = imageData.path;
    }

    // Save observation
    const { data: savedObservation, error: observationError } = await supabase
      .from('observation_details')
      .insert({
        ...observation,
        supporting_image: imagePath,
        created_by: user.id
      })
      .select()
      .single();

    if (observationError) throw observationError;

    // Save action plans if any
    if (actionPlans.length > 0) {
      const { error: actionPlansError } = await supabase
        .from('action_plans')
        .insert(
          actionPlans.map(plan => ({
            ...plan,
            observation_id: savedObservation.id,
            created_by: user.id
          }))
        );

      if (actionPlansError) throw actionPlansError;
    }

    return savedObservation;
  } catch (error) {
    console.error('Save Error:', error);
    throw error;
  }
};

export const getMonthlySummary = async (month: Date): Promise<MonthlySummary> => {
  const { data, error } = await supabase
    .from('monthly_observation_stats')
    .select('*')
    .eq('month', format(month, 'yyyy-MM-dd'))
    .single();

  if (error) throw error;
  return data;
};

export const searchObservations = async (query: string) => {
  const { data, error } = await supabase
    .from('observation_details')
    .select(`
      *,
      projects:project_id(name),
      companies:company_id(name)
    `)
    .or(`
      description.ilike.%${query}%,
      location.ilike.%${query}%,
      department.ilike.%${query}%
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};