import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import * as lucide from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface ExportReportProps {
  data: any;
  onClose: () => void;
}

export function ExportReport({ data, onClose }: ExportReportProps) {
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const validateData = () => {
    if (!data) {
      throw new Error('No data available for export');
    }

    const requiredFields = ['id', 'submitter_name', 'date', 'description'];
    const missingFields = requiredFields.filter(field => !data[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  };

  const generateFileName = () => {
    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
    const baseFileName = `safety-report-${timestamp}`;
    
    switch (exportFormat) {
      case 'pdf':
        return `${baseFileName}.pdf`;
      case 'excel':
        return `${baseFileName}.xlsx`;
      case 'csv':
        return `${baseFileName}.csv`;
      default:
        return baseFileName;
    }
  };

  const exportToPDF = async () => {
    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(20);
    doc.text('Safety Observation Report', 20, 20);
    
    // Add content
    doc.setFontSize(12);
    doc.text(`Report ID: ${data.id}`, 20, 40);
    doc.text(`Submitter: ${data.submitter_name}`, 20, 50);
    doc.text(`Date: ${format(new Date(data.date), 'PPP')}`, 20, 60);
    doc.text(`Location: ${data.location}`, 20, 70);
    
    // Add description with word wrap
    const splitDescription = doc.splitTextToSize(data.description, 170);
    doc.text(splitDescription, 20, 90);
    
    return doc;
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet([data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Safety Report');
    return workbook;
  };

  const handlePreview = async () => {
    try {
      validateData();
      
      if (exportFormat === 'pdf') {
        const doc = await exportToPDF();
        const pdfDataUri = doc.output('datauristring');
        window.open(pdfDataUri);
      } else {
        // For Excel/CSV, show a preview in a table format
        setIsPreviewOpen(true);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate preview');
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      validateData();

      const fileName = generateFileName();

      switch (exportFormat) {
        case 'pdf': {
          const doc = await exportToPDF();
          doc.save(fileName);
          break;
        }
        case 'excel': {
          const workbook = exportToExcel();
          XLSX.writeFile(workbook, fileName);
          break;
        }
        case 'csv': {
          const workbook = exportToExcel();
          XLSX.writeFile(workbook, fileName, { bookType: 'csv' });
          break;
        }
      }

      toast.success('Report exported successfully!');
      
      // Ask if user wants to open the file
      const shouldOpen = window.confirm('Would you like to open the exported file?');
      if (shouldOpen) {
        // For PDF, we can open in a new tab
        if (exportFormat === 'pdf') {
          const doc = await exportToPDF();
          const pdfDataUri = doc.output('datauristring');
          window.open(pdfDataUri);
        } else {
          toast.info('Please check your downloads folder for the exported file');
        }
      }

      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Export Report</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <lucide.X className="h-6 w-6" />
            </button>
          </div>

          {/* Format Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-4">
              {(['pdf', 'excel', 'csv'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => setExportFormat(format)}
                  className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                    exportFormat === format
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {format === 'pdf' && <lucide.FileText className="h-6 w-6" />}
                  {format === 'excel' && <lucide.Table className="h-6 w-6" />}
                  {format === 'csv' && <lucide.FileSpreadsheet className="h-6 w-6" />}
                  <span className="text-sm font-medium uppercase">{format}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {isPreviewOpen && exportFormat !== 'pdf' && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Preview</h3>
              <div className="border rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(data).map((key) => (
                        <th
                          key={key}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      {Object.values(data).map((value: any, index) => (
                        <td
                          key={index}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              onClick={handlePreview}
              className="px-4 py-2 text-green-600 hover:text-green-700 font-medium flex items-center gap-2"
            >
              <lucide.Eye className="h-5 w-5" />
              Preview
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <lucide.Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <lucide.Download className="h-5 w-5" />
              )}
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}