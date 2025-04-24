import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import { apiRequest } from "@/lib/queryClient";

interface CSVImportProps {
  endpoint: string;
  templateFields: string[];
  onImportComplete?: (data: any) => void;
}

export default function CSVImport({
  endpoint,
  templateFields,
  onImportComplete
}: CSVImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any[]>([]);
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
            setProgress(50);
            
            // Send the data to the server
            const response = await apiRequest(
              "POST",
              endpoint,
              { csvData: Papa.unparse(results.data) }
            );
            
            setProgress(90);
            
            const data = await response.json();
            
            setProgress(100);
            
            toast({
              title: "Import successful",
              description: data.message || "Data has been imported successfully"
            });
            
            if (onImportComplete) {
              onImportComplete(data);
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
    // Create a CSV string with the template fields
    const csvContent = Papa.unparse({
      fields: templateFields,
      data: [templateFields.map(() => "")]
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
              <p className="text-xs text-center mt-1">Uploading and processing...</p>
            </div>
          )}
          
          <Alert>
            <AlertTitle>Import Guidelines</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 text-sm">
                <li>Use the download template button to get the correct format</li>
                <li>Make sure your CSV file has headers that match the template</li>
                <li>Dates should be in YYYY-MM-DD format</li>
                <li>Numeric fields should not include currency symbols or commas</li>
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
