import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Mail, MapPin, Building2, Users, Briefcase, Heart, Star, Home, DollarSign, Bed, Bath, X } from "lucide-react";
import { type Person } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface PersonProfileDrawerProps {
  personId: string | null;
  open: boolean;
  onClose: () => void;
}

export function PersonProfileDrawer({ personId, open, onClose }: PersonProfileDrawerProps) {
  const { data: person, isLoading } = useQuery<Person>({
    queryKey: ["/api/people", personId],
    queryFn: async () => {
      const res = await fetch(`/api/people/${personId}`);
      if (!res.ok) throw new Error("Failed to fetch person");
      return res.json();
    },
    enabled: !!personId && open,
  });

  const formatPrice = (price: number | null | undefined) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-serif text-xl">
              {isLoading ? "Loading..." : person?.name || "Contact Profile"}
            </SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-profile">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : person ? (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-serif font-bold text-xl">
                {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold" data-testid="text-person-name">
                  {person.name}
                  {person.nickname && <span className="text-muted-foreground font-normal"> ({person.nickname})</span>}
                </h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  {person.role && <Badge variant="secondary">{person.role}</Badge>}
                  {person.segment && <Badge variant="outline">{person.segment}</Badge>}
                  {person.isBuyer && <Badge className="bg-blue-100 text-blue-800">Buyer</Badge>}
                  {person.isRealtor && <Badge className="bg-purple-100 text-purple-800">Realtor</Badge>}
                  {person.buyerStatus && <Badge className="bg-orange-100 text-orange-800">{person.buyerStatus}</Badge>}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {person.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${person.phone}`} className="text-primary hover:underline" data-testid="link-phone">{person.phone}</a>
                </div>
              )}
              {person.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${person.email}`} className="text-primary hover:underline" data-testid="link-email">{person.email}</a>
                </div>
              )}
              {person.realtorBrokerage && (
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{person.realtorBrokerage}</span>
                </div>
              )}
            </div>

            <Separator />

            <Tabs defaultValue="ford" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ford">FORD</TabsTrigger>
                <TabsTrigger value="buyer">Buyer Profile</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="ford" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4" /> Family
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{person.fordFamily || "No information recorded"}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Briefcase className="h-4 w-4" /> Occupation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{person.fordOccupation || "No information recorded"}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Heart className="h-4 w-4" /> Recreation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{person.fordRecreation || "No information recorded"}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Star className="h-4 w-4" /> Dreams
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{person.fordDreams || "No information recorded"}</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="buyer" className="space-y-4 mt-4">
                {person.isBuyer ? (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <DollarSign className="h-4 w-4" /> Budget
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-semibold">
                          {formatPrice(person.buyerPriceMin)} - {formatPrice(person.buyerPriceMax)}
                        </p>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Bed className="h-4 w-4" /> Beds
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-lg font-semibold">{person.buyerBeds || "Any"}+</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Bath className="h-4 w-4" /> Baths
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-lg font-semibold">{person.buyerBaths || "Any"}+</p>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <MapPin className="h-4 w-4" /> Areas
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {person.buyerAreas?.length ? (
                            person.buyerAreas.map((area, i) => (
                              <Badge key={i} variant="outline">{area}</Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">No areas specified</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Home className="h-4 w-4" /> Property Types
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {person.buyerPropertyTypes?.length ? (
                            person.buyerPropertyTypes.map((type, i) => (
                              <Badge key={i} variant="outline">{type}</Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">Any type</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Must-Haves</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {person.buyerMustHaves?.length ? (
                            person.buyerMustHaves.map((item, i) => (
                              <Badge key={i} className="bg-green-100 text-green-800">{item}</Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">No must-haves specified</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {person.buyerNotes && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Buyer Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{person.buyerNotes}</p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Home className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Not marked as a buyer</p>
                    <p className="text-sm mt-1">Edit this contact to add buyer criteria</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notes" className="mt-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {person.notes || "No notes recorded for this contact"}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Person not found
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
