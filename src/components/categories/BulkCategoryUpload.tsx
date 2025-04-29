'use client';

import { useState, useRef } from 'react';
import { RiFileExcel2Line, RiDownloadLine, RiUploadLine } from 'react-icons/ri';
import { toast } from 'sonner';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import { slugify } from '@/lib/utils';

interface ExcelCategory {
  name: string;
  description?: string;
  parentId?: string;
}

export default function BulkCategoryUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentUser } = useAuth();

  const downloadTemplate = () => {
    // Create template structure
    const template = [
      {
        name: 'Category Name',
        description: 'Category Description (Optional)',
        parentId: 'Parent Category ID (Optional for subcategories)'
      }
    ];

    // Convert to XLSX and download
    try {
      const worksheet = XLSX.utils.json_to_sheet(template);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Categories');
      XLSX.writeFile(workbook, 'category_upload_template.xlsx');
    } catch (error) {
      console.error('Error creating Excel template:', error);
      toast.error('Failed to create Excel template. Please try again.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setProgress(10);

      // Read the file
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          setProgress(40);

          // Get the first worksheet
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json<ExcelCategory>(worksheet);
          setProgress(60);

          if (jsonData.length === 0) {
            throw new Error('No data found in the Excel file');
          }

          // Process each category
          let successCount = 0;
          let errorCount = 0;

          for (let i = 0; i < jsonData.length; i++) {
            const item = jsonData[i];
            setProgress(60 + Math.floor((i / jsonData.length) * 30));
            
            try {
              // Validate required fields
              if (!item.name) {
                errorCount++;
                continue;
              }

              // Generate slug
              const slug = slugify(item.name);

              // Create category data
              const categoryData = {
                name: item.name,
                slug: slug,
                description: item.description || '',
                parentId: item.parentId || '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: {
                  uid: currentUser?.uid || 'unknown',
                  email: currentUser?.email || 'unknown',
                }
              };

              // Add to Firestore
              await addDoc(collection(db, 'categories'), categoryData);
              successCount++;
            } catch (error) {
              console.error('Error adding category:', error, item);
              errorCount++;
            }
          }

          setProgress(100);
          
          // Show result toast
          toast.success(`Successfully added ${successCount} categories. Failed to add ${errorCount} categories.`);

          // Reset the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } catch (error) {
          console.error('Error processing Excel file:', error);
          toast.error('Failed to process Excel file. Please check the format.');
        }
        setIsUploading(false);
        setProgress(0);
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file. Please try again.');
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
      <h3 className="text-lg font-medium text-foreground">Bulk Category Upload</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload multiple categories at once using an Excel file.
      </p>
      
      <div className="mt-4 flex flex-col sm:flex-row gap-4">
        <button
          type="button"
          onClick={downloadTemplate}
          className="inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-medium rounded-md text-foreground bg-card hover:bg-muted"
        >
          <RiDownloadLine className="mr-2 h-5 w-5" />
          Download Template
        </button>
        
        <label className="relative cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <div className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground ${isUploading ? 'bg-primary/70' : 'bg-primary hover:bg-primary/90'}`}>
            {isUploading ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-b-2 border-t-2 border-primary-foreground"></div>
                Uploading ({progress}%)
              </>
            ) : (
              <>
                <RiUploadLine className="mr-2 h-5 w-5" />
                Upload Excel File
              </>
            )}
          </div>
        </label>
      </div>
      
      <div className="mt-6">
        <h4 className="font-medium text-sm text-foreground">Instructions:</h4>
        <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
          <li>Download the template Excel file</li>
          <li>Fill in your category details in the spreadsheet</li>
          <li>Keep the header row and follow the format</li>
          <li>Upload the completed file</li>
          <li>Only the name field is required</li>
          <li>Include parentId only for subcategories</li>
        </ul>
      </div>
    </div>
  );
} 