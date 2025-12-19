import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Home, ArrowRight, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Cell, ReferenceLine, Line, ComposedChart } from "recharts";
import { type MLSProperty } from "@shared/schema";

export function calculateLinearRegression(data: { x: number; y: number }[]): { slope: number; intercept: number; rSquared: number } {
  if (data.length < 2) return { slope: 0, intercept: 0, rSquared: 0 };
  
  const n = data.length;
  const sumX = data.reduce((sum, p) => sum + p.x, 0);
  const sumY = data.reduce((sum, p) => sum + p.y, 0);
  const sumXY = data.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumXX = data.reduce((sum, p) => sum + p.x * p.x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  const yMean = sumY / n;
  const ssTotal = data.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
  const ssResidual = data.reduce((sum, p) => sum + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
  const rSquared = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;
  
  return { slope, intercept, rSquared };
}

export function parseMLSData(rawData: string): MLSProperty[] {
  const lines = rawData.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split('\t').map(h => h.trim().toLowerCase());
  const properties: MLSProperty[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t');
    const prop: any = {};
    
    headers.forEach((header, idx) => {
      const value = values[idx]?.trim() || '';
      
      if (header.includes('mls') && header.includes('number')) prop.mlsNumber = value;
      else if (header.includes('status') && !header.includes('change')) prop.status = value;
      else if (header.includes('address') || header.includes('street')) prop.address = value;
      else if (header === 'city') prop.city = value;
      else if (header.includes('subdivision') || header.includes('neighborhood')) prop.subdivision = value;
      else if (header.includes('acre') || header.includes('lot size')) prop.acres = parseFloat(value) || undefined;
      else if (header.includes('above grade') && header.includes('sqft')) prop.aboveGradeSqft = parseInt(value) || undefined;
      else if (header.includes('total') && header.includes('sqft')) prop.totalSqft = parseInt(value) || undefined;
      else if (header === 'beds' || header.includes('bedroom')) prop.beds = parseInt(value) || undefined;
      else if (header.includes('bath')) prop.baths = parseFloat(value) || undefined;
      else if (header.includes('year') && header.includes('built')) prop.yearBuilt = parseInt(value) || undefined;
      else if (header === 'style') prop.style = value;
      else if (header === 'list price' || header.includes('list price')) prop.listPrice = parseInt(value.replace(/[$,]/g, '')) || undefined;
      else if (header.includes('original') && header.includes('price')) prop.originalListPrice = parseInt(value.replace(/[$,]/g, '')) || undefined;
      else if (header.includes('close price') || header.includes('sold price')) prop.closePrice = parseInt(value.replace(/[$,]/g, '')) || undefined;
      else if (header === 'dom' || header.includes('days on market')) prop.dom = parseInt(value) || undefined;
      else if (header.includes('list') && header.includes('date')) prop.listDate = value;
      else if (header.includes('close date') || header.includes('sold date')) prop.closeDate = value;
      else if (header.includes('status change')) prop.statusChangeDate = value;
    });
    
    if (prop.totalSqft && prop.closePrice) {
      prop.pricePerSqft = Math.round(prop.closePrice / prop.totalSqft);
    } else if (prop.aboveGradeSqft && prop.closePrice) {
      prop.pricePerSqft = Math.round(prop.closePrice / prop.aboveGradeSqft);
    }
    
    if (prop.mlsNumber || prop.address) {
      properties.push(prop as MLSProperty);
    }
  }
  
  return properties;
}

export interface VisualPricingMetrics {
  totalProperties: number;
  closed: number;
  underContract: number;
  forSale: number;
  expired: number;
  stagnant: number;
  closedLast12Months: number;
  avgDOM: number;
  avgClosePrice: number;
  monthlyRate: number;
  inventoryMonths: number;
  oddsOfSelling: number;
  monthlyClosings: { [key: string]: number };
  closedProperties: MLSProperty[];
  forSaleProperties: MLSProperty[];
  underContractProperties: MLSProperty[];
}

export function calculateMetrics(properties: MLSProperty[]): VisualPricingMetrics {
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  
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

interface VisualPricingToolsProps {
  metrics: VisualPricingMetrics;
  title: string;
  neighborhood?: string;
  mlsData?: MLSProperty[];
  defaultTab?: string;
  showTabs?: string[];
}

export function VisualPricingTools({ 
  metrics, 
  title, 
  neighborhood,
  mlsData = [],
  defaultTab = "overview",
  showTabs
}: VisualPricingToolsProps) {
  const scatterData = metrics.closedProperties?.map(p => ({
    dom: p.dom || 0,
    price: p.closePrice || 0,
    address: p.address
  })) || [];
  
  const sqftPriceData = useMemo(() => {
    const closedProps = metrics.closedProperties || [];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    return closedProps
      .filter(p => {
        // Must have sqft (prefer above grade) and price
        if (!(p.aboveGradeSqft || p.totalSqft) || !p.closePrice) return false;
        
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
        sqft: p.aboveGradeSqft || p.totalSqft || 0,
        price: p.closePrice || 0,
        address: p.address || ''
      }));
  }, [metrics.closedProperties]);
  
  const regressionLine = useMemo(() => {
    if (sqftPriceData.length < 2) return { data: [], slope: 0, intercept: 0, rSquared: 0 };
    
    const points = sqftPriceData.map(p => ({ x: p.sqft, y: p.price }));
    const { slope, intercept, rSquared } = calculateLinearRegression(points);
    
    const sqftValues = sqftPriceData.map(p => p.sqft);
    const minSqft = Math.min(...sqftValues);
    const maxSqft = Math.max(...sqftValues);
    
    const lineData = [
      { sqft: minSqft, trendPrice: slope * minSqft + intercept },
      { sqft: maxSqft, trendPrice: slope * maxSqft + intercept }
    ];
    
    return { data: lineData, slope, intercept, rSquared };
  }, [sqftPriceData]);
  
  const barChartData = Object.entries(metrics.monthlyClosings || {}).map(([month, count]) => ({
    month,
    count
  }));
  
  const currentMonth = new Date().getMonth();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const allTabs = ["overview", "scattergram", "odds", "time", "pattern", "pond", "data"];
  const visibleTabs = showTabs || allTabs;

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="bg-card/50 backdrop-blur-sm flex-wrap">
        {visibleTabs.includes("overview") && <TabsTrigger value="overview">Overview</TabsTrigger>}
        {visibleTabs.includes("scattergram") && <TabsTrigger value="scattergram">Scattergram</TabsTrigger>}
        {visibleTabs.includes("odds") && <TabsTrigger value="odds">Odds of Selling</TabsTrigger>}
        {visibleTabs.includes("time") && <TabsTrigger value="time">Time to Close</TabsTrigger>}
        {visibleTabs.includes("pattern") && <TabsTrigger value="pattern">Buying Pattern</TabsTrigger>}
        {visibleTabs.includes("pond") && <TabsTrigger value="pond">Real Estate Pond</TabsTrigger>}
        {visibleTabs.includes("data") && <TabsTrigger value="data">Raw Data</TabsTrigger>}
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
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
              <p className="text-3xl font-bold text-yellow-700">{metrics.forSale}</p>
              <p className="text-sm text-yellow-600">For Sale</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <p className="text-3xl font-bold text-red-700">{metrics.expired}</p>
              <p className="text-sm text-red-600">Did Not Sell</p>
            </CardContent>
          </Card>
        </div>
        
        <Card className="border-none shadow-md">
          <CardHeader className="text-center pb-2">
            <CardTitle className="font-serif text-xl">Market Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold text-primary">{metrics.avgDOM}</p>
                <p className="text-sm text-muted-foreground">Avg Days on Market</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold text-primary">${metrics.avgClosePrice?.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Avg Close Price</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold text-primary">{metrics.inventoryMonths}</p>
                <p className="text-sm text-muted-foreground">Months of Inventory</p>
              </div>
            </div>
            <p className="text-center text-muted-foreground mt-2">
              Homes are selling at <strong>{metrics.monthlyRate} per month</strong> with a <strong>{metrics.oddsOfSelling}%</strong> chance of selling.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="scattergram" className="mt-6">
        <ScattergramChart 
          sqftPriceData={sqftPriceData}
          regressionLine={regressionLine}
          title={title}
          neighborhood={neighborhood}
        />
      </TabsContent>
      
      <TabsContent value="odds" className="mt-6">
        <OddsOfSellingChart metrics={metrics} title={title} neighborhood={neighborhood} />
      </TabsContent>
      
      <TabsContent value="time" className="mt-6">
        <TimeToCloseChart 
          scatterData={scatterData} 
          metrics={metrics} 
          title={title} 
          neighborhood={neighborhood} 
        />
      </TabsContent>
      
      <TabsContent value="pattern" className="mt-6">
        <BuyingPatternChart 
          barChartData={barChartData} 
          currentMonth={currentMonth} 
          months={months}
          title={title}
          neighborhood={neighborhood}
        />
      </TabsContent>
      
      <TabsContent value="pond" className="mt-6">
        <RealEstatePondChart metrics={metrics} title={title} neighborhood={neighborhood} />
      </TabsContent>
      
      <TabsContent value="data" className="mt-6">
        <RawDataTable mlsData={mlsData} />
      </TabsContent>
    </Tabs>
  );
}

interface ScattergramChartProps {
  sqftPriceData: { sqft: number; price: number; address: string }[];
  regressionLine: { data: { sqft: number; trendPrice: number }[]; slope: number; intercept: number; rSquared: number };
  title: string;
  neighborhood?: string;
}

export function ScattergramChart({ sqftPriceData, regressionLine, title, neighborhood }: ScattergramChartProps) {
  return (
    <Card className="border-none shadow-md">
      <CardHeader className="text-center">
        <CardTitle className="font-serif text-2xl">Homes in Your Area</CardTitle>
        <CardDescription>
          Property Price vs. Above Ground SqFt; {neighborhood || title}
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
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-[#991b1b] rounded" />
                <span className="text-sm text-[#991b1b] font-medium">Fair Market Value</span>
              </div>
            </div>
            <div className="h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart margin={{ top: 20, right: 30, bottom: 60, left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis 
                    type="number" 
                    dataKey="sqft" 
                    domain={['dataMin - 200', 'dataMax + 200']}
                    tickFormatter={(v) => Math.round(v).toLocaleString()}
                    label={{ 
                      value: 'Above Ground SqFt', 
                      position: 'bottom', 
                      offset: 40,
                      style: { fontWeight: 'bold', fontSize: 14 }
                    }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="price" 
                    domain={['dataMin - 50000', 'dataMax + 50000']}
                    tickFormatter={(v) => `$${Math.round(v/1000).toLocaleString()}K`}
                    label={{ 
                      value: 'Property Price', 
                      angle: -90, 
                      position: 'insideLeft', 
                      offset: -10,
                      style: { fontWeight: 'bold', fontSize: 14 }
                    }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const data = payload[0].payload;
                      if (data.address) {
                        return (
                          <div className="bg-white border rounded-lg shadow-lg p-3">
                            <p className="font-medium text-sm">{data.address}</p>
                            <p className="text-sm text-muted-foreground">
                              {data.sqft?.toLocaleString()} sqft
                            </p>
                            <p className="text-sm font-semibold text-primary">
                              ${data.price?.toLocaleString()}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter 
                    name="Properties" 
                    data={sqftPriceData} 
                    fill="#3b82f6"
                  >
                    {sqftPriceData.map((_, index) => (
                      <Cell key={index} fill="#3b82f6" r={8} />
                    ))}
                  </Scatter>
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
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <p>
                Fair Market Value Line: ${regressionLine.slope.toFixed(2)}/sqft 
                {regressionLine.intercept >= 0 ? ' + ' : ' - '}
                ${Math.abs(regressionLine.intercept).toLocaleString(undefined, { maximumFractionDigits: 0 })} base
              </p>
              <p className="text-xs mt-1">
                R² = {(regressionLine.rSquared * 100).toFixed(1)}% correlation between size and price
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No properties with square footage data available in the last 6 months.</p>
            <p className="text-sm mt-2">Make sure your MLS export includes Above Grade SqFt or Total SqFt fields.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface OddsOfSellingChartProps {
  metrics: VisualPricingMetrics;
  title: string;
  neighborhood?: string;
}

export function OddsOfSellingChart({ metrics, title, neighborhood }: OddsOfSellingChartProps) {
  return (
    <Card className="border-none shadow-md">
      <CardHeader className="text-center pb-2">
        <CardTitle className="font-serif text-2xl">The Odds of Selling Your Home</CardTitle>
        <CardDescription>{neighborhood || title}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-center flex-wrap gap-0">
          <div className="bg-green-600 text-white px-6 py-4 rounded-l-lg text-center min-w-[100px]">
            <p className="text-3xl font-bold">{metrics.closed}</p>
            <p className="text-xs uppercase">Closed</p>
          </div>
          <ChevronRight className="text-green-600 h-8 w-8 -mx-2 z-10" />
          <div className="bg-blue-600 text-white px-6 py-4 text-center min-w-[100px]">
            <p className="text-3xl font-bold">{metrics.underContract}</p>
            <p className="text-xs uppercase">Under Contract</p>
          </div>
          <ChevronRight className="text-blue-600 h-8 w-8 -mx-2 z-10" />
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
  );
}

interface TimeToCloseChartProps {
  scatterData: { dom: number; price: number; address?: string }[];
  metrics: VisualPricingMetrics;
  title: string;
  neighborhood?: string;
}

export function TimeToCloseChart({ scatterData, metrics, title, neighborhood }: TimeToCloseChartProps) {
  return (
    <Card className="border-none shadow-md">
      <CardHeader className="text-center">
        <CardTitle className="font-serif text-2xl">Average Time To Close Properties</CardTitle>
        <CardDescription>{neighborhood || title}</CardDescription>
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
                tickFormatter={(v) => `$${Math.round(v/1000).toLocaleString()}K`}
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
  );
}

interface BuyingPatternChartProps {
  barChartData: { month: string; count: number }[];
  currentMonth: number;
  months: string[];
  title: string;
  neighborhood?: string;
}

export function BuyingPatternChart({ barChartData, currentMonth, months, title, neighborhood }: BuyingPatternChartProps) {
  return (
    <Card className="border-none shadow-md">
      <CardHeader className="text-center">
        <CardTitle className="font-serif text-2xl">The Buying Pattern For Your Area</CardTitle>
        <CardDescription>{neighborhood || title}</CardDescription>
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
  );
}

interface RealEstatePondChartProps {
  metrics: VisualPricingMetrics;
  title: string;
  neighborhood?: string;
}

export function RealEstatePondChart({ metrics, title, neighborhood }: RealEstatePondChartProps) {
  return (
    <Card className="border-none shadow-md">
      <CardHeader className="text-center">
        <CardTitle className="font-serif text-2xl">The Real Estate Pond</CardTitle>
        <CardDescription>Supply and Demand in {neighborhood || title}</CardDescription>
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
          <div className="flex items-center gap-4 bg-green-600 text-white rounded-lg p-4">
            <p className="text-3xl font-bold w-12 text-center">{metrics.closed}</p>
            <div>
              <p className="font-semibold text-lg">SOLD</p>
              <p className="text-sm opacity-80">(Closed)</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-yellow-500 text-white rounded-lg p-4">
            <p className="text-3xl font-bold w-12 text-center">{metrics.forSale}</p>
            <div>
              <p className="font-semibold text-lg">STAGNANT</p>
              <p className="text-sm opacity-80">(For Sale)</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface RawDataTableProps {
  mlsData: MLSProperty[];
}

export function RawDataTable({ mlsData }: RawDataTableProps) {
  if (!mlsData || mlsData.length === 0) {
    return (
      <Card className="border-none shadow-md">
        <CardContent className="py-12 text-center text-muted-foreground">
          No MLS data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-md">
      <CardHeader>
        <CardTitle>Raw MLS Data</CardTitle>
        <CardDescription>{mlsData.length} properties</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Beds</TableHead>
                <TableHead>Baths</TableHead>
                <TableHead>SqFt</TableHead>
                <TableHead>List Price</TableHead>
                <TableHead>Close Price</TableHead>
                <TableHead>DOM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mlsData.map((prop, idx) => (
                <TableRow key={prop.mlsNumber || idx}>
                  <TableCell className="font-medium max-w-[200px] truncate">{prop.address}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      prop.status?.toLowerCase().includes('closed') ? 'bg-green-50 text-green-700' :
                      prop.status?.toLowerCase().includes('active') ? 'bg-blue-50 text-blue-700' :
                      prop.status?.toLowerCase().includes('pending') ? 'bg-yellow-50 text-yellow-700' :
                      'bg-gray-50 text-gray-700'
                    }>
                      {prop.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{prop.beds || '-'}</TableCell>
                  <TableCell>{prop.baths || '-'}</TableCell>
                  <TableCell>{prop.totalSqft?.toLocaleString() || prop.aboveGradeSqft?.toLocaleString() || '-'}</TableCell>
                  <TableCell>${prop.listPrice?.toLocaleString() || '-'}</TableCell>
                  <TableCell>${prop.closePrice?.toLocaleString() || '-'}</TableCell>
                  <TableCell>{prop.dom || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
