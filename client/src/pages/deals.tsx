import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, DollarSign, Home, ArrowRight } from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";

const deals = [
  { id: 1, address: "123 Maple Ave", client: "Alice Johnson", type: "Buy", price: "$450,000", status: "Under Contract", closeDate: "Dec 15" },
  { id: 2, address: "456 Oak St", client: "Bob Smith", type: "Sell", price: "$625,000", status: "Active", closeDate: "TBD" },
  { id: 3, address: "789 Pine Ln", client: "Carol Danvers", type: "Buy", price: "$350,000", status: "Closed", closeDate: "Nov 30" },
];

export default function Deals() {
  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30 relative">
        <div 
          className="fixed inset-0 opacity-40 mix-blend-multiply pointer-events-none -z-10"
          style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover' }}
        />
        
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <header className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary">Deals</h1>
              <p className="text-muted-foreground">Pipeline & Transaction Management</p>
            </div>
            <Button className="gap-2 shadow-md">
              <Home className="h-4 w-4" /> New Deal
            </Button>
          </header>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="border-none shadow-sm bg-card/80">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 text-blue-700 rounded-full">
                    <Home className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Listings</p>
                    <h3 className="text-2xl font-bold font-serif">2</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-card/80">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 text-green-700 rounded-full">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Under Contract</p>
                    <h3 className="text-2xl font-bold font-serif">1</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-card/80">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 text-purple-700 rounded-full">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Volume YTD</p>
                    <h3 className="text-2xl font-bold font-serif">$1.4M</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-serif font-bold">Active Pipeline</h2>
            {deals.map((deal) => (
              <Card key={deal.id} className="border-none shadow-sm hover:shadow-md transition-all bg-card/80 backdrop-blur-sm cursor-pointer group">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={
                      `h-12 w-12 rounded-lg flex items-center justify-center font-bold text-lg
                      ${deal.type === 'Buy' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`
                    }>
                      {deal.type[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{deal.address}</h3>
                      <p className="text-sm text-muted-foreground">{deal.client}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Price</p>
                      <p className="font-medium">{deal.price}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Target Close</p>
                      <p className="font-medium">{deal.closeDate}</p>
                    </div>
                    <Badge className={
                      deal.status === 'Under Contract' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-none' :
                      deal.status === 'Closed' ? 'bg-green-100 text-green-800 hover:bg-green-200 border-none' :
                      'bg-blue-100 text-blue-800 hover:bg-blue-200 border-none'
                    }>{deal.status}</Badge>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
