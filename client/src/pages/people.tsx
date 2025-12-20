import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Filter, Phone, Mail, MessageSquare, MapPin, Loader2, Upload, FileSpreadsheet, Check, Sparkles, AlertCircle, X, Tag, Trash2, Download, CheckSquare, Users, Home } from "lucide-react";
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
  segment?: string | null;
  address?: string | null;
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSegmentDialogOpen, setBulkSegmentDialogOpen] = useState(false);
  const [bulkSegment, setBulkSegment] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [householdDialogOpen, setHouseholdDialogOpen] = useState(false);
  const [householdName, setHouseholdName] = useState("");
  const [householdAddress, setHouseholdAddress] = useState("");
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<InsertPerson>>({
    name: "",
    nickname: "",
    email: "",
    phone: "",
    role: "",
    segment: "",
    notes: "",
  });

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const detectColumnMapping = (headers: string[]) => {
    const mapping: Record<string, string | string[]> = {};
    const lowerHeaders = headers.map(h => h.toLowerCase().trim().replace(/[_\-]/g, ' '));
    
    const findHeader = (patterns: string[]) => {
      for (const pattern of patterns) {
        const idx = lowerHeaders.findIndex(h => h === pattern || h.includes(pattern));
        if (idx >= 0) return headers[idx];
      }
      return null;
    };
    
    // Name detection - check for First Name + Last Name or Full Name
    // Extended patterns for various CRM exports
    const firstNameCol = findHeader(['first name', 'firstname', 'first', 'given name', 'given', 'fname', 'contact first']);
    const lastNameCol = findHeader(['last name', 'lastname', 'last', 'family name', 'surname', 'lname', 'contact last']);
    const fullNameCol = findHeader(['full name', 'fullname', 'contact name', 'client name', 'customer name', 'display name', 'person name']);
    // Avoid matching just "Name" which might be a generic header - check for exact match only
    const nameExactCol = headers.find(h => h.toLowerCase().trim() === 'name');
    
    if (firstNameCol && lastNameCol) {
      mapping.name = [firstNameCol, lastNameCol];
    } else if (fullNameCol) {
      mapping.name = fullNameCol;
    } else if (nameExactCol) {
      mapping.name = nameExactCol;
    } else if (firstNameCol) {
      // Sometimes only first name is available
      mapping.name = firstNameCol;
    }
    
    // Household name detection for family/household tracking
    const householdCol = findHeader(['household name', 'household', 'family name', 'family']);
    if (householdCol) mapping.household = householdCol;
    
    // Email detection - prefer primary email, handle various CRM patterns
    const emailCol = findHeader(['email', 'e mail', 'email address', 'primary email', 'email1', 'email 1', 'contact email', 'personal email', 'work email', 'main email']);
    if (emailCol) mapping.email = emailCol;
    
    // Phone detection - priority: Mobile > Cell > Home > Work > Phone
    // Extended for CRM exports like Cloze, Follow Up Boss, etc.
    const mobileCol = findHeader(['mobile phone', 'mobile', 'cell phone', 'cell', 'mobile number', 'cellphone', 'mobile1', 'phone mobile', 'primary phone']);
    const homePhoneCol = findHeader(['home phone', 'home', 'phone home', 'personal phone', 'home number']);
    const workPhoneCol = findHeader(['work phone', 'work', 'business phone', 'office phone', 'phone work', 'office', 'phone business']);
    const phoneCol = findHeader(['phone', 'phone number', 'telephone', 'tel', 'phone1', 'phone 1', 'main phone', 'contact phone']);
    const primaryPhone = mobileCol || phoneCol || homePhoneCol || workPhoneCol;
    if (primaryPhone) mapping.phone = primaryPhone;
    
    // Secondary phone for notes
    const allPhones = [mobileCol, phoneCol, homePhoneCol, workPhoneCol].filter(Boolean);
    if (allPhones.length > 1) {
      const secondaryPhone = allPhones.find(p => p !== primaryPhone);
      if (secondaryPhone) mapping.secondaryPhone = secondaryPhone;
    }
    
    // Address detection - extended patterns including Cloze/CRM format (Home Street, Home City, etc.)
    const addressCol = findHeader(['address', 'street address', 'street', 'address 1', 'mailing address', 'home address', 'address line 1', 'street1', 'primary address', 'home street', 'business street', 'other street']);
    const address2Col = findHeader(['address 2', 'address line 2', 'street2', 'apt', 'unit', 'suite']);
    const cityCol = findHeader(['city', 'town', 'locality', 'home city', 'business city', 'other city']);
    const stateCol = findHeader(['state', 'province', 'st', 'region', 'home state', 'business state', 'other state']);
    const zipCol = findHeader(['zip', 'zip code', 'postal code', 'postal', 'zipcode', 'postcode', 'home postal code', 'business postal code', 'other postal code']);
    const countryCol = findHeader(['country', 'nation', 'home country', 'business country', 'other country']);
    
    if (addressCol || cityCol || stateCol || zipCol) {
      mapping.address = [];
      if (addressCol) (mapping.address as string[]).push(addressCol);
      if (address2Col) (mapping.address as string[]).push(address2Col);
      if (cityCol) (mapping.address as string[]).push(cityCol);
      if (stateCol) (mapping.address as string[]).push(stateCol);
      if (zipCol) (mapping.address as string[]).push(zipCol);
      if (countryCol) (mapping.address as string[]).push(countryCol);
    }
    
    // Company detection - extended
    const companyCol = findHeader(['company', 'organization', 'business', 'employer', 'company name', 'business name', 'org', 'firm', 'workplace']);
    if (companyCol) mapping.company = companyCol;
    
    // Segment/Category detection - extended for CRM systems
    // Note: Tags is very common in Cloze and other CRMs
    const segmentCol = findHeader(['segment', 'category', 'type', 'contact type', 'group', 'status', 'lead status', 'client type', 'pipeline', 'stage', 'label', 'labels']);
    if (segmentCol) mapping.segment = segmentCol;
    
    // Tags detection (separate from category, will be added to notes)
    const tagsCol = findHeader(['tags', 'tag', 'keywords']);
    if (tagsCol) mapping.tags = tagsCol;
    
    // Headline/Title for professional info
    const headlineCol = findHeader(['headline', 'professional headline', 'linkedin headline', 'tagline']);
    if (headlineCol) mapping.headline = headlineCol;
    
    // Role/Title detection - extended
    const roleCol = findHeader(['role', 'title', 'job title', 'position', 'job', 'occupation', 'profession']);
    if (roleCol) mapping.role = roleCol;
    
    // Notes detection - extended
    const notesCol = findHeader(['notes', 'note', 'comments', 'comment', 'description', 'bio', 'memo', 'details', 'additional info', 'information']);
    if (notesCol) mapping.notes = notesCol;
    
    // Birthday detection - extended
    const birthdayCol = findHeader(['birthday', 'birth date', 'birthdate', 'dob', 'date of birth', 'bday']);
    if (birthdayCol) mapping.birthday = birthdayCol;
    
    // Spouse/Partner detection - extended
    const spouseCol = findHeader(['spouse', 'partner', 'spouse name', 'partner name', 'significant other', 'so', 'husband', 'wife']);
    if (spouseCol) mapping.spouse = spouseCol;
    
    // Source/Lead source detection
    const sourceCol = findHeader(['source', 'lead source', 'referral', 'how found', 'origin', 'campaign']);
    if (sourceCol) mapping.source = sourceCol;
    
    return mapping;
  };

  const transformWithMapping = (mapping: Record<string, string | string[]>, rows: any[], allHeaders?: string[]) => {
    // Get all mapped column names to track which ones we've used
    const mappedColumns = new Set<string>();
    Object.values(mapping).forEach(val => {
      if (Array.isArray(val)) {
        val.forEach(v => mappedColumns.add(v));
      } else if (val) {
        mappedColumns.add(val as string);
      }
    });
    
    return rows.map((row: any) => {
      const person: any = {};
      const headers = allHeaders || Object.keys(row);
      
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
      if (mapping.segment) person.segment = row[mapping.segment as string] || null;
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
      if (mapping.source && row[mapping.source as string]) {
        notesParts.push(`Source: ${row[mapping.source as string]}`);
      }
      if (mapping.household && row[mapping.household as string]) {
        notesParts.push(`Household: ${row[mapping.household as string]}`);
      }
      if (mapping.tags && row[mapping.tags as string]) {
        notesParts.push(`Tags: ${row[mapping.tags as string]}`);
      }
      if (mapping.headline && row[mapping.headline as string]) {
        notesParts.push(`Headline: ${row[mapping.headline as string]}`);
      }
      
      // Capture ALL unmapped columns with data
      const unmappedData: string[] = [];
      headers.forEach(header => {
        if (!mappedColumns.has(header) && row[header] && String(row[header]).trim()) {
          const value = String(row[header]).trim();
          // Skip if value is just whitespace or common empty values
          if (value && value !== '-' && value !== 'N/A' && value !== 'null' && value !== 'undefined') {
            unmappedData.push(`${header}: ${value}`);
          }
        }
      });
      
      if (unmappedData.length > 0) {
        notesParts.push("--- Additional Data ---");
        notesParts.push(...unmappedData);
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
      
      const people = transformWithMapping(basicMapping, rows, headers);
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
            segment: person.segment || null,
            address: person.address || null,
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

  // Fetch all households
  interface Household {
    id: string;
    name: string;
    address?: string | null;
    primaryPersonId?: string | null;
    members?: Person[];
  }
  
  const { data: households = [] } = useQuery<Household[]>({
    queryKey: ["/api/households"],
  });

  // Create/link household mutation
  const createHouseholdMutation = useMutation({
    mutationFn: async (data: { name: string; address?: string; memberIds: string[] }) => {
      const response = await fetch("/api/households", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          address: data.address,
          primaryPersonId: data.memberIds[0],
          memberIds: data.memberIds,
        }),
      });
      if (!response.ok) throw new Error("Failed to create household");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      setHouseholdDialogOpen(false);
      setHouseholdName("");
      setHouseholdAddress("");
      setSelectedHouseholdId(null);
      clearSelection();
      toast({ title: "Household Created", description: "People linked to household" });
    },
  });

  // Link to existing household mutation
  const linkToHouseholdMutation = useMutation({
    mutationFn: async ({ householdId, memberIds }: { householdId: string; memberIds: string[] }) => {
      for (const personId of memberIds) {
        const response = await fetch(`/api/households/${householdId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ personId }),
        });
        if (!response.ok) throw new Error("Failed to link person to household");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      setHouseholdDialogOpen(false);
      setSelectedHouseholdId(null);
      clearSelection();
      toast({ title: "Linked", description: "People added to household" });
    },
  });

  const handleLinkToHousehold = () => {
    const memberIds = Array.from(selectedIds);
    if (selectedHouseholdId) {
      linkToHouseholdMutation.mutate({ householdId: selectedHouseholdId, memberIds });
    } else if (householdName.trim()) {
      // Create new household with selected people
      const selectedPeople = people.filter(p => selectedIds.has(p.id));
      const defaultName = householdName || selectedPeople.map(p => p.name.split(' ').pop()).join(' & ') + ' Household';
      createHouseholdMutation.mutate({
        name: defaultName,
        address: householdAddress || undefined,
        memberIds,
      });
    }
  };

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
      
      // If segment indicates Hot or Warm, automatically create a deal so they show in Business Tracker
      const segment = formData.segment?.toLowerCase() || "";
      if (segment.includes("hot") || segment.includes("warm")) {
        const stage = segment.includes("hot") ? "hot" : "warm";
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
        segment: "",
        notes: "",
      });
      toast({
        title: "Success",
        description: segment.includes("hot") || segment.includes("warm") 
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

  const filteredPeople = people.filter((person) => {
    const matchesSearch = person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.phone?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSegment = segmentFilter === "all" || 
      (person.segment?.toLowerCase().includes(segmentFilter.toLowerCase()));
    
    return matchesSearch && matchesSegment;
  });

  const uniqueSegments = Array.from(new Set(people.map(p => p.segment).filter(Boolean))) as string[];

  const selectAll = () => {
    if (selectedIds.size === filteredPeople.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPeople.map(p => p.id)));
    }
  };

  const handleBulkSegmentChange = async () => {
    if (!bulkSegment.trim()) return;
    
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try {
        await fetch(`/api/people/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ segment: bulkSegment }),
        });
      } catch (e) {
        console.error("Failed to update:", id);
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ["/api/people"] });
    setBulkSegmentDialogOpen(false);
    setBulkSegment("");
    clearSelection();
    toast({ title: "Updated", description: `Changed segment for ${selectedIds.size} people` });
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) {
      toast({ title: "No selection", description: "Please select people to delete", variant: "destructive" });
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${count} people? This cannot be undone.`)) return;
    
    const ids = Array.from(selectedIds);
    let successCount = 0;
    let failCount = 0;
    
    await Promise.all(ids.map(async (id) => {
      try {
        const res = await fetch(`/api/people/${id}`, { method: "DELETE" });
        if (res.ok) {
          successCount++;
        } else {
          failCount++;
          console.error("Failed to delete:", id, res.status);
        }
      } catch (e) {
        failCount++;
        console.error("Failed to delete:", id, e);
      }
    }));
    
    queryClient.invalidateQueries({ queryKey: ["/api/people"] });
    clearSelection();
    
    if (failCount > 0) {
      toast({ title: "Partial Delete", description: `Deleted ${successCount}, failed ${failCount}`, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: `Removed ${successCount} people` });
    }
  };

  const handleExportSelected = () => {
    const selectedPeople = people.filter(p => selectedIds.has(p.id));
    const csv = [
      ["Name", "Email", "Phone", "Segment", "Role", "Notes"],
      ...selectedPeople.map(p => [
        p.name,
        p.email || "",
        p.phone || "",
        p.segment || "",
        p.role || "",
        (p.notes || "").replace(/\n/g, " ")
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Exported", description: `Downloaded ${selectedIds.size} contacts` });
  };

  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30 relative">
        <div 
          className="fixed inset-0 opacity-40 mix-blend-multiply pointer-events-none -z-10"
          style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover' }}
        />
        
        <div className="container mx-auto px-4 py-4 md:py-8 max-w-6xl">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary">People</h1>
              <p className="text-muted-foreground text-sm md:text-base">Client Intelligence Core</p>
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Joseph Melody"
                        data-testid="input-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nickname">Nickname</Label>
                      <Input
                        id="nickname"
                        value={formData.nickname || ""}
                        onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                        placeholder="Joe"
                        data-testid="input-nickname"
                      />
                    </div>
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
                    <Label htmlFor="segment">Segment</Label>
                    <Input
                      id="segment"
                      value={formData.segment || ""}
                      onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                      placeholder="A - Advocate, B - Fan, C - Network, D - 8x8..."
                      data-testid="input-segment"
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

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6">
            <div className="flex items-center gap-3 order-2 sm:order-1">
              <Checkbox 
                checked={filteredPeople.length > 0 && selectedIds.size === filteredPeople.length}
                onCheckedChange={selectAll}
                data-testid="checkbox-select-all"
                className="h-5 w-5"
              />
              {selectedIds.size > 0 ? (
                <span className="text-sm font-medium text-primary">
                  {selectedIds.size} of {filteredPeople.length}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground hidden sm:inline">Select all</span>
              )}
            </div>
            <div className="relative flex-1 order-1 sm:order-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search people..." 
                className="pl-9 bg-background/80"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search"
              />
            </div>
            <select
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value)}
              className="h-10 px-3 py-2 rounded-md border border-input bg-background/80 text-sm order-3"
              data-testid="select-segment-filter"
            >
              <option value="all">All</option>
              <option value="a">A</option>
              <option value="b">B</option>
              <option value="c">C</option>
              <option value="d">D</option>
              {uniqueSegments.filter(s => !s.toLowerCase().startsWith('a') && !s.toLowerCase().startsWith('b') && !s.toLowerCase().startsWith('c') && !s.toLowerCase().startsWith('d')).map(seg => (
                <option key={seg} value={seg.toLowerCase()}>{seg}</option>
              ))}
            </select>
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
            <div className="grid gap-4 pb-20">
              {filteredPeople.map((person) => (
                <Card 
                  key={person.id} 
                  className={`border-none shadow-sm hover:shadow-md transition-all bg-card/80 backdrop-blur-sm group cursor-pointer ${selectedIds.has(person.id) ? 'ring-2 ring-primary bg-primary/5' : ''}`} 
                  data-testid={`card-person-${person.id}`}
                >
                  <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
                    <div className="flex items-center gap-4">
                      <div onClick={(e) => toggleSelect(person.id, e)} className="flex-shrink-0">
                        <Checkbox 
                          checked={selectedIds.has(person.id)}
                          onCheckedChange={() => toggleSelect(person.id)}
                          className="h-5 w-5"
                          data-testid={`checkbox-person-${person.id}`}
                        />
                      </div>
                      <Link href={`/people/${person.id}`} className="flex items-center gap-4 flex-1">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
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
                      </Link>
                    </div>
                    
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
                      {person.segment && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Segment</p>
                          <Badge className={
                            person.segment.toLowerCase().startsWith("a") ? "bg-purple-100 text-purple-700 hover:bg-purple-200 border-none" :
                            person.segment.toLowerCase().startsWith("b") ? "bg-blue-100 text-blue-700 hover:bg-blue-200 border-none" :
                            person.segment.toLowerCase().startsWith("c") ? "bg-green-100 text-green-700 hover:bg-green-200 border-none" :
                            person.segment.toLowerCase().startsWith("d") ? "bg-orange-100 text-orange-700 hover:bg-orange-200 border-none" :
                            "bg-gray-100 text-gray-700 hover:bg-gray-200 border-none"
                          }>{person.segment}</Badge>
                        </div>
                      )}
                      
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {person.phone && <Button size="icon" variant="ghost" className="h-8 w-8"><Phone className="h-4 w-4" /></Button>}
                        {person.email && <Button size="icon" variant="ghost" className="h-8 w-8"><Mail className="h-4 w-4" /></Button>}
                        <Button size="icon" variant="ghost" className="h-8 w-8"><MessageSquare className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 md:bottom-6 left-2 right-2 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50 bg-primary text-primary-foreground rounded-full shadow-2xl px-4 md:px-6 py-3 flex items-center justify-center gap-2 md:gap-4 animate-in slide-in-from-bottom-4">
          <span className="font-medium text-sm md:text-base">{selectedIds.size} selected</span>
          <div className="h-6 w-px bg-primary-foreground/30" />
          
          <Dialog open={bulkSegmentDialogOpen} onOpenChange={setBulkSegmentDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/20 gap-1 md:gap-2 px-2 md:px-3">
                <Tag className="h-4 w-4" /> <span className="hidden sm:inline">Segment</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Segment</DialogTitle>
                <DialogDescription>Set segment for {selectedIds.size} selected people</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {["A - Advocate", "B - Fan", "C - Network", "D - 8x8"].map(seg => (
                    <Button 
                      key={seg} 
                      variant={bulkSegment === seg ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setBulkSegment(seg)}
                    >
                      {seg}
                    </Button>
                  ))}
                </div>
                <Input 
                  placeholder="Or type custom segment..." 
                  value={bulkSegment}
                  onChange={(e) => setBulkSegment(e.target.value)}
                />
                <Button onClick={handleBulkSegmentChange} className="w-full" disabled={!bulkSegment.trim()}>
                  Apply to {selectedIds.size} people
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={householdDialogOpen} onOpenChange={setHouseholdDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/20 gap-1 md:gap-2 px-2 md:px-3">
                <Users className="h-4 w-4" /> <span className="hidden sm:inline">Household</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link to Household</DialogTitle>
                <DialogDescription>
                  Group {selectedIds.size} selected people into a household for de-duplicated mailings
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {households.length > 0 && (
                  <div className="space-y-2">
                    <Label>Add to Existing Household</Label>
                    <div className="flex gap-2 flex-wrap">
                      {households.map(h => (
                        <Button 
                          key={h.id}
                          variant={selectedHouseholdId === h.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setSelectedHouseholdId(h.id);
                            setHouseholdName("");
                          }}
                        >
                          <Home className="h-3 w-3 mr-1" /> {h.name}
                        </Button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground my-2">
                      <div className="h-px flex-1 bg-border" />
                      <span>or create new</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="householdName">Household Name</Label>
                    <Input
                      id="householdName"
                      placeholder="e.g., Cohen-Davis Household"
                      value={householdName}
                      onChange={(e) => {
                        setHouseholdName(e.target.value);
                        setSelectedHouseholdId(null);
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="householdAddress">Mailing Address (optional)</Label>
                    <Input
                      id="householdAddress"
                      placeholder="123 Main St, City, ST 12345"
                      value={householdAddress}
                      onChange={(e) => setHouseholdAddress(e.target.value)}
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleLinkToHousehold} 
                  className="w-full"
                  disabled={!selectedHouseholdId && !householdName.trim()}
                >
                  {selectedHouseholdId ? "Add to Household" : "Create Household"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/20 gap-1 md:gap-2 px-2 md:px-3" onClick={handleExportSelected}>
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">Export</span>
          </Button>
          
          <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/20 gap-1 md:gap-2 px-2 md:px-3" onClick={handleBulkDelete}>
            <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Delete</span>
          </Button>
          
          <div className="h-6 w-px bg-primary-foreground/30" />
          
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8" onClick={clearSelection}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </Layout>
  );
}
