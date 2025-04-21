import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as lucide from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ExportReport } from '../components/ExportReport';
import { SafetyCategories } from '../components/SafetyCategories';
import toast from 'react-hot-toast';
import type { SafetyCategory, Project, Company, Report } from '../lib/types';

interface ActionPlan {
  id?: string;
  action: string;
  due_date: string;
  responsible_person: string;
  follow_up_contact: string;
  status: 'open' | 'closed';
  supporting_image: string;
}

export function ReportView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [safetyCategories, setSafetyCategories] = useState<SafetyCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [currentActionPlan, setCurrentActionPlan] = useState<ActionPlan>({
    action: '',
    due_date: '',
    responsible_person: '',
    follow_up_contact: '',
    status: 'open',
    supporting_image: ''
  });
  const [actionPlanRequired, setActionPlanRequired] = useState('no');
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  // Form state
  const [project, setProject] = useState('');
  const [company, setCompany] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [reportGroup, setReportGroup] = useState('');
  const [consequences, setConsequences] = useState('');
  const [likelihood, setLikelihood] = useState('');
  const [status, setStatus] = useState('open');
  const [subject, setSubject] = useState<'SOR' | 'SOP' | 'RES'>('SOR');

  const [editingActionPlanIndex, setEditingActionPlanIndex] = useState<number | null>(null);
  const [editedActionPlan, setEditedActionPlan] = useState<ActionPlan | null>(null);
  const [editedActionPlanImageFile, setEditedActionPlanImageFile] = useState<File | null>(null);
  const [editedActionPlanImagePreview, setEditedActionPlanImagePreview] = useState('');

  // Add a new state to track deleted action plan IDs
  const [deletedActionPlanIds, setDeletedActionPlanIds] = useState<string[]>([]);

  // Add new state for pending action plan changes
  const [pendingActionPlans, setPendingActionPlans] = useState<ActionPlan[]>([]);
  const [isActionPlansLoaded, setIsActionPlansLoaded] = useState(false);

  const [actionPlanImageFile, setActionPlanImageFile] = useState<File | null>(null);
  const [actionPlanImagePreview, setActionPlanImagePreview] = useState('');

  useEffect(() => {
    loadReport();
    loadSafetyCategories();
    loadProjects();
    loadCompanies();
  }, [id]);

  const loadSafetyCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('safety_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setSafetyCategories(data);
    } catch (err) {
      console.error('Error loading safety categories:', err);
    }
  };

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name');

      if (error) throw error;
      setProjects(data);
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  };

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (error) throw error;
      setCompanies(data);
    } catch (err) {
      console.error('Error loading companies:', err);
    }
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('observation_details')
        .select(`
          *,
          projects(name),
          companies(name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Load selected categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('observation_categories')
        .select('category_id')
        .eq('observation_id', id);

      if (categoriesError) throw categoriesError;

      // Load action plans
      const { data: actionPlansData, error: actionPlansError } = await supabase
        .from('action_plans')
        .select('*')
        .eq('observation_id', id);

      if (actionPlansError) throw actionPlansError;

      // Transform the data to match the Report interface
      const transformedReport: Report = {
        id: data.id,
        subject: data.subject,
        project: data.projects.name,
        company: data.companies.name,
        submitter_name: data.submitter_name,
        date: data.date,
        time: data.time,
        location: data.location,
        department: data.department,
        description: data.description,
        report_group: data.report_group,
        consequences: data.consequences,
        likelihood: data.likelihood,
        status: data.status,
        safety_categories: categoriesData?.map(c => ({ 
          id: c.category_id, 
          name: '', 
          description: '', 
          icon: 'default',
          created_at: '', 
          updated_at: '' 
        })) || [],
        action_plans: actionPlansData || [],
        supporting_image: data.supporting_image,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      setReport(transformedReport);
      setSelectedCategories(categoriesData?.map(c => c.category_id) || []);
      // Initialize both action plan states
      setActionPlans(actionPlansData || []);
      setPendingActionPlans(actionPlansData || []);
      setIsActionPlansLoaded(true);
      setActionPlanRequired(actionPlansData?.length > 0 ? 'yes' : 'no');

      // Set form state
      setProject(data.project_id);
      setCompany(data.company_id);
      setSubmitterName(data.submitter_name);
      setDate(data.date);
      setTime(data.time);
      setDepartment(data.department);
      setLocation(data.location);
      setDescription(data.description);
      setReportGroup(data.report_group);
      setConsequences(data.consequences);
      setLikelihood(data.likelihood);
      setStatus(data.status);
      setSubject(data.subject);

      if (data.supporting_image) {
        setImagePreview(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/safety-images/${data.supporting_image}`);
      }
    } catch (err) {
      setError('Failed to load report');
      console.error('Error loading report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddActionPlan = () => {
    if (actionPlans.length >= 10) {
      toast.error('Maximum of 10 action plans allowed per report');
      return;
    }
    const newActionPlan: ActionPlan = {
      id: `temp-${Date.now()}`,
      action: '',
      due_date: '',
      responsible_person: '',
      follow_up_contact: '',
      status: 'open',
      supporting_image: ''
    };
    setActionPlans([...actionPlans, newActionPlan]);
  };

  const handleDeleteActionPlan = async (index: number) => {
    if (!window.confirm('Are you sure you want to delete this action plan? This action cannot be undone.')) {
      return;
    }
    
    try {
      const planToDelete = actionPlans[index];
      if (planToDelete.id && !planToDelete.id.startsWith('temp-')) {
        const { error: deleteError } = await supabase
          .from('action_plans')
          .delete()
          .eq('id', planToDelete.id);

        if (deleteError) throw deleteError;
      }
      
      const updatedActionPlans = actionPlans.filter((_, i) => i !== index);
      setActionPlans(updatedActionPlans);
      toast.success('Action plan deleted successfully');
    } catch (err) {
      console.error('Error deleting action plan:', err);
      toast.error('Failed to delete action plan');
    }
  };

  const handleActionPlanImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setActionPlanImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setActionPlanImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveActionPlan = async (addAnother: boolean) => {
    if (!currentActionPlan.action || !currentActionPlan.due_date || 
        !currentActionPlan.responsible_person || !currentActionPlan.follow_up_contact) {
      toast.error('Please fill in all action plan fields');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Upload image if exists
      let imagePath = '';
      if (actionPlanImageFile) {
        const { data: imageData, error: imageError } = await supabase.storage
          .from('safety-images')
          .upload(`${Date.now()}-${actionPlanImageFile.name}`, actionPlanImageFile);

        if (imageError) throw imageError;
        imagePath = imageData.path;
      }

      // Save to database
      const { data: savedPlan, error: saveError } = await supabase
        .from('action_plans')
        .insert({
          observation_id: id,
          action: currentActionPlan.action,
          due_date: currentActionPlan.due_date,
          responsible_person: currentActionPlan.responsible_person,
          follow_up_contact: currentActionPlan.follow_up_contact,
          status: currentActionPlan.status,
          supporting_image: imagePath,
          created_by: user.id
        })
        .select()
        .single();

      if (saveError) throw saveError;

      // Update local state
      setActionPlans(prev => [...prev, savedPlan]);
      
      // Reset the form
      setCurrentActionPlan({
        action: '',
        due_date: '',
        responsible_person: '',
        follow_up_contact: '',
        status: 'open',
        supporting_image: ''
      });
      setActionPlanImageFile(null);
      setActionPlanImagePreview('');

      if (!addAnother) {
        setActionPlanRequired('no');
      }

      toast.success('Action plan saved successfully');
    } catch (err) {
      console.error('Error saving action plan:', err);
      toast.error('Failed to save action plan');
    }
  };

  const handleEditActionPlan = (index: number) => {
    setEditingActionPlanIndex(index);
    setEditedActionPlan(actionPlans[index]);
    setEditedActionPlanImageFile(null);
    setEditedActionPlanImagePreview('');
  };

  const handleCancelEditActionPlan = () => {
    setEditingActionPlanIndex(null);
    setEditedActionPlan(null);
  };

  const handleEditedActionPlanImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditedActionPlanImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditedActionPlanImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEditedActionPlan = async () => {
    if (editingActionPlanIndex !== null && editedActionPlan) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Upload new image if exists
        let imagePath = editedActionPlan.supporting_image;
        if (editedActionPlanImageFile) {
          const { data: imageData, error: imageError } = await supabase.storage
            .from('safety-images')
            .upload(`${Date.now()}-${editedActionPlanImageFile.name}`, editedActionPlanImageFile);

          if (imageError) throw imageError;
          imagePath = imageData.path;
        }

        // Update the database
        const { error: updateError } = await supabase
          .from('action_plans')
          .update({
            action: editedActionPlan.action,
            due_date: editedActionPlan.due_date,
            responsible_person: editedActionPlan.responsible_person,
            follow_up_contact: editedActionPlan.follow_up_contact,
            status: editedActionPlan.status,
            supporting_image: imagePath
          })
          .eq('id', editedActionPlan.id);

        if (updateError) throw updateError;

        // Update local state
        const updatedActionPlans = [...actionPlans];
        updatedActionPlans[editingActionPlanIndex] = {
          ...editedActionPlan,
          action: editedActionPlan.action,
          due_date: editedActionPlan.due_date,
          responsible_person: editedActionPlan.responsible_person,
          follow_up_contact: editedActionPlan.follow_up_contact,
          status: editedActionPlan.status,
          supporting_image: imagePath
        };
        setActionPlans(updatedActionPlans);
        setEditingActionPlanIndex(null);
        setEditedActionPlan(null);
        setEditedActionPlanImageFile(null);
        setEditedActionPlanImagePreview('');
        
        toast.success('Action plan updated successfully');
      } catch (err) {
        console.error('Error updating action plan:', err);
        toast.error('Failed to update action plan');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Delete only the action plans that were marked for deletion
      if (deletedActionPlanIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('action_plans')
          .delete()
          .in('id', deletedActionPlanIds);

        if (deleteError) throw deleteError;
      }

      // Insert only new action plans (those without an ID or with temp ID)
      const newActionPlans = actionPlans.filter(plan => !plan.id || plan.id.startsWith('temp-'));
      if (newActionPlans.length > 0) {
        const { error: insertError } = await supabase
          .from('action_plans')
          .insert(
            newActionPlans.map(plan => ({
              observation_id: id,
              action: plan.action,
              due_date: plan.due_date,
              responsible_person: plan.responsible_person,
              follow_up_contact: plan.follow_up_contact,
              status: plan.status,
              created_by: user.id,
              created_at: new Date().toISOString()
            }))
          );

        if (insertError) throw insertError;
      }

      // Upload new image if exists
      let imagePath = report?.supporting_image || '';
      if (imageFile) {
        const { data: imageData, error: imageError } = await supabase.storage
          .from('safety-images')
          .upload(`${Date.now()}-${imageFile.name}`, imageFile);

        if (imageError) throw imageError;
        imagePath = imageData.path;
      }

      // Update observation details
      const { error: updateError } = await supabase
        .from('observation_details')
        .update({
          project_id: project,
          company_id: company,
          submitter_name: submitterName,
          date,
          time,
          department,
          location,
          description,
          report_group: reportGroup,
          consequences,
          likelihood,
          status,
          subject,
          supporting_image: imagePath,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Changes saved successfully');
      navigate('/');
    } catch (err) {
      console.error('Error saving changes:', err);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <lucide.Loader2 className="h-8 w-8 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-6">
          <div className="text-center">
            <lucide.AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Report</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="text-green-600 hover:text-green-700 font-medium flex items-center gap-2 mx-auto"
            >
              <lucide.ArrowLeft className="h-5 w-5" />
              Back to Reports
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-500 hover:text-gray-700"
              >
                <lucide.ArrowLeft className="h-6 w-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Edit Safety Report</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowExport(true)}
                className="px-4 py-2 text-green-600 hover:text-green-700 flex items-center gap-2"
              >
                <lucide.Download className="h-5 w-5" />
                Export
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            {/* General Information */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">General Information</h2>

              {/* Project & Company */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project
                  </label>
                  <select
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <select
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select Company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submitter & Date/Time */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Submitter Name
                  </label>
                  <input
                    type="text"
                    value={submitterName}
                    onChange={(e) => setSubmitterName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Department & Location */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Observation Details */}
            <div className="mt-8 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Observation Details</h2>

              {/* Subject Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as 'SOR' | 'SOP' | 'RES')}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="SOR">Safety Observation Report (SOR)</option>
                  <option value="SOP">Standard Operating Procedure (SOP)</option>
                  <option value="RES">Risk Evaluation Sheet (RES)</option>
                </select>
              </div>

              {/* Safety Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Safety Categories
                </label>
                <SafetyCategories
                  selectedCategories={selectedCategories}
                  onSelectCategory={handleCategorySelect}
                  categories={safetyCategories}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Report Group */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Group
                </label>
                <select
                  value={reportGroup}
                  onChange={(e) => setReportGroup(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select Group</option>
                  <option value="operations">Operations</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="safety">Safety</option>
                  <option value="contractors">Contractors</option>
                </select>
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="mt-8 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Risk Assessment</h2>

              {/* Consequences & Likelihood */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Consequences
                  </label>
                  <select
                    value={consequences}
                    onChange={(e) => setConsequences(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select Severity</option>
                    <option value="minor">Minor</option>
                    <option value="moderate">Moderate</option>
                    <option value="major">Major</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Likelihood
                  </label>
                  <select
                    value={likelihood}
                    onChange={(e) => setLikelihood(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select Likelihood</option>
                    <option value="unlikely">Unlikely</option>
                    <option value="possible">Possible</option>
                    <option value="likely">Likely</option>
                    <option value="very-likely">Very Likely</option>
                  </select>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setStatus('open')}
                    className={`py-2 px-4 rounded-lg border transition-colors ${
                      status === 'open'
                        ? 'bg-green-50 border-green-500 text-green-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('closed')}
                    className={`py-2 px-4 rounded-lg border transition-colors ${
                      status === 'closed'
                        ? 'bg-gray-50 border-gray-500 text-gray-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Closed
                  </button>
                </div>
              </div>
            </div>

            {/* Image Upload */}
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-2">
                <lucide.Image className="h-5 w-5 text-green-600" />
                <label className="text-sm font-medium text-gray-700">Supporting Image</label>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:border-gray-300 cursor-pointer"
                >
                  Choose File
                </label>
                {imageFile && (
                  <span className="text-sm text-gray-500">{imageFile.name}</span>
                )}
              </div>
              {imagePreview && (
                <div className="mt-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-xs rounded-lg border border-gray-200"
                  />
                </div>
              )}
            </div>

            {/* Action Plan Section */}
            <div className="mt-8 bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <lucide.CheckSquare className="h-5 w-5 text-green-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Action Plan Required?</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setActionPlanRequired('yes')}
                    className={`py-2 px-4 rounded-lg border transition-colors ${
                      actionPlanRequired === 'yes'
                        ? 'bg-green-50 border-green-500 text-green-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionPlanRequired('no')}
                    className={`py-2 px-4 rounded-lg border transition-colors ${
                      actionPlanRequired === 'no'
                        ? 'bg-green-50 border-green-500 text-green-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {actionPlanRequired === 'yes' && (
                <div className="space-y-6">
                  {/* Action Description */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <lucide.FileText className="h-5 w-5 text-green-600" />
                      <label className="text-sm font-medium text-gray-700">Action</label>
                    </div>
                    <textarea
                      value={currentActionPlan.action}
                      onChange={(e) => setCurrentActionPlan({
                        ...currentActionPlan,
                        action: e.target.value
                      })}
                      placeholder="Enter a detailed description of the required action"
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Supporting Image */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <lucide.Image className="h-5 w-5 text-green-600" />
                      <label className="text-sm font-medium text-gray-700">Supporting Image</label>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleActionPlanImageChange}
                        className="hidden"
                        id="action-plan-image-upload"
                      />
                      <label
                        htmlFor="action-plan-image-upload"
                        className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:border-gray-300 cursor-pointer"
                      >
                        Choose File
                      </label>
                      {actionPlanImageFile && (
                        <span className="text-sm text-gray-500">{actionPlanImageFile.name}</span>
                      )}
                    </div>
                    {actionPlanImagePreview && (
                      <div className="mt-4">
                        <img
                          src={actionPlanImagePreview}
                          alt="Preview"
                          className="max-w-xs rounded-lg border border-gray-200"
                        />
                      </div>
                    )}
                  </div>

                  {/* Due Date */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <lucide.Calendar className="h-5 w-5 text-green-600" />
                      <label className="text-sm font-medium text-gray-700">Due Date</label>
                    </div>
                    <input
                      type="date"
                      value={currentActionPlan.due_date}
                      onChange={(e) => setCurrentActionPlan({
                        ...currentActionPlan,
                        due_date: e.target.value
                      })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  {/* Responsible Person */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <lucide.User className="h-5 w-5 text-green-600" />
                      <label className="text-sm font-medium text-gray-700">Responsible Person</label>
                    </div>
                    <input
                      type="text"
                      value={currentActionPlan.responsible_person}
                      onChange={(e) => setCurrentActionPlan({
                        ...currentActionPlan,
                        responsible_person: e.target.value
                      })}
                      placeholder="Enter name of person responsible"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  {/* Follow-up Contact */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <lucide.UserCheck className="h-5 w-5 text-green-600" />
                      <label className="text-sm font-medium text-gray-700">Follow-up Contact</label>
                    </div>
                    <input
                      type="text"
                      value={currentActionPlan.follow_up_contact}
                      onChange={(e) => setCurrentActionPlan({
                        ...currentActionPlan,
                        follow_up_contact: e.target.value
                      })}
                      placeholder="Enter name of person monitoring progress"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  {/* Action Plan Buttons */}
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => handleSaveActionPlan(false)}
                      className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <lucide.Save className="h-5 w-5" />
                      Save Action Plan
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveActionPlan(true)}
                      className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <lucide.Plus className="h-5 w-5" />
                      Save & Add Another
                    </button>
                  </div>

                  {/* List of Saved Action Plans */}
                  {actionPlans.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Saved Action Plans</h3>
                      <div className="space-y-4">
                        {actionPlans.map((plan, index) => (
                          <div
                            key={index}
                            className="bg-white p-4 rounded-lg shadow mb-4"
                          >
                            {editingActionPlanIndex === index ? (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Action</label>
                                  <input
                                    type="text"
                                    value={editedActionPlan?.action || ''}
                                    onChange={(e) => setEditedActionPlan({ ...editedActionPlan!, action: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Due Date</label>
                                  <input
                                    type="date"
                                    value={editedActionPlan?.due_date || ''}
                                    onChange={(e) => setEditedActionPlan({ ...editedActionPlan!, due_date: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Responsible Person</label>
                                  <input
                                    type="text"
                                    value={editedActionPlan?.responsible_person || ''}
                                    onChange={(e) => setEditedActionPlan({ ...editedActionPlan!, responsible_person: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Follow-up Contact</label>
                                  <input
                                    type="text"
                                    value={editedActionPlan?.follow_up_contact || ''}
                                    onChange={(e) => setEditedActionPlan({ ...editedActionPlan!, follow_up_contact: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Supporting Image</label>
                                  <div className="flex items-center gap-4 mt-1">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={handleEditedActionPlanImageChange}
                                      className="hidden"
                                      id={`edit-action-plan-image-${index}`}
                                    />
                                    <label
                                      htmlFor={`edit-action-plan-image-${index}`}
                                      className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:border-gray-300 cursor-pointer"
                                    >
                                      Choose File
                                    </label>
                                    {editedActionPlanImageFile && (
                                      <span className="text-sm text-gray-500">{editedActionPlanImageFile.name}</span>
                                    )}
                                  </div>
                                  {(editedActionPlanImagePreview || editedActionPlan?.supporting_image) && (
                                    <div className="mt-4">
                                      <img
                                        src={editedActionPlanImagePreview || `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/safety-images/${editedActionPlan?.supporting_image}`}
                                        alt="Preview"
                                        className="max-w-xs rounded-lg border border-gray-200"
                                      />
                                    </div>
                                  )}
                                </div>
                                <div className="flex justify-end space-x-2">
                                  <button
                                    onClick={handleCancelEditActionPlan}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={handleSaveEditedActionPlan}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                  >
                                    Save Changes
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p className="font-medium">Action: {plan.action}</p>
                                <p>Due Date: {plan.due_date}</p>
                                <p>Responsible Person: {plan.responsible_person}</p>
                                <p>Follow-up Contact: {plan.follow_up_contact}</p>
                                <p>Status: {plan.status}</p>
                                {plan.supporting_image && (
                                  <div className="mt-4">
                                    <img
                                      src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/safety-images/${plan.supporting_image}`}
                                      alt="Supporting image"
                                      className="max-w-xs rounded-lg border border-gray-200"
                                    />
                                  </div>
                                )}
                                <div className="mt-4 flex justify-end space-x-2">
                                  <button
                                    onClick={() => handleEditActionPlan(index)}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleDeleteActionPlan(index);
                                    }}
                                    type="button"
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <lucide.Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <lucide.Save className="h-5 w-5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Export Modal */}
      {showExport && (
        <ExportReport
          data={report}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}