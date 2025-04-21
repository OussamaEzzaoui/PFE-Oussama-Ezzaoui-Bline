import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import type { SafetyCategory, Project, Company, ActionPlan } from '../lib/types';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 12,
    lineHeight: 1.5
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: '#234CAD',
    paddingBottom: 10
  },
  headerTitle: {
    fontSize: 28,
    color: '#234CAD',
    marginBottom: 8,
    fontWeight: 'bold'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666'
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#F8F9FB',
    padding: 15,
    borderRadius: 4
  },
  sectionTitle: {
    fontSize: 16,
    color: '#234CAD',
    marginBottom: 10,
    fontWeight: 'bold'
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5
  },
  infoItem: {
    width: '50%',
    marginBottom: 8
  },
  label: {
    color: '#666666',
    marginBottom: 2,
    fontSize: 10
  },
  value: {
    color: '#000000',
    fontSize: 12
  },
  description: {
    color: '#000000',
    lineHeight: 1.6
  },
  statusBadge: {
    backgroundColor: '#E5E7EB',
    padding: '4 8',
    borderRadius: 4,
    alignSelf: 'flex-start'
  },
  statusText: {
    fontSize: 12,
    color: '#374151'
  },
  actionPlanItem: {
    marginBottom: 8,
    paddingLeft: 10,
    borderLeft: 1,
    borderLeftColor: '#234CAD'
  }
});

interface SafetyReportPDFProps {
  report: {
    project: Project;
    company: Company;
    submitterName: string;
    date: string;
    time: string;
    department: string;
    location: string;
    description: string;
    reportGroup: string;
    consequences: string;
    likelihood: string;
    status: string;
    subject: string;
    supportingImage?: string;
    categories: SafetyCategory[];
    actionPlans: ActionPlan[];
  };
}

export function SafetyReportPDF({ report }: SafetyReportPDFProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return { bg: '#DCFCE7', text: '#166534' };
      case 'closed':
        return { bg: '#FEE2E2', text: '#991B1B' };
      default:
        return { bg: '#E5E7EB', text: '#374151' };
    }
  };

  const getConsequencesColor = (consequences: string) => {
    switch (consequences.toLowerCase()) {
      case 'severe':
        return { bg: '#FEE2E2', text: '#991B1B' };
      case 'major':
        return { bg: '#FFEDD5', text: '#9A3412' };
      case 'moderate':
        return { bg: '#FEF9C3', text: '#854D0E' };
      case 'minor':
        return { bg: '#DCFCE7', text: '#166534' };
      default:
        return { bg: '#E5E7EB', text: '#374151' };
    }
  };

  const statusColors = getStatusColor(report.status);
  const consequencesColors = getConsequencesColor(report.consequences);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Safety Report</Text>
          <Text style={styles.headerSubtitle}>
            Generated on {format(new Date(), 'MMMM d, yyyy')} at {report.time}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Subject</Text>
              <Text style={styles.value}>{report.subject}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Date</Text>
              <Text style={styles.value}>{format(new Date(report.date), 'MMMM d, yyyy')}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Submitter</Text>
              <Text style={styles.value}>{report.submitterName}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Project</Text>
              <Text style={styles.value}>{report.project.name}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Company</Text>
              <Text style={styles.value}>{report.company.name}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Department</Text>
              <Text style={styles.value}>{report.department}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{report.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status & Severity</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                <Text style={[styles.statusText, { color: statusColors.text }]}>
                  {report.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Consequences</Text>
              <View style={[styles.statusBadge, { backgroundColor: consequencesColors.bg }]}>
                <Text style={[styles.statusText, { color: consequencesColors.text }]}>
                  {report.consequences.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {report.actionPlans.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Action Plans</Text>
            {report.actionPlans.map((plan, index) => (
              <View key={plan.id || index} style={styles.actionPlanItem}>
                <Text style={styles.value}>{plan.action}</Text>
                <Text style={styles.label}>Due: {format(new Date(plan.due_date), 'MMM d, yyyy')}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
} 