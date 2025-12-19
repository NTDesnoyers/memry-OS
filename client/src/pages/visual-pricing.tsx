import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, BarChart3, PieChart, TrendingUp, FileText, Printer, Home, ArrowRight, ChevronRight, DollarSign, Calculator, Target, FileSpreadsheet, User, Building2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Cell, ReferenceLine, Line, ComposedChart, Legend } from "recharts";
import { type PricingReview, type MLSProperty, type Person } from "@shared/schema";
import Papa from "papaparse";

function calculateLinearRegression(data: { x: number; y: number }[]): { slope: number; intercept: number; rSquared: number } {
  if (data.length < 2) return { slope: 0, intercept: 0, rSquared: 0 };
  
  const n = data.length;
  const sumX = data.reduce((sum, p) => sum + p.x, 0);
  const sumY = data.reduce((sum, p) => sum + p.y, 0);
  const sumXY = data.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumXX = data.reduce((sum, p) => sum + p.x * p.x, 0);
  const sumYY = data.reduce((sum, p) => sum + p.y * p.y, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  const yMean = sumY / n;
  const ssTotal = data.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
  const ssResidual = data.reduce((sum, p) => sum + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
  const rSquared = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;
  
  return { slope, intercept, rSquared };
}

// Calculate nice round tick values for axis display
function calculateNiceTicks(min: number, max: number, targetTickCount: number = 6): { ticks: number[]; niceMin: number; niceMax: number } {
  if (min === max) return { ticks: [min], niceMin: min, niceMax: max };
  
  const range = max - min;
  const roughStep = range / (targetTickCount - 1);
  
  // Find a "nice" step size (1, 2, 5, 10, 20, 50, 100, etc.)
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalizedStep = roughStep / magnitude;
  
  let niceStep: number;
  if (normalizedStep <= 1) niceStep = 1 * magnitude;
  else if (normalizedStep <= 2) niceStep = 2 * magnitude;
  else if (normalizedStep <= 5) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;
  
  // Round min down and max up to nice values
  const niceMin = Math.floor(min / niceStep) * niceStep;
  const niceMax = Math.ceil(max / niceStep) * niceStep;
  
  // Generate ticks
  const ticks: number[] = [];
  for (let tick = niceMin; tick <= niceMax; tick += niceStep) {
    ticks.push(tick);
  }
  
  return { ticks, niceMin, niceMax };
}

function parseCSVRow(headers: string[], row: Record<string, string>): MLSProperty | null {
  const prop: any = {};
  
  for (const [key, value] of Object.entries(row)) {
    const header = key.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const val = (value || '').trim();
    if (!val) continue;
    
    // MLS Number - many variations
    if (!prop.mlsNumber && (header.includes('mls') || header.startsWith('listing') || header === 'id' || header === 'listno')) {
      prop.mlsNumber = val;
    }
    // Status
    else if (!prop.status && header.includes('status') && !header.includes('change')) {
      prop.status = val;
    }
    // Address - full street or just address
    else if (!prop.address && (header.includes('address') || header.includes('street') || header === 'fulladdress' || header === 'property')) {
      prop.address = val;
    }
    // City
    else if (!prop.city && header === 'city') {
      prop.city = val;
    }
    // Subdivision/Neighborhood
    else if (!prop.subdivision && (header.includes('subdivision') || header.includes('neighborhood') || header.includes('community') || header.includes('area'))) {
      prop.subdivision = val;
    }
    // Square Footage - many variations in Bright MLS
    // Check for sqft patterns (handles spaces: "sq ft", "sqft", "sf", "square feet", etc.)
    const isSqftHeader = header.includes('sqft') || header.includes('sq ft') || header.includes('sf') || 
                         header.includes('square') || header.includes('sqfeet') || header === 'gla' || 
                         header.includes('grossliving') || header.includes('living area');
    const isAboveGrade = header.includes('above') || header.includes('abv') || header.includes('agla');
    const isFinished = header.includes('finished') && !header.includes('above');
    const isTotalSqft = header.includes('total') || header.includes('ttl') || header.includes('gross') ||
                        header.includes('living') || header === 'gla';
    
    if (isSqftHeader) {
      const sqftValue = parseInt(val.replace(/[^0-9]/g, '')) || undefined;
      if (sqftValue && sqftValue > 0) {
        if (isAboveGrade && !prop.aboveGradeSqft) {
          prop.aboveGradeSqft = sqftValue;
        } else if (isFinished && !prop.finishedSqft) {
          prop.finishedSqft = sqftValue;
        } else if (!prop.totalSqft) {
          prop.totalSqft = sqftValue;
        }
      }
    }
    // Frontage (lot frontage, road frontage, water frontage)
    if (!prop.frontage && (header.includes('frontage') || header.includes('front ft'))) {
      prop.frontage = parseFloat(val.replace(/[^0-9.]/g, '')) || undefined;
    }
    // Bedrooms (not in else-if chain since sqft is separate)
    if (!prop.beds && (header === 'beds' || header.includes('bedroom') || header === 'br' || header === 'bedrooms' || header === 'bed')) {
      prop.beds = parseInt(val) || undefined;
    }
    // Bathrooms
    else if (!prop.baths && (header.includes('bath') || header === 'ba' || header === 'baths' || header.includes('fullbath') || header.includes('totalbath'))) {
      prop.baths = parseFloat(val) || undefined;
    }
    // Acres/Lot
    else if (!prop.acres && (header.includes('acre') || header.includes('lot'))) {
      prop.acres = parseFloat(val) || undefined;
    }
    // Year Built
    else if (!prop.yearBuilt && (header.includes('year') || header === 'built' || header === 'yrbuilt')) {
      prop.yearBuilt = parseInt(val) || undefined;
    }
    // Style/Type
    else if (!prop.style && (header === 'style' || header === 'type' || header === 'propertytype' || header === 'proptype')) {
      prop.style = val;
    }
    // List Price - many variations
    else if (!prop.listPrice && (header === 'listprice' || header === 'lp' || header === 'askingprice' || header.includes('listprice') || 
               (header.includes('list') && header.includes('price')))) {
      prop.listPrice = parseInt(val.replace(/[^0-9.]/g, '')) || undefined;
    }
    // Close/Sold Price
    else if (!prop.closePrice && (header.includes('close') || header.includes('sold') || header.includes('sale') || header === 'sp' || 
               header === 'soldprice' || header === 'closeprice' || header === 'saleprice' || header.includes('settlement'))) {
      if (header.includes('price') || header === 'sp' || header === 'soldprice' || header === 'closeprice' || header === 'saleprice') {
        prop.closePrice = parseInt(val.replace(/[^0-9.]/g, '')) || undefined;
      }
    }
    // DOM (Days on Market)
    else if (!prop.dom && (header === 'dom' || header === 'cdom' || header.includes('dayson') || header.includes('daysmarket') || 
               header === 'markettime' || header.includes('cumulative'))) {
      prop.dom = parseInt(val) || undefined;
    }
    // Original List Price
    else if (!prop.originalListPrice && header.includes('original') && header.includes('price')) {
      prop.originalListPrice = parseInt(val.replace(/[^0-9.]/g, '')) || undefined;
    }
    // List Date
    else if (!prop.listDate && header.includes('list') && header.includes('date')) {
      prop.listDate = val;
    }
    // Close/Sold Date
    else if (!prop.closeDate && ((header.includes('close') || header.includes('sold') || header.includes('settlement')) && header.includes('date'))) {
      prop.closeDate = val;
    }
    // Status Change Date
    else if (!prop.statusChangeDate && header.includes('status') && header.includes('change')) {
      prop.statusChangeDate = val;
    }
  }
  
  // Calculate price per sqft (prefer above grade sqft)
  if (prop.aboveGradeSqft && prop.closePrice) {
    prop.pricePerSqft = Math.round(prop.closePrice / prop.aboveGradeSqft);
  } else if (prop.totalSqft && prop.closePrice) {
    prop.pricePerSqft = Math.round(prop.closePrice / prop.totalSqft);
  }
  
  // Only return if we have at least an MLS number or address
  if (prop.mlsNumber || prop.address) {
    return prop as MLSProperty;
  }
  return null;
}

function parseMLSData(csvData: Papa.ParseResult<Record<string, string>>): MLSProperty[] {
  if (!csvData.data || csvData.data.length === 0) return [];
  
  const headers = csvData.meta.fields || [];
  console.log('CSV Headers detected:', headers);
  
  const properties: MLSProperty[] = [];
  
  for (const row of csvData.data) {
    const prop = parseCSVRow(headers, row);
    if (prop) {
      properties.push(prop);
    }
  }
  
  console.log(`Parsed ${properties.length} properties from CSV`);
  if (properties.length > 0) {
    console.log('Sample property:', properties[0]);
  }
  
  return properties;
}

function calculateMetrics(properties: MLSProperty[]) {
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
  
  const closed = properties.filter(p => p.status?.toLowerCase().includes('closed') || p.status?.toLowerCase().includes('sold'));
  const underContract = properties.filter(p => p.status?.toLowerCase().includes('contract') || p.status?.toLowerCase().includes('pending'));
  const forSale = properties.filter(p => p.status?.toLowerCase().includes('active') || p.status?.toLowerCase().includes('for sale'));
  const expired = properties.filter(p => p.status?.toLowerCase().includes('expired') || p.status?.toLowerCase().includes('withdrawn') || p.status?.toLowerCase().includes('cancelled'));
  
  const closedLast12Months = closed.filter(p => {
    if (!p.closeDate) return false;
    const closeDate = new Date(p.closeDate);
    return closeDate >= oneYearAgo;
  });
  
  const avgDOM = closed.length > 0 
    ? Math.round(closed.reduce((sum, p) => sum + (p.dom || 0), 0) / closed.length)
    : 0;
    
  const avgClosePrice = closed.length > 0
    ? Math.round(closed.reduce((sum, p) => sum + (p.closePrice || 0), 0) / closed.length)
    : 0;
  
  const monthlyRate = closedLast12Months.length / 12;
  const inventoryMonths = monthlyRate > 0 ? (forSale.length / monthlyRate) : 0;
  
  const totalActivity = closed.length + forSale.length + expired.length;
  const oddsOfSelling = totalActivity > 0 ? Math.round((closed.length / totalActivity) * 100) : 0;
  
  const stagnant = forSale.filter(p => (p.dom || 0) > avgDOM);
  
  const monthlyClosings: { [key: string]: number } = {};
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  months.forEach(m => monthlyClosings[m] = 0);
  
  closedLast12Months.forEach(p => {
    if (p.closeDate) {
      const month = new Date(p.closeDate).getMonth();
      monthlyClosings[months[month]]++;
    }
  });
  
  return {
    totalProperties: properties.length,
    closed: closed.length,
    underContract: underContract.length,
    forSale: forSale.length,
    expired: expired.length,
    stagnant: stagnant.length,
    closedLast12Months: closedLast12Months.length,
    avgDOM,
    avgClosePrice,
    monthlyRate: Math.round(monthlyRate * 10) / 10,
    inventoryMonths: Math.round(inventoryMonths * 10) / 10,
    oddsOfSelling,
    monthlyClosings,
    closedProperties: closed,
    forSaleProperties: forSale,
    underContractProperties: underContract
  };
}

export default function VisualPricing() {
  const queryClient = useQueryClient();
  const [reviewTitle, setReviewTitle] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [subjectPrice, setSubjectPrice] = useState<number>(500000);
  const [subjectSqft, setSubjectSqft] = useState<number>(2000);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedProperties, setParsedProperties] = useState<MLSProperty[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Person and property linking
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [subjectAddress, setSubjectAddress] = useState("");
  
  // Scattergram options
  type XAxisOption = 'aboveGradeSqft' | 'totalSqft' | 'finishedSqft' | 'beds' | 'baths' | 'acres' | 'frontage';
  const [scatterXAxis, setScatterXAxis] = useState<XAxisOption>('aboveGradeSqft');
  const [showTrendLine, setShowTrendLine] = useState(true);
  const [showValueBoxes, setShowValueBoxes] = useState(true);
  
  const { data: reviews = [], isLoading } = useQuery<PricingReview[]>({
    queryKey: ["/api/pricing-reviews"],
  });
  
  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });
  
  const createReviewMutation = useMutation({
    mutationFn: async (data: { title: string; neighborhood?: string; personId?: string; subjectAddress?: string; mlsData: MLSProperty[] }) => {
      const res = await fetch("/api/pricing-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          neighborhood: data.neighborhood,
          personId: data.personId || null,
          subjectAddress: data.subjectAddress || null,
          mlsData: data.mlsData,
          calculatedMetrics: calculateMetrics(data.mlsData)
        }),
      });
      if (!res.ok) throw new Error("Failed to create review");
      return res.json();
    },
    onSuccess: (newReview) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing-reviews"] });
      setCreateDialogOpen(false);
      setReviewTitle("");
      setNeighborhood("");
      setSelectedPersonId("");
      setSubjectAddress("");
      setUploadedFile(null);
      setParsedProperties([]);
      setParseError(null);
      setActiveReviewId(newReview.id);
    },
  });
  
  const activeReview = reviews.find(r => r.id === activeReviewId);
  const mlsData = (activeReview?.mlsData as MLSProperty[]) || [];
  const metrics = useMemo(() => activeReview?.calculatedMetrics as ReturnType<typeof calculateMetrics> || calculateMetrics([]), [activeReview]);
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadedFile(file);
    setParseError(null);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<Record<string, string>>) => {
        const properties = parseMLSData(results);
        if (properties.length === 0) {
          setParseError("Could not find any valid properties. Make sure your CSV has headers like MLS#, Status, Address, SqFt, Close Price, etc.");
          setParsedProperties([]);
        } else {
          setParsedProperties(properties);
          setParseError(null);
        }
      },
      error: (error: Error) => {
        setParseError(`Failed to parse CSV: ${error.message}`);
        setParsedProperties([]);
      }
    });
  };
  
  const handleCreateReview = () => {
    if (parsedProperties.length === 0) {
      setParseError("Please upload a valid CSV file first.");
      return;
    }
    createReviewMutation.mutate({
      title: reviewTitle || `${neighborhood || 'Market'} Analysis`,
      neighborhood,
      personId: selectedPersonId || undefined,
      subjectAddress: subjectAddress || undefined,
      mlsData: parsedProperties
    });
  };
  
  const scatterData = metrics.closedProperties?.map(p => ({
    dom: p.dom || 0,
    price: p.closePrice || 0,
    address: p.address
  })) || [];
  
  // X-axis option labels and getters
  const xAxisLabels: Record<XAxisOption, string> = {
    aboveGradeSqft: 'Above Ground Sq Ft',
    totalSqft: 'Total Sq Ft',
    finishedSqft: 'Finished Sq Ft',
    beds: 'Bedrooms',
    baths: 'Bathrooms',
    acres: 'Acres',
    frontage: 'Frontage'
  };
  
  const getXAxisValue = (p: MLSProperty, axis: XAxisOption): number | null => {
    switch (axis) {
      case 'aboveGradeSqft': return p.aboveGradeSqft || null;
      case 'totalSqft': return p.totalSqft || null;
      case 'finishedSqft': return p.finishedSqft || null;
      case 'beds': return p.beds || null;
      case 'baths': return p.baths || null;
      case 'acres': return p.acres || null;
      case 'frontage': return p.frontage || null;
      default: return null;
    }
  };
  
  const sqftPriceData = useMemo(() => {
    const closedProps = metrics.closedProperties || [];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    return closedProps
      .filter(p => {
        // Must have x-axis value and price
        if (getXAxisValue(p, scatterXAxis) === null || !p.closePrice) return false;
        
        // Filter to last 6 months if close date is available
        if (p.closeDate) {
          const closeDate = new Date(p.closeDate);
          if (!isNaN(closeDate.getTime()) && closeDate < sixMonthsAgo) {
            return false;
          }
        }
        return true;
      })
      .map(p => ({
        xValue: getXAxisValue(p, scatterXAxis) || 0,
        price: p.closePrice || 0,
        address: p.address || '',
        beds: p.beds,
        baths: p.baths,
        sqft: p.aboveGradeSqft || p.totalSqft,
        closeDate: p.closeDate
      }));
  }, [metrics.closedProperties, scatterXAxis]);
  
  // Calculate nice tick values for the scattergram axes
  const scatterAxisTicks = useMemo(() => {
    if (sqftPriceData.length === 0) {
      return { xTicks: [], yTicks: [], xDomain: [0, 100] as [number, number], yDomain: [0, 100000] as [number, number] };
    }
    
    const xValues = sqftPriceData.map(p => p.xValue);
    const yValues = sqftPriceData.map(p => p.price);
    
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    
    const xResult = calculateNiceTicks(minX, maxX, 6);
    const yResult = calculateNiceTicks(minY, maxY, 6);
    
    return {
      xTicks: xResult.ticks,
      yTicks: yResult.ticks,
      xDomain: [xResult.niceMin, xResult.niceMax] as [number, number],
      yDomain: [yResult.niceMin, yResult.niceMax] as [number, number]
    };
  }, [sqftPriceData]);
  
  const regressionLine = useMemo(() => {
    if (sqftPriceData.length < 2) return { data: [], slope: 0, intercept: 0, rSquared: 0 };
    
    const points = sqftPriceData.map(p => ({ x: p.xValue, y: p.price }));
    const { slope, intercept, rSquared } = calculateLinearRegression(points);
    
    // Extend the line to the nice domain boundaries
    const [minX, maxX] = scatterAxisTicks.xDomain;
    
    const lineData = [
      { xValue: minX, trendPrice: slope * minX + intercept },
      { xValue: maxX, trendPrice: slope * maxX + intercept }
    ];
    
    return { data: lineData, slope, intercept, rSquared };
  }, [sqftPriceData, scatterAxisTicks.xDomain]);
  
  const barChartData = Object.entries(metrics.monthlyClosings || {}).map(([month, count]) => ({
    month,
    count
  }));
  
  const currentMonth = new Date().getMonth();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const priceBands = useMemo(() => {
    const closedProps = metrics.closedProperties || [];
    if (closedProps.length === 0) return [];
    
    const prices = closedProps.map(p => p.closePrice || 0).filter(p => p > 0).sort((a, b) => a - b);
    if (prices.length === 0) return [];
    
    const minPrice = Math.floor(prices[0] / 50000) * 50000;
    const maxPrice = Math.ceil(prices[prices.length - 1] / 50000) * 50000;
    
    const bands: { range: string; min: number; max: number; count: number; avgDOM: number; successRate: number }[] = [];
    
    for (let start = minPrice; start < maxPrice; start += 50000) {
      const end = start + 50000;
      const inBand = closedProps.filter(p => (p.closePrice || 0) >= start && (p.closePrice || 0) < end);
      const avgDOM = inBand.length > 0 
        ? Math.round(inBand.reduce((sum, p) => sum + (p.dom || 0), 0) / inBand.length) 
        : 0;
      
      bands.push({
        range: `$${(start/1000).toFixed(0)}k - $${(end/1000).toFixed(0)}k`,
        min: start,
        max: end,
        count: inBand.length,
        avgDOM,
        successRate: inBand.length > 0 ? Math.round((inBand.length / closedProps.length) * 100) : 0
      });
    }
    
    return bands.filter(b => b.count > 0);
  }, [metrics.closedProperties]);
  
  const subjectPricePerSqft = subjectSqft > 0 ? Math.round(subjectPrice / subjectSqft) : 0;
  const marketAvgPricePerSqft = useMemo(() => {
    const closedProps = metrics.closedProperties || [];
    const withSqft = closedProps.filter(p => p.pricePerSqft && p.pricePerSqft > 0);
    if (withSqft.length === 0) return 0;
    return Math.round(withSqft.reduce((sum, p) => sum + (p.pricePerSqft || 0), 0) / withSqft.length);
  }, [metrics.closedProperties]);
  
  const subjectBand = priceBands.find(b => subjectPrice >= b.min && subjectPrice < b.max);
  const estimatedDOM = subjectBand?.avgDOM || metrics.avgDOM;

  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30">
        <div className="container mx-auto px-4 py-8 max-w-[1400px]">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary">Visual Pricing</h1>
              <p className="text-muted-foreground">Focus1st-style market analysis from MLS data</p>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-new-analysis">
                  <Plus className="h-4 w-4" /> New Analysis
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Pricing Analysis</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Analysis Title</Label>
                      <Input 
                        id="title" 
                        placeholder="e.g., Woodgate Village Analysis"
                        value={reviewTitle}
                        onChange={(e) => setReviewTitle(e.target.value)}
                        data-testid="input-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="neighborhood">Neighborhood/Area</Label>
                      <Input 
                        id="neighborhood" 
                        placeholder="e.g., Centreville"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        data-testid="input-neighborhood"
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  <p className="text-sm font-medium">Link to Person & Property (Optional)</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="person">Client/Contact</Label>
                      <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
                        <SelectTrigger data-testid="select-person">
                          <SelectValue placeholder="Select a person..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No person linked</SelectItem>
                          {people.map((person) => (
                            <SelectItem key={person.id} value={person.id}>
                              {person.firstName} {person.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subjectAddress">Subject Property Address</Label>
                      <Input 
                        id="subjectAddress" 
                        placeholder="e.g., 123 Main St, Centreville, VA"
                        value={subjectAddress}
                        onChange={(e) => setSubjectAddress(e.target.value)}
                        data-testid="input-subject-address"
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <Label>Upload MLS Export (CSV)</Label>
                    <div 
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                        uploadedFile ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="upload-area"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        data-testid="input-csv-file"
                      />
                      {uploadedFile ? (
                        <div className="space-y-2">
                          <FileSpreadsheet className="h-10 w-10 mx-auto text-primary" />
                          <p className="font-medium">{uploadedFile.name}</p>
                          {parsedProperties.length > 0 && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              {parsedProperties.length} properties found
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-10 w-10 mx-auto text-muted-foreground/50" />
                          <p className="text-muted-foreground">Click to upload CSV file</p>
                          <p className="text-xs text-muted-foreground">
                            Export from Bright MLS as CSV
                          </p>
                        </div>
                      )}
                    </div>
                    {parseError && (
                      <p className="text-sm text-red-600 flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full bg-red-100 flex items-center justify-center text-xs">!</span>
                        {parseError}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Required columns: MLS#, Status, Address, SqFt, List Price, Close Price, DOM, Close Date
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateReview} disabled={parsedProperties.length === 0} data-testid="button-create-analysis">
                      <Upload className="h-4 w-4 mr-2" /> Import & Analyze
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </header>
          
          <div className="grid lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <Card className="border-none shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Your Analyses</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="p-4 text-center text-muted-foreground">Loading...</div>
                  ) : reviews.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No analyses yet. Create one to get started.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {reviews.map((review) => {
                        const linkedPerson = review.personId ? people.find(p => p.id === review.personId) : null;
                        return (
                          <button
                            key={review.id}
                            onClick={() => setActiveReviewId(review.id)}
                            className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${activeReviewId === review.id ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                            data-testid={`button-review-${review.id}`}
                          >
                            <p className="font-medium text-sm truncate">{review.title}</p>
                            <p className="text-xs text-muted-foreground">{review.neighborhood || 'No location'}</p>
                            {linkedPerson && (
                              <p className="text-xs text-primary mt-0.5">
                                For: {linkedPerson.firstName} {linkedPerson.lastName}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-3">
              {!activeReview ? (
                <Card className="border-none shadow-md">
                  <CardContent className="py-16 text-center">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                    <h3 className="text-lg font-medium mb-2">Select or Create an Analysis</h3>
                    <p className="text-muted-foreground mb-4">Import MLS data to generate visual pricing charts</p>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" /> New Analysis
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Tabs defaultValue="overview" className="w-full">
                  {/* Linked Person & Property Header */}
                  {(activeReview.personId || activeReview.subjectAddress) && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4 flex flex-wrap items-center gap-4">
                      {activeReview.personId && people.find(p => p.id === activeReview.personId) && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">
                            Client: {people.find(p => p.id === activeReview.personId)?.firstName} {people.find(p => p.id === activeReview.personId)?.lastName}
                          </span>
                        </div>
                      )}
                      {activeReview.subjectAddress && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">
                            Property: {activeReview.subjectAddress}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  <TabsList className="bg-card/50 backdrop-blur-sm flex-wrap">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="scattergram">Scattergram</TabsTrigger>
                    <TabsTrigger value="odds">Odds of Selling</TabsTrigger>
                    <TabsTrigger value="time">Time to Close</TabsTrigger>
                    <TabsTrigger value="pattern">Buying Pattern</TabsTrigger>
                    <TabsTrigger value="pond">Real Estate Pond</TabsTrigger>
                    <TabsTrigger value="worksheet">Value Worksheet</TabsTrigger>
                    <TabsTrigger value="report">Client Report</TabsTrigger>
                    <TabsTrigger value="data">Raw Data</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-6 mt-6">
                    <div className="grid md:grid-cols-4 gap-4">
                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="pt-6">
                          <p className="text-3xl font-bold text-green-700">{metrics.closed}</p>
                          <p className="text-sm text-green-600">Closed</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="pt-6">
                          <p className="text-3xl font-bold text-blue-700">{metrics.underContract}</p>
                          <p className="text-sm text-blue-600">Under Contract</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-orange-50 border-orange-200">
                        <CardContent className="pt-6">
                          <p className="text-3xl font-bold text-orange-700">{metrics.forSale}</p>
                          <p className="text-sm text-orange-600">For Sale</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-red-50 border-red-200">
                        <CardContent className="pt-6">
                          <p className="text-3xl font-bold text-red-700">{metrics.expired}</p>
                          <p className="text-sm text-red-600">Did Not Sell</p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6 text-center">
                          <p className="text-4xl font-bold text-primary">{metrics.oddsOfSelling}%</p>
                          <p className="text-sm text-muted-foreground">Odds of Selling</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6 text-center">
                          <p className="text-4xl font-bold text-primary">{metrics.avgDOM}</p>
                          <p className="text-sm text-muted-foreground">Avg Days on Market</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6 text-center">
                          <p className="text-4xl font-bold text-primary">{metrics.inventoryMonths}</p>
                          <p className="text-sm text-muted-foreground">Months of Inventory</p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="font-serif">Market Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg">
                          Homes are selling at <strong>{metrics.monthlyRate} per month</strong>, with <strong>{metrics.inventoryMonths} months</strong> of inventory available.
                        </p>
                        <p className="text-muted-foreground mt-2">
                          The average sale price is <strong>${metrics.avgClosePrice?.toLocaleString()}</strong> with an average of <strong>{metrics.avgDOM} days</strong> on market.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="scattergram" className="mt-6">
                    <div className="grid lg:grid-cols-[280px_1fr] gap-6">
                      <Card className="h-fit">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Scattergram Options</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">X-Axis Variable</Label>
                            <RadioGroup 
                              value={scatterXAxis} 
                              onValueChange={(v) => setScatterXAxis(v as XAxisOption)}
                              className="space-y-2"
                            >
                              {(['aboveGradeSqft', 'totalSqft', 'finishedSqft', 'beds', 'baths', 'acres', 'frontage'] as XAxisOption[]).map((option) => (
                                <div key={option} className="flex items-center space-x-2">
                                  <RadioGroupItem value={option} id={option} />
                                  <Label htmlFor={option} className="text-sm font-normal cursor-pointer">
                                    {xAxisLabels[option]}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </div>
                          
                          <Separator />
                          
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Display Options</Label>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  id="showTrendLine" 
                                  checked={showTrendLine}
                                  onCheckedChange={(checked) => setShowTrendLine(checked === true)}
                                />
                                <Label htmlFor="showTrendLine" className="text-sm font-normal cursor-pointer">
                                  Show Trend (Fair Market Value) Line
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  id="showValueBoxes" 
                                  checked={showValueBoxes}
                                  onCheckedChange={(checked) => setShowValueBoxes(checked === true)}
                                />
                                <Label htmlFor="showValueBoxes" className="text-sm font-normal cursor-pointer">
                                  Show Value Labels on Hover
                                </Label>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-none shadow-md">
                        <CardHeader className="text-center">
                          <CardTitle className="font-serif text-2xl">Homes in Your Area</CardTitle>
                          <CardDescription>
                            Property Price vs. {xAxisLabels[scatterXAxis]}; {activeReview?.neighborhood || activeReview?.title}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {sqftPriceData.length > 0 ? (
                            <>
                              <div className="flex items-center justify-center gap-8 mb-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded-full bg-[#3b82f6]" />
                                  <span className="text-sm">Properties Closed</span>
                                </div>
                                {showTrendLine && (
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-1 bg-[#991b1b] rounded" />
                                    <span className="text-sm text-[#991b1b] font-medium">Fair Market Value</span>
                                  </div>
                                )}
                              </div>
                              <div className="h-[450px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <ComposedChart margin={{ top: 20, right: 30, bottom: 60, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#d0d0d0" />
                                    <XAxis 
                                      type="number" 
                                      dataKey="xValue" 
                                      domain={scatterAxisTicks.xDomain}
                                      ticks={scatterAxisTicks.xTicks}
                                      tickFormatter={(v) => {
                                        if (scatterXAxis === 'acres') return v.toFixed(2);
                                        if (scatterXAxis === 'baths') return v.toFixed(1);
                                        return v.toLocaleString();
                                      }}
                                      label={{ 
                                        value: xAxisLabels[scatterXAxis], 
                                        position: 'bottom', 
                                        offset: 40,
                                        style: { fontWeight: 'bold', fontSize: 14 }
                                      }}
                                    />
                                    <YAxis 
                                      type="number" 
                                      dataKey="price" 
                                      domain={scatterAxisTicks.yDomain}
                                      ticks={scatterAxisTicks.yTicks}
                                      tickFormatter={(v) => `$${v.toLocaleString()}`}
                                      width={100}
                                      label={{ 
                                        value: 'Property Price', 
                                        angle: -90, 
                                        position: 'insideLeft', 
                                        offset: -15,
                                        style: { fontWeight: 'bold', fontSize: 14 }
                                      }}
                                    />
                                    {showValueBoxes && (
                                      <Tooltip 
                                        content={({ active, payload }) => {
                                          if (!active || !payload || payload.length === 0) return null;
                                          const data = payload[0].payload;
                                          if (data.address) {
                                            return (
                                              <div className="bg-white border rounded-lg shadow-lg p-3">
                                                <p className="font-medium text-sm">{data.address}</p>
                                                <p className="text-sm text-muted-foreground">
                                                  {xAxisLabels[scatterXAxis]}: {
                                                    scatterXAxis === 'acres' || scatterXAxis === 'baths' 
                                                      ? data.xValue?.toFixed(2) 
                                                      : data.xValue?.toLocaleString()
                                                  }
                                                </p>
                                                {data.sqft && (
                                                  <p className="text-sm text-muted-foreground">
                                                    {data.sqft.toLocaleString()} sqft
                                                  </p>
                                                )}
                                                <p className="text-sm font-semibold text-primary">
                                                  ${data.price?.toLocaleString()}
                                                </p>
                                              </div>
                                            );
                                          }
                                          return null;
                                        }}
                                      />
                                    )}
                                    <Scatter 
                                      name="Properties" 
                                      data={sqftPriceData} 
                                      fill="#3b82f6"
                                    >
                                      {sqftPriceData.map((_, index) => (
                                        <Cell key={index} fill="#3b82f6" r={8} />
                                      ))}
                                    </Scatter>
                                    {showTrendLine && (
                                      <Line 
                                        name="Fair Market Value"
                                        data={regressionLine.data}
                                        type="linear"
                                        dataKey="trendPrice"
                                        stroke="#991b1b"
                                        strokeWidth={3}
                                        dot={false}
                                        legendType="none"
                                      />
                                    )}
                                  </ComposedChart>
                                </ResponsiveContainer>
                              </div>
                              {showTrendLine && (
                                <div className="mt-4 text-center text-sm text-muted-foreground">
                                  <p>
                                    Fair Market Value Line: ${regressionLine.slope.toFixed(2)}/{scatterXAxis.includes('Sqft') || scatterXAxis === 'frontage' ? 'unit' : xAxisLabels[scatterXAxis].toLowerCase()} 
                                    {regressionLine.intercept >= 0 ? ' + ' : ' - '}
                                    ${Math.abs(regressionLine.intercept).toLocaleString(undefined, { maximumFractionDigits: 0 })} base
                                  </p>
                                  <p className="text-xs mt-1">
                                    R² = {(regressionLine.rSquared * 100).toFixed(1)}% correlation between {xAxisLabels[scatterXAxis].toLowerCase()} and price
                                  </p>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-center py-12 text-muted-foreground">
                              <p>No properties with {xAxisLabels[scatterXAxis].toLowerCase()} data available.</p>
                              <p className="text-sm mt-2">Try selecting a different X-axis variable or upload MLS data with this field.</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="odds" className="mt-6">
                    <Card className="border-none shadow-md">
                      <CardHeader className="text-center pb-2">
                        <CardTitle className="font-serif text-2xl">The Odds of Selling Your Home</CardTitle>
                        <CardDescription>{activeReview.neighborhood || activeReview.title}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6 pt-4">
                        <div className="flex items-center justify-center gap-1">
                          <div className="bg-green-600 text-white px-6 py-4 rounded-l-lg text-center min-w-[100px]">
                            <p className="text-3xl font-bold">{metrics.closed}</p>
                            <p className="text-xs uppercase">Properties Closed</p>
                          </div>
                          <ChevronRight className="text-green-600 h-8 w-8 -mx-2 z-10" />
                          <div className="bg-teal-600 text-white px-6 py-4 text-center min-w-[100px]">
                            <p className="text-3xl font-bold">{metrics.underContract}</p>
                            <p className="text-xs uppercase">Under Contract</p>
                          </div>
                          <ChevronRight className="text-teal-600 h-8 w-8 -mx-2 z-10" />
                          <div className="bg-yellow-500 text-white px-6 py-4 text-center min-w-[100px]">
                            <p className="text-3xl font-bold">{metrics.forSale}</p>
                            <p className="text-xs uppercase">For Sale</p>
                          </div>
                          <ChevronRight className="text-yellow-500 h-8 w-8 -mx-2 z-10" />
                          <div className="bg-red-600 text-white px-6 py-4 text-center min-w-[100px]">
                            <p className="text-3xl font-bold">{metrics.expired}</p>
                            <p className="text-xs uppercase">Did Not Sell</p>
                          </div>
                          <ArrowRight className="text-muted-foreground h-8 w-8 mx-2" />
                          <div className="bg-primary text-white px-6 py-4 rounded-r-lg text-center min-w-[100px]">
                            <p className="text-3xl font-bold">{metrics.oddsOfSelling}%</p>
                            <p className="text-xs uppercase">Odds of Selling</p>
                          </div>
                        </div>
                        
                        <div className="text-center py-6 bg-muted/30 rounded-lg">
                          <p className="text-xl">
                            Homes are selling at <strong className="text-primary">{metrics.monthlyRate} per month</strong>, 
                            with <strong className="text-primary">{metrics.inventoryMonths} months</strong> of inventory available.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="time" className="mt-6">
                    <Card className="border-none shadow-md">
                      <CardHeader className="text-center">
                        <CardTitle className="font-serif text-2xl">Average Time To Close Properties</CardTitle>
                        <CardDescription>{activeReview.neighborhood || activeReview.title}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-center">
                          <p className="text-red-800">
                            The Average Days Before Closed is <strong>{metrics.avgDOM} Days</strong>, 
                            the Average Closed Price was <strong>${metrics.avgClosePrice?.toLocaleString()}</strong>.
                          </p>
                        </div>
                        <div className="h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 60 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                type="number" 
                                dataKey="dom" 
                                name="Days on Market" 
                                label={{ value: 'Days To Closed', position: 'bottom', offset: 20 }}
                                domain={[0, 'auto']}
                              />
                              <YAxis 
                                type="number" 
                                dataKey="price" 
                                name="Price" 
                                tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                                label={{ value: 'Property Price', angle: -90, position: 'insideLeft', offset: -10 }}
                              />
                              <Tooltip 
                                formatter={(value: number, name: string) => {
                                  if (name === 'Price') return [`$${value.toLocaleString()}`, 'Price'];
                                  return [value, name];
                                }}
                              />
                              <ReferenceLine x={metrics.avgDOM} stroke="#ef4444" strokeWidth={2} />
                              <Scatter data={scatterData} fill="#3b82f6">
                                {scatterData.map((entry, index) => (
                                  <Cell key={index} fill={entry.dom > metrics.avgDOM ? '#ef4444' : '#3b82f6'} />
                                ))}
                              </Scatter>
                            </ScatterChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="pattern" className="mt-6">
                    <Card className="border-none shadow-md">
                      <CardHeader className="text-center">
                        <CardTitle className="font-serif text-2xl">The Buying Pattern For Your Area</CardTitle>
                        <CardDescription>{activeReview.neighborhood || activeReview.title}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barChartData} margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="month" />
                              <YAxis allowDecimals={false} />
                              <Tooltip />
                              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {barChartData.map((entry, index) => (
                                  <Cell 
                                    key={index} 
                                    fill={months.indexOf(entry.month) <= currentMonth ? '#1e3a5f' : '#94a3b8'}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-center text-sm text-muted-foreground mt-4">
                          Number of Properties Closed per Month
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="pond" className="mt-6">
                    <Card className="border-none shadow-md">
                      <CardHeader className="text-center">
                        <CardTitle className="font-serif text-2xl">The Real Estate Pond</CardTitle>
                        <CardDescription>Supply and Demand in {activeReview.neighborhood || activeReview.title}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center justify-center gap-8">
                          <div className="text-center">
                            <div className="bg-blue-100 rounded-lg p-4 mb-2">
                              <Home className="h-12 w-12 mx-auto text-blue-600 mb-2" />
                              <p className="text-3xl font-bold text-blue-700">{Math.round(metrics.monthlyRate * 3)}</p>
                            </div>
                            <p className="text-xs uppercase text-muted-foreground">Projected New<br/>Homes in 90 Days</p>
                          </div>
                          
                          <div className="text-center">
                            <p className="text-sm uppercase text-muted-foreground mb-2">Supply and Demand</p>
                            <div className="relative w-32 h-16">
                              <div className={`absolute inset-0 flex items-center justify-center text-sm font-medium ${
                                metrics.inventoryMonths < 3 ? 'text-orange-600' : metrics.inventoryMonths > 6 ? 'text-blue-600' : 'text-gray-600'
                              }`}>
                                {metrics.inventoryMonths < 3 ? 'Favors Sellers' : metrics.inventoryMonths > 6 ? 'Favors Buyers' : 'Balanced'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <div className="bg-green-100 rounded-lg p-4 mb-2">
                              <Home className="h-12 w-12 mx-auto text-green-600 mb-2" />
                              <p className="text-3xl font-bold text-green-700">{Math.round(metrics.monthlyRate * 3)}</p>
                            </div>
                            <p className="text-xs uppercase text-muted-foreground">Projected Sold<br/>Homes in 90 Days</p>
                          </div>
                        </div>
                        
                        <div className="space-y-3 max-w-md mx-auto">
                          <div className="flex items-center gap-4 bg-blue-600 text-white rounded-lg p-4">
                            <p className="text-3xl font-bold w-12 text-center">{metrics.underContract}</p>
                            <div>
                              <p className="font-semibold text-lg">FLOWING</p>
                              <p className="text-sm opacity-80">(Under Contract)</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 bg-teal-600 text-white rounded-lg p-4">
                            <p className="text-3xl font-bold w-12 text-center">{metrics.forSale - metrics.stagnant}</p>
                            <div>
                              <p className="font-semibold text-lg">SHOWING</p>
                              <p className="text-sm opacity-80">(For Sale, Not Under Contract)</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 bg-slate-600 text-white rounded-lg p-4">
                            <p className="text-3xl font-bold w-12 text-center">{metrics.stagnant}</p>
                            <div>
                              <p className="font-semibold text-lg">STAGNANT</p>
                              <p className="text-sm opacity-80">(For Sale, Exceeded Average DOM)</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="worksheet" className="mt-6">
                    <Card className="border-none shadow-md">
                      <CardHeader className="text-center">
                        <CardTitle className="font-serif text-2xl">Value Positioning Worksheet</CardTitle>
                        <CardDescription>Calculate optimal pricing based on market data</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-8">
                          <div className="space-y-6">
                            <div className="space-y-4">
                              <Label className="text-base font-medium">Subject Property Price</Label>
                              <div className="flex items-center gap-4">
                                <DollarSign className="h-5 w-5 text-muted-foreground" />
                                <Input 
                                  type="number"
                                  value={subjectPrice}
                                  onChange={(e) => setSubjectPrice(parseInt(e.target.value) || 0)}
                                  className="text-lg font-mono"
                                  data-testid="input-subject-price"
                                />
                              </div>
                              <Slider
                                value={[subjectPrice]}
                                onValueChange={(v) => setSubjectPrice(v[0])}
                                min={100000}
                                max={2000000}
                                step={10000}
                                className="py-4"
                              />
                            </div>
                            
                            <div className="space-y-4">
                              <Label className="text-base font-medium">Subject Property Square Feet</Label>
                              <div className="flex items-center gap-4">
                                <Home className="h-5 w-5 text-muted-foreground" />
                                <Input 
                                  type="number"
                                  value={subjectSqft}
                                  onChange={(e) => setSubjectSqft(parseInt(e.target.value) || 0)}
                                  className="text-lg font-mono"
                                  data-testid="input-subject-sqft"
                                />
                              </div>
                            </div>
                            
                            <Separator />
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-muted/50 rounded-lg p-4 text-center">
                                <p className="text-2xl font-bold text-primary">${subjectPricePerSqft}</p>
                                <p className="text-sm text-muted-foreground">Your $/SqFt</p>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-4 text-center">
                                <p className="text-2xl font-bold text-primary">${marketAvgPricePerSqft}</p>
                                <p className="text-sm text-muted-foreground">Market Avg $/SqFt</p>
                              </div>
                            </div>
                            
                            <div className={`rounded-lg p-4 text-center ${
                              subjectPricePerSqft > marketAvgPricePerSqft * 1.1 ? 'bg-red-50 border border-red-200' :
                              subjectPricePerSqft < marketAvgPricePerSqft * 0.9 ? 'bg-green-50 border border-green-200' :
                              'bg-blue-50 border border-blue-200'
                            }`}>
                              <p className={`text-lg font-medium ${
                                subjectPricePerSqft > marketAvgPricePerSqft * 1.1 ? 'text-red-700' :
                                subjectPricePerSqft < marketAvgPricePerSqft * 0.9 ? 'text-green-700' :
                                'text-blue-700'
                              }`}>
                                {subjectPricePerSqft > marketAvgPricePerSqft * 1.1 ? 'Above Market - Expect Longer DOM' :
                                 subjectPricePerSqft < marketAvgPricePerSqft * 0.9 ? 'Below Market - Quick Sale Expected' :
                                 'At Market Value'}
                              </p>
                              <p className="text-sm mt-1">
                                {Math.abs(Math.round(((subjectPricePerSqft - marketAvgPricePerSqft) / marketAvgPricePerSqft) * 100))}% 
                                {subjectPricePerSqft > marketAvgPricePerSqft ? ' above' : ' below'} market average
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <h3 className="text-base font-medium flex items-center gap-2">
                              <Target className="h-5 w-5" /> Price Band Analysis
                            </h3>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                              {priceBands.map((band, i) => (
                                <div 
                                  key={i} 
                                  className={`flex items-center justify-between p-3 rounded-lg ${
                                    subjectPrice >= band.min && subjectPrice < band.max 
                                      ? 'bg-primary text-white' 
                                      : 'bg-muted/30 hover:bg-muted/50'
                                  }`}
                                >
                                  <div>
                                    <p className="font-medium">{band.range}</p>
                                    <p className={`text-xs ${subjectPrice >= band.min && subjectPrice < band.max ? 'text-white/80' : 'text-muted-foreground'}`}>
                                      {band.count} sold
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold">{band.avgDOM} days</p>
                                    <p className={`text-xs ${subjectPrice >= band.min && subjectPrice < band.max ? 'text-white/80' : 'text-muted-foreground'}`}>
                                      avg DOM
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {subjectBand && (
                              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mt-4">
                                <p className="text-center">
                                  At <strong>${subjectPrice.toLocaleString()}</strong>, expect approximately 
                                  <strong className="text-primary"> {estimatedDOM} days</strong> on market
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="report" className="mt-6">
                    <Card className="border-none shadow-md print:shadow-none">
                      <CardHeader className="text-center border-b pb-6">
                        <div className="flex justify-end mb-4 print:hidden">
                          <Button onClick={() => window.print()} variant="outline" className="gap-2">
                            <Printer className="h-4 w-4" /> Print Report
                          </Button>
                        </div>
                        <CardTitle className="font-serif text-3xl">Market Analysis Report</CardTitle>
                        <CardDescription className="text-lg">{activeReview.neighborhood || activeReview.title}</CardDescription>
                        <p className="text-sm text-muted-foreground mt-2">
                          Prepared on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-8 pt-8">
                        <section>
                          <h2 className="font-serif text-xl font-bold mb-4 border-b pb-2">Market Overview</h2>
                          <div className="grid grid-cols-4 gap-4 text-center">
                            <div className="bg-green-50 rounded-lg p-4">
                              <p className="text-3xl font-bold text-green-700">{metrics.closed}</p>
                              <p className="text-sm text-green-600">Closed</p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-4">
                              <p className="text-3xl font-bold text-blue-700">{metrics.underContract}</p>
                              <p className="text-sm text-blue-600">Under Contract</p>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-4">
                              <p className="text-3xl font-bold text-orange-700">{metrics.forSale}</p>
                              <p className="text-sm text-orange-600">For Sale</p>
                            </div>
                            <div className="bg-red-50 rounded-lg p-4">
                              <p className="text-3xl font-bold text-red-700">{metrics.expired}</p>
                              <p className="text-sm text-red-600">Did Not Sell</p>
                            </div>
                          </div>
                        </section>
                        
                        <section>
                          <h2 className="font-serif text-xl font-bold mb-4 border-b pb-2">Key Metrics</h2>
                          <div className="grid grid-cols-3 gap-6">
                            <div className="text-center">
                              <p className="text-4xl font-bold text-primary">{metrics.oddsOfSelling}%</p>
                              <p className="text-muted-foreground">Odds of Selling</p>
                              <p className="text-xs text-muted-foreground mt-1">Based on closed vs expired</p>
                            </div>
                            <div className="text-center">
                              <p className="text-4xl font-bold text-primary">{metrics.avgDOM}</p>
                              <p className="text-muted-foreground">Average Days on Market</p>
                              <p className="text-xs text-muted-foreground mt-1">For closed properties</p>
                            </div>
                            <div className="text-center">
                              <p className="text-4xl font-bold text-primary">{metrics.inventoryMonths}</p>
                              <p className="text-muted-foreground">Months of Inventory</p>
                              <p className="text-xs text-muted-foreground mt-1">{metrics.inventoryMonths < 3 ? 'Seller\'s Market' : metrics.inventoryMonths > 6 ? 'Buyer\'s Market' : 'Balanced Market'}</p>
                            </div>
                          </div>
                        </section>
                        
                        <section>
                          <h2 className="font-serif text-xl font-bold mb-4 border-b pb-2">Price Analysis</h2>
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <p className="text-sm text-muted-foreground uppercase mb-2">Average Sale Price</p>
                              <p className="text-3xl font-bold">${metrics.avgClosePrice?.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground uppercase mb-2">Average Price per SqFt</p>
                              <p className="text-3xl font-bold">${marketAvgPricePerSqft}</p>
                            </div>
                          </div>
                        </section>
                        
                        <section>
                          <h2 className="font-serif text-xl font-bold mb-4 border-b pb-2">Market Absorption</h2>
                          <p className="text-lg">
                            Properties in this area are selling at a rate of <strong>{metrics.monthlyRate} per month</strong>. 
                            With <strong>{metrics.forSale} active listings</strong>, the current inventory represents 
                            <strong> {metrics.inventoryMonths} months</strong> of supply.
                          </p>
                          <div className="mt-4 bg-muted/30 rounded-lg p-4">
                            <p className="font-medium">
                              {metrics.inventoryMonths < 3 
                                ? 'This is a strong seller\'s market. Properly priced homes should sell quickly with potential for multiple offers.'
                                : metrics.inventoryMonths > 6 
                                ? 'This is a buyer\'s market. Sellers should price competitively and be prepared for longer marketing times.'
                                : 'This is a balanced market. Both buyers and sellers have reasonable negotiating positions.'}
                            </p>
                          </div>
                        </section>
                        
                        <section className="print:break-before-page">
                          <h2 className="font-serif text-xl font-bold mb-4 border-b pb-2">Price Band Performance</h2>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Price Range</TableHead>
                                <TableHead className="text-center">Properties Sold</TableHead>
                                <TableHead className="text-center">Avg Days on Market</TableHead>
                                <TableHead className="text-center">% of Sales</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {priceBands.map((band, i) => (
                                <TableRow key={i}>
                                  <TableCell className="font-medium">{band.range}</TableCell>
                                  <TableCell className="text-center">{band.count}</TableCell>
                                  <TableCell className="text-center">{band.avgDOM} days</TableCell>
                                  <TableCell className="text-center">{band.successRate}%</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </section>
                        
                        <section className="bg-muted/20 rounded-lg p-6 text-center">
                          <p className="text-sm text-muted-foreground">
                            This analysis is based on {mlsData.length} properties in {activeReview.neighborhood || 'the selected area'}. 
                            Data sourced from MLS records. Past performance does not guarantee future results.
                          </p>
                        </section>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="data" className="mt-6">
                    <Card className="border-none shadow-md overflow-hidden">
                      <CardHeader>
                        <CardTitle className="font-serif">Imported MLS Data</CardTitle>
                        <CardDescription>{mlsData.length} properties</CardDescription>
                      </CardHeader>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>MLS #</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Address</TableHead>
                              <TableHead>Beds</TableHead>
                              <TableHead>Baths</TableHead>
                              <TableHead>SqFt</TableHead>
                              <TableHead>List Price</TableHead>
                              <TableHead>Close Price</TableHead>
                              <TableHead>DOM</TableHead>
                              <TableHead>$/SqFt</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {mlsData.slice(0, 50).map((prop, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-mono text-xs">{prop.mlsNumber}</TableCell>
                                <TableCell>
                                  <Badge variant={
                                    prop.status?.toLowerCase().includes('closed') ? 'default' :
                                    prop.status?.toLowerCase().includes('active') ? 'secondary' :
                                    'outline'
                                  }>
                                    {prop.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate">{prop.address}</TableCell>
                                <TableCell>{prop.beds || '-'}</TableCell>
                                <TableCell>{prop.baths || '-'}</TableCell>
                                <TableCell>{prop.aboveGradeSqft?.toLocaleString() || prop.totalSqft?.toLocaleString() || '-'}</TableCell>
                                <TableCell>${prop.listPrice?.toLocaleString() || '-'}</TableCell>
                                <TableCell className="font-medium">${prop.closePrice?.toLocaleString() || '-'}</TableCell>
                                <TableCell>{prop.dom || '-'}</TableCell>
                                <TableCell>${prop.pricePerSqft || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
