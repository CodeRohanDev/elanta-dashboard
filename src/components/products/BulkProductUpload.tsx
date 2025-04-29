'use client';

import { useState, useRef } from 'react';
import { RiFileExcel2Line, RiDownloadLine, RiUploadLine } from 'react-icons/ri';
import { toast } from '@/components/ui/use-toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';

interface ExcelProduct {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  subcategory?: string;
  discountPrice?: number;
  features?: string;
  specifications?: string;
}

export default function BulkProductUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentUser } = useAuth();

  const downloadTemplate = () => {
    // Create template structure
    const template = [
      {
        name: 'Product Name',
        description: 'Product Description',
        price: 100,
        stock: 10,
        category: 'CategoryID',
        subcategory: 'SubcategoryID (Optional)',
        discountPrice: 90,
        features: 'Feature1,Feature2,Feature3',
        specifications: 'Color:Red,Size:Medium,Material:Cotton'
      }
    ];

    // Convert to XLSX and download
    try {
      const worksheet = XLSX.utils.json_to_sheet(template);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
      XLSX.writeFile(workbook, 'product_upload_template.xlsx');
    } catch (error) {
      console.error('Error creating Excel template:', error);
      toast({
        id: 'xlsx-create-error',
        title: 'Error',
        description: 'Failed to create Excel template. Please try again.',
        variant: 'destructive',
      });
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
          const jsonData = XLSX.utils.sheet_to_json<ExcelProduct>(worksheet);
          setProgress(60);

          if (jsonData.length === 0) {
            throw new Error('No data found in the Excel file');
          }

          // Process each product
          let successCount = 0;
          let errorCount = 0;

          for (let i = 0; i < jsonData.length; i++) {
            const item = jsonData[i];
            setProgress(60 + Math.floor((i / jsonData.length) * 30));
            
            try {
              // Validate required fields
              if (!item.name || !item.description || item.price === undefined || item.stock === undefined) {
                errorCount++;
                continue;
              }

              // Process features (convert comma-separated to array)
              const features = item.features ? item.features.split(',').map((f: string) => f.trim()) : [];
              
              // Process specifications (convert format like "Color:Red,Size:Medium" to object)
              const specifications: Record<string, string> = {};
              if (item.specifications && typeof item.specifications === 'string') {
                const specPairs = item.specifications.split(',');
                specPairs.forEach((pair: string) => {
                  const [key, value] = pair.split(':').map((s: string) => s.trim());
                  if (key && value) {
                    specifications[key] = value;
                  }
                });
              }

              // Create product data
              const productData = {
                name: item.name,
                description: item.description,
                price: Number(item.price),
                stock: Number(item.stock),
                category: item.category,
                subcategory: item.subcategory || '',
                discountPrice: item.discountPrice ? Number(item.discountPrice) : null,
                features: features,
                specifications: specifications,
                images: [], // No images in bulk upload
                isActive: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: {
                  uid: currentUser?.uid || 'unknown',
                  email: currentUser?.email || 'unknown',
                }
              };

              // Add to Firestore
              await addDoc(collection(db, 'products'), productData);
              successCount++;
            } catch (error) {
              console.error('Error adding product:', error, item);
              errorCount++;
            }
          }

          setProgress(100);
          
          // Show result toast
          toast({
            id: 'bulk-upload-success',
            title: 'Upload Complete',
            description: `Successfully added ${successCount} products. Failed to add ${errorCount} products.`,
            variant: successCount > 0 ? 'success' : 'destructive',
          });

          // Reset the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } catch (error) {
          console.error('Error processing Excel file:', error);
          toast({
            id: 'excel-process-error',
            title: 'Error',
            description: 'Failed to process Excel file. Please check the format.',
            variant: 'destructive',
          });
        } finally {
          setIsUploading(false);
          setProgress(0);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        id: 'upload-error',
        title: 'Error',
        description: 'Failed to upload file. Please try again.',
        variant: 'destructive',
      });
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
      <h3 className="text-lg font-medium text-foreground">Bulk Product Upload</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload multiple products at once using an Excel file.
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
          <li>Fill in your product details in the spreadsheet</li>
          <li>Keep the header row and follow the format</li>
          <li>Upload the completed file</li>
          <li>For features, use comma-separated values</li>
          <li>For specifications, use format "Key:Value,Key2:Value2"</li>
        </ul>
      </div>
    </div>
  );
} 