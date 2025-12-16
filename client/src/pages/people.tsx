import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Filter, Phone, Mail, MessageSquare, MapPin } from "lucide-react";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";

// Mock Data
const people = [
  { id: 1, firstName: "Alice", lastName: "Johnson", status: "Hot", type: "Buyer", lastInteraction: "2 days ago", tags: ["First-time", "Referral"] },
  { id: 2, firstName: "Bob", lastName: "Smith", status: "Warm", type: "Seller", lastInteraction: "1 week ago", tags: ["Upsize", "Ninja"] },
  { id: 3, firstName: "Carol", lastName: "Danvers", status: "Nurture", type: "Past Client", lastInteraction: "3 weeks ago", tags: ["Investor"] },
  { id: 4, firstName: "David", lastName: "Goggins", status: "Hot", type: "Referral Partner", lastInteraction: "Yesterday", tags: ["Lender"] },
  { id: 5, firstName: "Eve", lastName: "Polastri", status: "Nurture", type: "Personal", lastInteraction: "1 month ago", tags: ["Friend"] },
];

export default function People() {
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
            <Button className="gap-2 shadow-md">
              <Plus className="h-4 w-4" /> Add Person
            </Button>
          </header>

          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search people..." className="pl-9 bg-background/80" />
            </div>
            <Button variant="outline" className="gap-2 bg-background/80">
              <Filter className="h-4 w-4" /> Filter
            </Button>
          </div>

          <div className="grid gap-4">
            {people.map((person) => (
              <Card key={person.id} className="border-none shadow-sm hover:shadow-md transition-all bg-card/80 backdrop-blur-sm group cursor-pointer">
                <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {person.firstName[0]}{person.lastName[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{person.firstName} {person.lastName}</h3>
                      <div className="flex gap-2 items-center text-sm text-muted-foreground">
                        <Badge variant="secondary" className="font-normal">{person.type}</Badge>
                        <span>•</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Denver, CO</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
                    <div className="flex gap-2">
                       {person.tags.map(tag => (
                         <Badge key={tag} variant="outline" className="text-xs bg-background/50">{tag}</Badge>
                       ))}
                    </div>
                    
                    <div className="flex items-center gap-3 border-l pl-4 border-border/50">
                      <div className="text-right mr-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Status</p>
                        <Badge className={
                          person.status === "Hot" ? "bg-red-100 text-red-700 hover:bg-red-200 border-none" :
                          person.status === "Warm" ? "bg-orange-100 text-orange-700 hover:bg-orange-200 border-none" :
                          "bg-blue-100 text-blue-700 hover:bg-blue-200 border-none"
                        }>{person.status}</Badge>
                      </div>
                      <div className="text-right">
                         <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Last Contact</p>
                         <span className="text-sm font-medium">{person.lastInteraction}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-8 w-8"><Phone className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8"><Mail className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8"><MessageSquare className="h-4 w-4" /></Button>
                    </div>
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
