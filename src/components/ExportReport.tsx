import React, { useState } from 'react';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Report, SafetyCategory, ActionPlan } from '../lib/types';
import * as lucide from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';

interface ExportReportProps {
  data: Report;
  onClose: () => void;
}

interface ExportFormat {
  value: string;
  label: string;
}

export function ExportReport({ data, onClose }: ExportReportProps) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>({ value: 'pdf', label: 'PDF' });
  const [includeImages, setIncludeImages] = useState(true);
  const [includeActionPlans, setIncludeActionPlans] = useState(true);
  const [includeSafetyCategories, setIncludeSafetyCategories] = useState(true);
  const [loading, setLoading] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportToPDF = async () => {
    setLoading(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 12;
      const lineHeight = 15;
      let y = height - 50;

      const addText = (text: string, x: number, isBold = false) => {
        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
        y -= lineHeight;
      };

      // Add report details
      addText(`Report ID: ${data.id}`, 50);
      addText(`Subject: ${data.subject}`, 50);
      addText(`Project: ${data.project}`, 50);
      addText(`Company: ${data.company}`, 50);
      addText(`Submitter: ${data.submitter_name}`, 50);
      addText(`Date: ${formatDate(data.date)}`, 50);
      addText(`Time: ${formatTime(data.time)}`, 50);
      addText(`Location: ${data.location}`, 50);
      addText(`Department: ${data.department}`, 50);
      addText(`Description: ${data.description}`, 50);
      addText(`Report Group: ${data.report_group}`, 50);
      addText(`Potential Consequences: ${data.consequences}`, 50);
      addText(`Likelihood: ${data.likelihood}`, 50);
      addText(`Status: ${data.status}`, 50);

      // Add safety categories if included
      if (includeSafetyCategories && data.safety_categories) {
        addText('Safety Categories:', 50, true);
        await addSafetyCategoriesToPDF(pdfDoc, data.safety_categories, y, page, font);
      }

      // Add action plans if included
      if (includeActionPlans && data.action_plans) {
        addText('Action Plans:', 50, true);
        await addActionPlansToPDF(pdfDoc, data.action_plans, y, page, font);
      }

      // Add images if included
      if (includeImages && data.supporting_image) {
        try {
          // Check if the image is already a base64 string
          if (data.supporting_image.startsWith('data:image')) {
            // Convert base64 to Uint8Array
            const base64Data = data.supporting_image.split(',')[1];
            const binaryString = window.atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Try to embed as PNG first, then JPG if that fails
            try {
              const image = await pdfDoc.embedPng(bytes);
              const imageDims = image.scale(0.5);
              page.drawImage(image, {
                x: 50,
                y: y - imageDims.height,
                width: imageDims.width,
                height: imageDims.height
              });
            } catch (pngError) {
              try {
                const image = await pdfDoc.embedJpg(bytes);
                const imageDims = image.scale(0.5);
                page.drawImage(image, {
                  x: 50,
                  y: y - imageDims.height,
                  width: imageDims.width,
                  height: imageDims.height
                });
              } catch (jpgError) {
                console.error('Failed to embed image as PNG or JPG:', jpgError);
              }
            }
          } else {
            // Handle URL or path
            let imageData;
            if (data.supporting_image.startsWith('http')) {
              // If it's already a full URL, fetch it directly
              const response = await fetch(data.supporting_image);
              imageData = await response.blob();
            } else {
              // Download from Supabase if it's a path
              const { data: supabaseData, error: imageError } = await supabase.storage
                .from('safety-images')
                .download(data.supporting_image);

              if (imageError) {
                throw imageError;
              }
              imageData = supabaseData;
            }

            if (imageData) {
              const imageBytes = await imageData.arrayBuffer();
              // Try to embed as PNG first, then JPG if that fails
              try {
                const image = await pdfDoc.embedPng(imageBytes);
                const imageDims = image.scale(0.5);
                page.drawImage(image, {
                  x: 50,
                  y: y - imageDims.height,
                  width: imageDims.width,
                  height: imageDims.height
                });
              } catch (pngError) {
                try {
                  const image = await pdfDoc.embedJpg(imageBytes);
                  const imageDims = image.scale(0.5);
                  page.drawImage(image, {
                    x: 50,
                    y: y - imageDims.height,
                    width: imageDims.width,
                    height: imageDims.height
                  });
                } catch (jpgError) {
                  console.error('Failed to embed image as PNG or JPG:', jpgError);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error adding image to PDF:', error);
        }
      }

      // Add action plan images if included
      if (includeActionPlans && data.action_plans) {
        for (const plan of data.action_plans) {
          if (plan.supporting_image) {
            try {
              let imageData;
              if (plan.supporting_image.startsWith('http')) {
                // If it's already a full URL, fetch it directly
                const response = await fetch(plan.supporting_image);
                imageData = await response.blob();
              } else {
                // Download from Supabase if it's a path
                const { data: supabaseData, error: imageError } = await supabase.storage
                  .from('action-plan-images')
                  .download(plan.supporting_image);

                if (imageError) {
                  throw imageError;
                }
                imageData = supabaseData;
              }

              if (imageData) {
                const imageBytes = await imageData.arrayBuffer();
                // Try to embed as PNG first, then JPG if that fails
                try {
                  const image = await pdfDoc.embedPng(imageBytes);
                  const imageDims = image.scale(0.5);
                  page.drawImage(image, {
                    x: 50,
                    y: y - imageDims.height,
                    width: imageDims.width,
                    height: imageDims.height
                  });
                } catch (pngError) {
                  try {
                    const image = await pdfDoc.embedJpg(imageBytes);
                    const imageDims = image.scale(0.5);
                    page.drawImage(image, {
                      x: 50,
                      y: y - imageDims.height,
                      width: imageDims.width,
                      height: imageDims.height
                    });
                  } catch (jpgError) {
                    console.error('Failed to embed image as PNG or JPG:', jpgError);
                  }
                }
              }
            } catch (error) {
              console.error('Error adding action plan image to PDF:', error);
            }
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      saveAs(blob, `safety-report-${data.id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csvData = [
      ['Report ID', data.id],
      ['Subject', data.subject],
      ['Project', data.project],
      ['Company', data.company],
      ['Submitter', data.submitter_name],
      ['Date', formatDate(data.date)],
      ['Time', formatTime(data.time)],
      ['Location', data.location],
      ['Department', data.department],
      ['Description', data.description],
      ['Report Group', data.report_group],
      ['Potential Consequences', data.consequences],
      ['Likelihood', data.likelihood],
      ['Status', data.status]
    ];

    if (includeSafetyCategories && data.safety_categories) {
      csvData.push(['Safety Categories', addSafetyCategoriesToCSV(data.safety_categories)]);
    }

    if (includeActionPlans && data.action_plans) {
      data.action_plans.forEach((plan: ActionPlan, index: number) => {
        csvData.push([`Action Plan ${index + 1}`, '']);
        csvData.push(['Action', plan.action]);
        csvData.push(['Due Date', formatDate(plan.due_date)]);
        csvData.push(['Responsible Person', plan.responsible_person]);
        csvData.push(['Follow-up Contact', plan.follow_up_contact]);
        csvData.push(['Status', plan.status]);
      });
    }

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `safety-report-${data.id}.csv`);
  };

  const handleExport = () => {
    if (exportFormat.value === 'pdf') {
      exportToPDF();
    } else {
      exportToCSV();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Export Report</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <lucide.X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Export Format
            </label>
            <select
              value={exportFormat.value}
              onChange={(e) => setExportFormat({
                value: e.target.value,
                label: e.target.value === 'pdf' ? 'PDF' : 'CSV'
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeImages}
                onChange={(e) => setIncludeImages(e.target.checked)}
                className="mr-2"
              />
              Include Images
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeActionPlans}
                onChange={(e) => setIncludeActionPlans(e.target.checked)}
                className="mr-2"
              />
              Include Action Plans
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeSafetyCategories}
                onChange={(e) => setIncludeSafetyCategories(e.target.checked)}
                className="mr-2"
              />
              Include Safety Categories
            </label>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const addActionPlanToPDF = async (pdfDoc: PDFDocument, actionPlan: ActionPlan, y: number, page: any, font: any) => {
  // ... existing code ...
  return y;
};

const addActionPlansToPDF = async (pdfDoc: PDFDocument, actionPlans: ActionPlan[], y: number, page: any, font: any) => {
  let currentY = y;
  for (const plan of actionPlans) {
    currentY = await addActionPlanToPDF(pdfDoc, plan, currentY, page, font);
  }
  return currentY;
};

const addActionPlansToCSV = (actionPlans: ActionPlan[]): string => {
  return actionPlans.map(plan => 
    `${plan.action}|${plan.due_date}|${plan.responsible_person}|${plan.follow_up_contact}|${plan.status}`
  ).join('\n');
};

const addSafetyCategoriesToPDF = async (pdfDoc: PDFDocument, categories: SafetyCategory[], y: number, page: any, font: any) => {
  // ... existing code ...
  return y;
};

const addSafetyCategoriesToCSV = (categories: SafetyCategory[]): string => {
  return categories.map(category => category.name).join(', ');
};