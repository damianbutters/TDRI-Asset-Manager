import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import { apiRequest } from "@/lib/queryClient";

interface CSVImportProps {
  endpoint: string;
  templateFields: string[];
  onImportComplete?: (data: any) => void;
  templateExample?: Record<string, any>; // Optional example data for the template
}

export default function CSVImport({
  endpoint,
  templateFields,
  onImportComplete,
  templateExample
}: CSVImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    // Parse and show preview
    Papa.parse(selectedFile, {
      header: true,
      preview: 3, // Preview first 3 rows
      complete: (results) => {
        setPreviewData(results.data);
      },
      error: (error) => {
        toast({
          title: "Error parsing CSV",
          description: error.message,
          variant: "destructive"
        });
      }
    });
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setProgress(10);

    try {
      // Parse the CSV file
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          try {
            setProgress(20);
            
            // Get the total number of rows to process
            const totalRows = results.data.length;
            const chunkSize = 1000; // Process 1000 rows at a time
            let processedRows = 0;
            let successCount = 0;
            let errorCount = 0;
            
            setProcessingStatus(`Preparing to process ${totalRows.toLocaleString()} rows`);
            
            // Process data in chunks to avoid payload size issues
            for (let i = 0; i < totalRows; i += chunkSize) {
              // Calculate the chunk of data to process
              const chunk = results.data.slice(i, i + chunkSize);
              
              // Update progress based on how many chunks we've processed
              const chunkProgress = Math.floor(30 + (i / totalRows) * 60);
              setProgress(chunkProgress);
              
              // Update processing status
              const currentChunkStart = i + 1;
              const currentChunkEnd = Math.min(i + chunkSize, totalRows);
              setProcessingStatus(
                `Processing rows ${currentChunkStart.toLocaleString()}-${currentChunkEnd.toLocaleString()} of ${totalRows.toLocaleString()}`
              );
              
              try {
                // Send the current chunk to the server
                const response = await apiRequest(
                  "POST",
                  endpoint,
                  { csvData: Papa.unparse([Object.keys(chunk[0]), ...chunk.map(Object.values)]) }
                );
                
                const chunkResult = await response.json();
                
                // Extract success and error counts from the response
                if (chunkResult.success) {
                  const importedMatch = chunkResult.message.match(/Successfully imported (\d+)/);
                  const errorsMatch = chunkResult.message.match(/Errors: (\d+)/);
                  
                  if (importedMatch) successCount += parseInt(importedMatch[1]);
                  if (errorsMatch) errorCount += parseInt(errorsMatch[1]);
                  
                  // If there are errors in the response, add them to error details
                  if (chunkResult.errors && Array.isArray(chunkResult.errors)) {
                    setErrorDetails(prev => [...prev, ...chunkResult.errors.map((err: any) => {
                      // Try to extract row number if it's included in the error message
                      const rowMatch = err.message.match(/Row (\d+):/);
                      if (rowMatch) {
                        return err.message; // The message already contains row information
                      } else {
                        return `Rows ${currentChunkStart}-${currentChunkEnd}: ${err.message || JSON.stringify(err)}`;
                      }
                    })]);
                  }
                } else if (chunkResult.message) {
                  // If the request wasn't successful but returned a message
                  setErrorDetails(prev => [...prev, 
                    `Rows ${currentChunkStart}-${currentChunkEnd}: ${chunkResult.message}`
                  ]);
                  errorCount += chunk.length;
                }
                
                processedRows += chunk.length;
              } catch (error) {
                console.error(`Error uploading CSV chunk (rows ${i+1}-${i+chunkSize}):`, error);
                setErrorDetails(prev => [...prev, 
                  `Rows ${currentChunkStart}-${currentChunkEnd}: ${error instanceof Error ? error.message : "Unknown error"}`
                ]);
                errorCount += chunk.length;
              }
            }
            
            setProgress(95);
            setProcessingStatus('Finalizing import...');
            
            // Create a summary message
            const summary = {
              success: true,
              message: `Successfully imported ${successCount.toLocaleString()} records. Errors: ${errorCount.toLocaleString()}.`
            };
            
            setProgress(100);
            setProcessingStatus(`Complete: ${summary.message}`);
            
            toast({
              title: "Import complete",
              description: summary.message
            });
            
            if (onImportComplete) {
              onImportComplete(summary);
            }
          } catch (error) {
            console.error("Error uploading CSV data:", error);
            toast({
              title: "Import failed",
              description: error instanceof Error ? error.message : "An unknown error occurred",
              variant: "destructive"
            });
          } finally {
            setIsLoading(false);
          }
        },
        error: (error) => {
          setIsLoading(false);
          toast({
            title: "Error parsing CSV",
            description: error.message,
            variant: "destructive"
          });
        }
      });
    } catch (error) {
      setIsLoading(false);
      console.error("Error uploading CSV:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const downloadTemplate = () => {
    // Prepare data for the template
    let templateData: any[] = [];
    
    // If example data is provided, use it for the template
    if (templateExample) {
      // Create a row with the example data
      const exampleRow: Record<string, any> = {};
      templateFields.forEach(field => {
        exampleRow[field] = templateExample[field] !== undefined ? templateExample[field] : "";
      });
      templateData.push(exampleRow);
    } else {
      // Otherwise, create an empty row
      templateData.push(Object.fromEntries(templateFields.map(field => [field, ""])));
    }
    
    // Create a CSV string with the template fields
    const csvContent = Papa.unparse(templateData, { 
      header: true,
      skipEmptyLines: false 
    });
    
    // Create a Blob with the CSV content
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    
    // Create a download link and trigger the download
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "import_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import CSV Data</CardTitle>
        <CardDescription>
          Upload a CSV file with your data to import it into the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={downloadTemplate}
              disabled={isLoading}
            >
              Download Template
            </Button>
          </div>
          
          {previewData.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Preview</h3>
              <div className="border rounded-md overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(previewData[0]).map((header, i) => (
                        <th
                          key={i}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((value: any, j) => (
                          <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {isLoading && (
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center mt-1">
                {processingStatus || "Uploading and processing..."}
              </p>
            </div>
          )}
          
          {errorDetails.length > 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle className="flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                Import Errors ({errorDetails.length})
              </AlertTitle>
              <AlertDescription>
                <div className="mt-2 max-h-[200px] overflow-y-auto text-sm">
                  <ul className="list-disc pl-5 space-y-1">
                    {errorDetails.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-2 text-xs">
                  Review these errors and fix the issues in your CSV file before trying again.
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <Alert>
            <AlertTitle>Import Guidelines</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 text-sm">
                <li>Use the download template button to get the correct format</li>
                <li>Make sure your CSV file has headers that match the template</li>
                <li>Dates should be in standard format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)</li>
                <li>Datetime fields support full timestamps (e.g., 2025-04-24T14:30:00)</li>
                <li>Numeric fields should not include currency symbols or commas</li>
                <li>Large files will be automatically processed in chunks</li>
                <li>The import process may take several minutes for very large datasets</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          onClick={handleUpload}
          disabled={!file || isLoading}
        >
          {isLoading ? "Importing..." : "Import Data"}
        </Button>
      </CardFooter>
    </Card>
  );
}
