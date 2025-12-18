import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Filter, Phone, Mail, MessageSquare, MapPin, Loader2, Upload, FileSpreadsheet, Check, Sparkles, AlertCircle } from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Person, InsertPerson } from "@shared/schema";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface TransformedPerson {
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  category?: string | null;
  notes?: string | null;
}

interface AIMapping {
  mapping: Record<string, string | string[]>;
  confidence: number;
  unmappedHeaders: string[];
}

export default function People() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [parsedData, setParsedData] = useState<TransformedPerson[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [aiMapping, setAiMapping] = useState<AIMapping | null>(null);
  const [rawCsvData, setRawCsvData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<Partial<InsertPerson>>({
    name: "",
    email: "",
    phone: "",
    role: "",
    category: "",
    notes: "",
  });

  const detectColumnMapping = (headers: string[]) => {
    const mapping: Record<string, string | string[]> = {};
    const lowerHeaders = headers.map(h => h.toLowerCase().trim());
    
    const findHeader = (patterns: string[]) => {
      for (const pattern of patterns) {
        const idx = lowerHeaders.findIndex(h => h === pattern || h.includes(pattern));
        if (idx >= 0) return headers[idx];
      }
      return null;
    };
    
    // Name detection - check for First Name + Last Name or Full Name
    const firstNameCol = findHeader(['first name', 'firstname', 'first']);
    const lastNameCol = findHeader(['last name', 'lastname', 'last']);
    const fullNameCol = findHeader(['full name', 'fullname', 'contact name', 'name']);
    
    if (firstNameCol && lastNameCol) {
      mapping.name = [firstNameCol, lastNameCol];
    } else if (fullNameCol) {
      mapping.name = fullNameCol;
    }
    
    // Email detection - prefer primary email
    const emailCol = findHeader(['email', 'e-mail', 'email address', 'primary email']);
    if (emailCol) mapping.email = emailCol;
    
    // Phone detection - priority: Mobile > Cell > Home > Work > Phone
    const mobileCol = findHeader(['mobile phone', 'mobile', 'cell phone', 'cell', 'mobile number']);
    const homePhoneCol = findHeader(['home phone', 'home']);
    const workPhoneCol = findHeader(['work phone', 'work', 'business phone', 'office phone']);
    const phoneCol = findHeader(['phone', 'phone number', 'telephone']);
    mapping.phone = mobileCol || phoneCol || homePhoneCol || workPhoneCol || null;
    
    // Secondary phone for notes
    if (mapping.phone && (homePhoneCol || workPhoneCol)) {
      mapping.secondaryPhone = homePhoneCol || workPhoneCol;
    }
    
    // Address detection
    const addressCol = findHeader(['address', 'street address', 'street', 'address 1', 'mailing address']);
    const cityCol = findHeader(['city', 'town']);
    const stateCol = findHeader(['state', 'province', 'st']);
    const zipCol = findHeader(['zip', 'zip code', 'postal code', 'postal', 'zipcode']);
    
    if (addressCol || cityCol || stateCol || zipCol) {
      mapping.address = [];
      if (addressCol) (mapping.address as string[]).push(addressCol);
      if (cityCol) (mapping.address as string[]).push(cityCol);
      if (stateCol) (mapping.address as string[]).push(stateCol);
      if (zipCol) (mapping.address as string[]).push(zipCol);
    }
    
    // Company detection
    const companyCol = findHeader(['company', 'organization', 'business', 'employer', 'company name']);
    if (companyCol) mapping.company = companyCol;
    
    // Category/Type detection
    const categoryCol = findHeader(['category', 'type', 'contact type', 'tag', 'tags', 'group', 'status']);
    if (categoryCol) mapping.category = categoryCol;
    
    // Role detection
    const roleCol = findHeader(['role', 'title', 'job title', 'position']);
    if (roleCol) mapping.role = roleCol;
    
    // Notes detection
    const notesCol = findHeader(['notes', 'note', 'comments', 'comment', 'description', 'bio']);
    if (notesCol) mapping.notes = notesCol;
    
    // Birthday detection
    const birthdayCol = findHeader(['birthday', 'birth date', 'birthdate', 'dob', 'date of birth']);
    if (birthdayCol) mapping.birthday = birthdayCol;
    
    // Spouse/Partner detection
    const spouseCol = findHeader(['spouse', 'partner', 'spouse name', 'partner name']);
    if (spouseCol) mapping.spouse = spouseCol;
    
    return mapping;
  };

  const transformWithMapping = (mapping: Record<string, string | string[]>, rows: any[]) => {
    return rows.map((row: any) => {
      const person: any = {};
      
      // Build name from first+last or full name
      if (mapping.name) {
        if (Array.isArray(mapping.name)) {
          person.name = mapping.name.map((h: string) => row[h] || "").join(" ").trim();
        } else {
          person.name = row[mapping.name] || "";
        }
      }
      
      if (mapping.email) person.email = row[mapping.email as string] || null;
      if (mapping.phone) person.phone = row[mapping.phone as string] || null;
      if (mapping.category) person.category = row[mapping.category as string] || null;
      if (mapping.role) person.role = row[mapping.role as string] || null;
      
      // Build notes from multiple sources
      const notesParts: string[] = [];
      if (mapping.notes && row[mapping.notes as string]) {
        notesParts.push(row[mapping.notes as string]);
      }
      if (mapping.company && row[mapping.company as string]) {
        notesParts.push(`Company: ${row[mapping.company as string]}`);
      }
      if (mapping.address && Array.isArray(mapping.address)) {
        const addressParts = mapping.address.map((h: string) => row[h] || "").filter(Boolean);
        if (addressParts.length > 0) {
          notesParts.push(`Address: ${addressParts.join(", ")}`);
        }
      }
      if (mapping.secondaryPhone && row[mapping.secondaryPhone as string]) {
        notesParts.push(`Alt Phone: ${row[mapping.secondaryPhone as string]}`);
      }
      if (mapping.birthday && row[mapping.birthday as string]) {
        notesParts.push(`Birthday: ${row[mapping.birthday as string]}`);
      }
      if (mapping.spouse && row[mapping.spouse as string]) {
        notesParts.push(`Spouse: ${row[mapping.spouse as string]}`);
      }
      
      if (notesParts.length > 0) {
        person.notes = notesParts.join("\n");
      }
      
      return person;
    }).filter((p: any) => p.name && p.name.trim());
  };

  const processSpreadsheetData = async (rows: any[]) => {
    if (rows.length === 0) {
      setIsAnalyzing(false);
      toast({
        title: "No data found",
        description: "The file appears to be empty",
        variant: "destructive"
      });
      return;
    }

    setRawCsvData(rows);
    const headers = Object.keys(rows[0]);
    
    try {
      // Try AI mapping first
      const mapRes = await fetch("/api/ai-map-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers, sampleRows: rows.slice(0, 5) }),
      });
      
      if (!mapRes.ok) {
        throw new Error("AI mapping failed");
      }
      
      const mapping: AIMapping = await mapRes.json();
      setAiMapping(mapping);
      
      const transformRes = await fetch("/api/ai-transform-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping: mapping.mapping, rows }),
      });
      
      if (!transformRes.ok) {
        throw new Error("Transform failed");
      }
      
      const { people } = await transformRes.json();
      setParsedData(people);
      
      if (people.length === 0) {
        toast({
          title: "No contacts found",
          description: "Couldn't identify any contacts in the file",
          variant: "destructive"
        });
      } else {
        toast({
          title: "File analyzed",
          description: `Found ${people.length} contacts with ${Math.round(mapping.confidence * 100)}% confidence`,
        });
      }
    } catch (error: any) {
      console.error("AI mapping error, falling back to basic detection:", error);
      
      // Fallback to basic column detection
      const basicMapping = detectColumnMapping(headers);
      
      if (!basicMapping.name) {
        toast({
          title: "Could not detect columns",
          description: "Please ensure your file has a Name or First/Last Name column",
          variant: "destructive"
        });
        setIsAnalyzing(false);
        return;
      }
      
      const mappedFields = Object.keys(basicMapping).filter(k => basicMapping[k]);
      setAiMapping({
        mapping: basicMapping,
        confidence: 0.7,
        unmappedHeaders: headers.filter(h => !Object.values(basicMapping).flat().includes(h))
      });
      
      const people = transformWithMapping(basicMapping, rows);
      setParsedData(people);
      
      if (people.length > 0) {
        toast({
          title: "File analyzed",
          description: `Found ${people.length} contacts (basic detection: ${mappedFields.join(", ")})`,
        });
      } else {
        toast({
          title: "No contacts found",
          description: "Could not extract contacts from the file",
          variant: "destructive"
        });
      }
    }
    
    setIsAnalyzing(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setParsedData([]);
    setAiMapping(null);

    const ext = file.name.toLowerCase().split('.').pop();

    if (ext === 'xlsx' || ext === 'xls') {
      // Handle Excel files
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          await processSpreadsheetData(rows);
        } catch (error) {
          setIsAnalyzing(false);
          toast({
            title: "Error parsing file",
            description: "Could not read the Excel file",
            variant: "destructive"
          });
        }
      };
      reader.onerror = () => {
        setIsAnalyzing(false);
        toast({
          title: "Error reading file",
          description: "Could not read the file",
          variant: "destructive"
        });
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Handle CSV files with Papa Parse
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          await processSpreadsheetData(results.data as any[]);
        },
        error: () => {
          setIsAnalyzing(false);
          toast({
            title: "Error parsing file",
            description: "Please upload a valid spreadsheet file",
            variant: "destructive"
          });
        }
      });
    }
  };

  const handleImportPeople = async () => {
    if (parsedData.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    let imported = 0;
    
    for (let i = 0; i < parsedData.length; i++) {
      const person = parsedData[i];
      
      if (!person.name) continue;
      
      try {
        await fetch("/api/people", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: person.name,
            email: person.email || null,
            phone: person.phone || null,
            role: person.role || null,
            category: person.category || null,
            notes: person.notes || null,
          }),
        });
        imported++;
      } catch (e) {
        console.error("Failed to import:", person);
      }
      
      setUploadProgress(Math.round(((i + 1) / parsedData.length) * 100));
    }
    
    setIsUploading(false);
    queryClient.invalidateQueries({ queryKey: ["/api/people"] });
    setUploadDialogOpen(false);
    setParsedData([]);
    setAiMapping(null);
    setRawCsvData([]);
    toast({
      title: "Import Complete",
      description: `Successfully imported ${imported} people`,
    });
  };

  // Fetch all people
  const { data: people = [], isLoading } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  // Create person mutation
  const createPersonMutation = useMutation({
    mutationFn: async (data: InsertPerson) => {
      const response = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create person");
      }
      return response.json();
    },
    onSuccess: (person: Person) => {
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      
      // If category is Hot or Warm, automatically create a deal so they show in Business Tracker
      const category = formData.category?.toLowerCase() || "";
      if (category.includes("hot") || category.includes("warm")) {
        const stage = category.includes("hot") ? "hot" : "warm";
        fetch("/api/deals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personId: person.id,
            title: person.name,
            type: "buyer",
            stage: stage,
            side: "buyer",
            painPleasureRating: 3,
            value: 0,
            commissionPercent: 3,
          }),
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
        }).catch(e => {
          console.error("Failed to create deal for hot/warm person:", e);
        });
      }
      
      setDialogOpen(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        role: "",
        category: "",
        notes: "",
      });
      toast({
        title: "Success",
        description: category.includes("hot") || category.includes("warm") 
          ? `${person.name} added and will appear in Business Tracker`
          : "Person added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }
    createPersonMutation.mutate(formData as InsertPerson);
  };

  const filteredPeople = people.filter((person) =>
    person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30 relative">
        <div 
          className="fixed inset-0 opacity-40 mix-blend-multiply pointer-events-none -z-10"
          style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover' }}
        />
        
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary">People</h1>
              <p className="text-muted-foreground">Client Intelligence Core</p>
            </div>
            
            <div className="flex gap-2">
              <Dialog open={uploadDialogOpen} onOpenChange={(open) => { 
                setUploadDialogOpen(open); 
                if (!open) { 
                  setParsedData([]); 
                  setAiMapping(null); 
                  setRawCsvData([]); 
                } 
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 shadow-md" data-testid="button-upload-spreadsheet">
                    <Upload className="h-4 w-4" /> Upload Spreadsheet
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5" /> Import People from Spreadsheet
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      Upload any CRM export - AI will automatically figure out how to map the columns
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                        data-testid="input-file-upload"
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2"
                        disabled={isAnalyzing}
                        data-testid="button-select-file"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Analyzing with AI...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" /> Select Spreadsheet
                          </>
                        )}
                      </Button>
                      <p className="text-sm text-muted-foreground mt-2">
                        Works with CSV, Excel (.xlsx, .xls), and any CRM export
                      </p>
                    </div>

                    {aiMapping && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-4 w-4 text-purple-600" />
                          <span className="font-medium text-purple-800">AI Analysis Complete</span>
                          <Badge variant="outline" className="ml-auto bg-purple-100 text-purple-700 border-purple-300">
                            {Math.round(aiMapping.confidence * 100)}% confident
                          </Badge>
                        </div>
                        <div className="text-sm text-purple-700">
                          Mapped fields: {Object.keys(aiMapping.mapping).filter(k => aiMapping.mapping[k]).join(", ")}
                        </div>
                        {aiMapping.unmappedHeaders && aiMapping.unmappedHeaders.length > 0 && (
                          <div className="text-xs text-purple-600 mt-1">
                            Skipped columns: {aiMapping.unmappedHeaders.slice(0, 5).join(", ")}
                            {aiMapping.unmappedHeaders.length > 5 && ` +${aiMapping.unmappedHeaders.length - 5} more`}
                          </div>
                        )}
                      </div>
                    )}

                    {parsedData.length > 0 && (
                      <>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Notes</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {parsedData.slice(0, 10).map((person, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">{person.name}</TableCell>
                                  <TableCell>{person.phone || "-"}</TableCell>
                                  <TableCell>{person.email || "-"}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                                    {person.notes || "-"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        {parsedData.length > 10 && (
                          <p className="text-sm text-muted-foreground text-center">
                            ...and {parsedData.length - 10} more
                          </p>
                        )}
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-medium">{parsedData.length} people ready to import</p>
                          <Button 
                            onClick={handleImportPeople} 
                            disabled={isUploading}
                            className="gap-2"
                            data-testid="button-import"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Importing... {uploadProgress}%
                              </>
                            ) : (
                              <>
                                <Check className="h-4 w-4" /> Import All
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 shadow-md" data-testid="button-add-person">
                    <Plus className="h-4 w-4" /> Add Person
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Person</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      data-testid="input-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                      data-testid="input-email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                      data-testid="input-phone"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={formData.role || ""}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      placeholder="Buyer, Seller, Past Client..."
                      data-testid="input-role"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category || ""}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Hot, Warm, Nurture..."
                      data-testid="input-category"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ""}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any additional notes..."
                      data-testid="input-notes"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={createPersonMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createPersonMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                    ) : (
                      "Add Person"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </header>

          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search people..." 
                className="pl-9 bg-background/80"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search"
              />
            </div>
            <Button variant="outline" className="gap-2 bg-background/80">
              <Filter className="h-4 w-4" /> Filter
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredPeople.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No people found. Add your first contact to get started!</p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Person
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredPeople.map((person) => (
                <Link key={person.id} href={`/people/${person.id}`}>
                  <Card className="border-none shadow-sm hover:shadow-md transition-all bg-card/80 backdrop-blur-sm group cursor-pointer" data-testid={`card-person-${person.id}`}>
                    <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {person.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg hover:text-primary transition-colors" data-testid={`text-name-${person.id}`}>{person.name}</h3>
                          <div className="flex gap-2 items-center text-sm text-muted-foreground">
                            {person.role && <Badge variant="secondary" className="font-normal">{person.role}</Badge>}
                            {person.email && (
                              <><span>•</span>
                              <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {person.email}</span></>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
                        {person.category && (
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Category</p>
                            <Badge className={
                              person.category.toLowerCase().includes("hot") ? "bg-red-100 text-red-700 hover:bg-red-200 border-none" :
                              person.category.toLowerCase().includes("warm") ? "bg-orange-100 text-orange-700 hover:bg-orange-200 border-none" :
                              "bg-blue-100 text-blue-700 hover:bg-blue-200 border-none"
                            }>{person.category}</Badge>
                          </div>
                        )}
                        
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.preventDefault()}>
                          {person.phone && <Button size="icon" variant="ghost" className="h-8 w-8"><Phone className="h-4 w-4" /></Button>}
                          {person.email && <Button size="icon" variant="ghost" className="h-8 w-8"><Mail className="h-4 w-4" /></Button>}
                          <Button size="icon" variant="ghost" className="h-8 w-8"><MessageSquare className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
