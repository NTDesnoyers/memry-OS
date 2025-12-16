import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Send, Mail, Home, Users, Eye, Trash2, Edit, Building2, DollarSign, Bed, Bath, MapPin } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { type Listing, type Person, type InsertListing } from "@shared/schema";
import { PersonProfileDrawer } from "@/components/person-profile-drawer";

export default function HavesWants() {
  const queryClient = useQueryClient();
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [listingDialogOpen, setListingDialogOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);

  const { data: listings = [], isLoading: listingsLoading } = useQuery<Listing[]>({
    queryKey: ["/api/listings"],
  });

  const { data: buyers = [], isLoading: buyersLoading } = useQuery<Person[]>({
    queryKey: ["/api/buyers"],
  });

  const { data: realtors = [], isLoading: realtorsLoading } = useQuery<Person[]>({
    queryKey: ["/api/realtors/newsletter"],
  });

  const { data: allPeople = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  const createListingMutation = useMutation({
    mutationFn: async (listing: InsertListing) => {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(listing),
      });
      if (!res.ok) throw new Error("Failed to create listing");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      setListingDialogOpen(false);
      setEditingListing(null);
    },
  });

  const updateListingMutation = useMutation({
    mutationFn: async ({ id, ...listing }: { id: string } & Partial<InsertListing>) => {
      const res = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(listing),
      });
      if (!res.ok) throw new Error("Failed to update listing");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      setListingDialogOpen(false);
      setEditingListing(null);
    },
  });

  const deleteListingMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete listing");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
    },
  });

  const openPersonProfile = (personId: string) => {
    setSelectedPersonId(personId);
    setProfileOpen(true);
  };

  const formatPrice = (price: number | null | undefined) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
  };

  const activeListings = listings.filter(l => l.isActive);
  const realtorCount = realtors.length;
  const buyerCount = buyers.length;

  const handleListingSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const listing: InsertListing = {
      address: formData.get("address") as string,
      price: parseInt(formData.get("price") as string) || undefined,
      beds: parseInt(formData.get("beds") as string) || undefined,
      baths: parseInt(formData.get("baths") as string) || undefined,
      sqft: parseInt(formData.get("sqft") as string) || undefined,
      propertyType: formData.get("propertyType") as string || undefined,
      description: formData.get("description") as string || undefined,
      listingType: formData.get("listingType") as string || undefined,
      mlsNumber: formData.get("mlsNumber") as string || undefined,
      isActive: true,
    };

    if (editingListing) {
      updateListingMutation.mutate({ id: editingListing.id, ...listing });
    } else {
      createListingMutation.mutate(listing);
    }
  };

  return (
    <Layout>
      <PersonProfileDrawer 
        personId={selectedPersonId} 
        open={profileOpen} 
        onClose={() => setProfileOpen(false)} 
      />
      
      <div className="min-h-screen bg-secondary/30">
        <div className="container mx-auto px-4 py-8 max-w-[1400px]">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary">Haves & Wants</h1>
              <p className="text-muted-foreground">Weekly newsletter for your realtor network</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" data-testid="button-preview-email">
                <Eye className="h-4 w-4" /> Preview Email
              </Button>
              <Button className="gap-2" data-testid="button-send-newsletter">
                <Send className="h-4 w-4" /> Send Newsletter
              </Button>
            </div>
          </header>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Home className="h-6 w-6 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{activeListings.length}</p>
                    <p className="text-sm text-muted-foreground">Active Listings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Users className="h-6 w-6 text-green-700" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{buyerCount}</p>
                    <p className="text-sm text-muted-foreground">Active Buyers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Mail className="h-6 w-6 text-purple-700" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{realtorCount}</p>
                    <p className="text-sm text-muted-foreground">Newsletter Recipients</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="haves" className="w-full">
            <TabsList className="bg-card/50 backdrop-blur-sm">
              <TabsTrigger value="haves">Haves (Listings)</TabsTrigger>
              <TabsTrigger value="wants">Wants (Buyers)</TabsTrigger>
              <TabsTrigger value="recipients">Recipients</TabsTrigger>
              <TabsTrigger value="history">Email History</TabsTrigger>
            </TabsList>

            <TabsContent value="haves" className="space-y-6 mt-6">
              <Card className="border-none shadow-md">
                <CardHeader className="bg-blue-50 pb-4 border-b border-blue-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="font-serif text-blue-800">Your Listings</CardTitle>
                      <CardDescription>Properties you have available for the newsletter</CardDescription>
                    </div>
                    <Dialog open={listingDialogOpen} onOpenChange={(open) => { setListingDialogOpen(open); if (!open) setEditingListing(null); }}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-2" data-testid="button-add-listing">
                          <Plus className="h-4 w-4" /> Add Listing
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>{editingListing ? "Edit Listing" : "Add New Listing"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleListingSubmit} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="address">Address *</Label>
                            <Input id="address" name="address" required defaultValue={editingListing?.address || ""} data-testid="input-address" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="price">Price</Label>
                              <Input id="price" name="price" type="number" defaultValue={editingListing?.price || ""} data-testid="input-price" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="listingType">Type</Label>
                              <Select name="listingType" defaultValue={editingListing?.listingType || ""}>
                                <SelectTrigger data-testid="select-listing-type">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="exclusive">Exclusive</SelectItem>
                                  <SelectItem value="pocket">Pocket Listing</SelectItem>
                                  <SelectItem value="coming_soon">Coming Soon</SelectItem>
                                  <SelectItem value="active">Active MLS</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="beds">Beds</Label>
                              <Input id="beds" name="beds" type="number" defaultValue={editingListing?.beds || ""} data-testid="input-beds" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="baths">Baths</Label>
                              <Input id="baths" name="baths" type="number" defaultValue={editingListing?.baths || ""} data-testid="input-baths" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="sqft">Sq Ft</Label>
                              <Input id="sqft" name="sqft" type="number" defaultValue={editingListing?.sqft || ""} data-testid="input-sqft" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="propertyType">Property Type</Label>
                              <Select name="propertyType" defaultValue={editingListing?.propertyType || ""}>
                                <SelectTrigger data-testid="select-property-type">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="single_family">Single Family</SelectItem>
                                  <SelectItem value="condo">Condo</SelectItem>
                                  <SelectItem value="townhouse">Townhouse</SelectItem>
                                  <SelectItem value="multi_family">Multi-Family</SelectItem>
                                  <SelectItem value="land">Land</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="mlsNumber">MLS #</Label>
                              <Input id="mlsNumber" name="mlsNumber" defaultValue={editingListing?.mlsNumber || ""} data-testid="input-mls" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" name="description" rows={3} defaultValue={editingListing?.description || ""} data-testid="input-description" />
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => { setListingDialogOpen(false); setEditingListing(null); }}>Cancel</Button>
                            <Button type="submit" data-testid="button-save-listing">
                              {editingListing ? "Update" : "Add"} Listing
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {listingsLoading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading listings...</div>
                  ) : listings.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Home className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>No listings yet</p>
                      <p className="text-sm mt-1">Add your first listing to include in the newsletter</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Address</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Beds/Baths</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {listings.map((listing) => (
                          <TableRow key={listing.id} data-testid={`row-listing-${listing.id}`}>
                            <TableCell className="font-medium">{listing.address}</TableCell>
                            <TableCell>{formatPrice(listing.price)}</TableCell>
                            <TableCell>{listing.beds || "-"} / {listing.baths || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{listing.listingType || "Active"}</Badge>
                            </TableCell>
                            <TableCell>
                              {listing.isActive ? (
                                <Badge className="bg-green-100 text-green-800">Active</Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => { setEditingListing(listing); setListingDialogOpen(true); }}
                                  data-testid={`button-edit-listing-${listing.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => deleteListingMutation.mutate(listing.id)}
                                  data-testid={`button-delete-listing-${listing.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="wants" className="space-y-6 mt-6">
              <Card className="border-none shadow-md">
                <CardHeader className="bg-green-50 pb-4 border-b border-green-100">
                  <div>
                    <CardTitle className="font-serif text-green-800">Active Buyers</CardTitle>
                    <CardDescription>Buyers looking for properties (from your contacts marked as buyers)</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {buyersLoading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading buyers...</div>
                  ) : buyers.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>No buyers yet</p>
                      <p className="text-sm mt-1">Mark contacts as buyers in the People section to see them here</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Budget</TableHead>
                          <TableHead>Beds/Baths</TableHead>
                          <TableHead>Areas</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {buyers.map((buyer) => (
                          <TableRow 
                            key={buyer.id} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => openPersonProfile(buyer.id)}
                            data-testid={`row-buyer-${buyer.id}`}
                          >
                            <TableCell className="font-medium text-primary hover:underline">{buyer.name}</TableCell>
                            <TableCell>
                              {buyer.buyerPriceMin || buyer.buyerPriceMax ? (
                                `${formatPrice(buyer.buyerPriceMin)} - ${formatPrice(buyer.buyerPriceMax)}`
                              ) : (
                                <span className="text-muted-foreground">Not set</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {buyer.buyerBeds || "-"} / {buyer.buyerBaths || "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {buyer.buyerAreas?.slice(0, 2).map((area, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">{area}</Badge>
                                ))}
                                {(buyer.buyerAreas?.length || 0) > 2 && (
                                  <Badge variant="outline" className="text-xs">+{buyer.buyerAreas!.length - 2}</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                buyer.buyerStatus === "hot" ? "bg-red-100 text-red-800" :
                                buyer.buyerStatus === "warm" ? "bg-orange-100 text-orange-800" :
                                "bg-gray-100 text-gray-800"
                              }>
                                {buyer.buyerStatus || "Active"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recipients" className="space-y-6 mt-6">
              <Card className="border-none shadow-md">
                <CardHeader className="bg-purple-50 pb-4 border-b border-purple-100">
                  <div>
                    <CardTitle className="font-serif text-purple-800">Newsletter Recipients</CardTitle>
                    <CardDescription>Realtors who will receive your weekly Haves & Wants email</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {realtorsLoading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading recipients...</div>
                  ) : realtors.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>No recipients yet</p>
                      <p className="text-sm mt-1">Mark contacts as realtors and enable newsletter in the People section</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Brokerage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {realtors.map((realtor) => (
                          <TableRow 
                            key={realtor.id} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => openPersonProfile(realtor.id)}
                            data-testid={`row-realtor-${realtor.id}`}
                          >
                            <TableCell className="font-medium text-primary hover:underline">{realtor.name}</TableCell>
                            <TableCell>{realtor.email || <span className="text-muted-foreground">No email</span>}</TableCell>
                            <TableCell>{realtor.realtorBrokerage || <span className="text-muted-foreground">-</span>}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-6 mt-6">
              <Card className="border-none shadow-md">
                <CardHeader className="bg-gray-50 pb-4 border-b border-gray-100">
                  <CardTitle className="font-serif">Email History</CardTitle>
                  <CardDescription>Past newsletters you've sent</CardDescription>
                </CardHeader>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No emails sent yet</p>
                  <p className="text-sm mt-1">Your sent newsletters will appear here</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
