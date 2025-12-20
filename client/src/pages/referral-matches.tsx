import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Users,
  ArrowRight,
  Search,
  Loader2,
  Sparkles,
  Briefcase,
  Gift,
  HandshakeIcon,
  ExternalLink
} from "lucide-react";
import { Link } from "wouter";
import { getInitials, getSegmentColor } from "@/lib/utils";

type ReferralOpportunity = {
  id: string;
  personWithNeed: { id: string; name: string; segment: string | null };
  personWithOffer: { id: string; name: string; segment: string | null; profession: string | null };
  need: string;
  offer: string;
  matchType: "profession" | "offer";
};

function OpportunityCard({ opportunity }: { opportunity: ReferralOpportunity }) {
  return (
    <Card className="hover:shadow-md transition-shadow" data-testid={`opportunity-${opportunity.id}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Link href={`/people/${opportunity.personWithNeed.id}`}>
            <div className="flex items-center gap-2 hover:underline cursor-pointer min-w-0 flex-1">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback className={getSegmentColor(opportunity.personWithNeed.segment)}>
                  {getInitials(opportunity.personWithNeed.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{opportunity.personWithNeed.name}</p>
                <p className="text-xs text-gray-500">Needs help</p>
              </div>
            </div>
          </Link>

          <div className="flex flex-col items-center px-2">
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </div>

          <Link href={`/people/${opportunity.personWithOffer.id}`}>
            <div className="flex items-center gap-2 hover:underline cursor-pointer min-w-0 flex-1">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback className={getSegmentColor(opportunity.personWithOffer.segment)}>
                  {getInitials(opportunity.personWithOffer.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{opportunity.personWithOffer.name}</p>
                <p className="text-xs text-gray-500">Can help</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-3 pt-3 border-t flex items-start gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-1 mb-1">
              <Gift className="h-3 w-3 text-red-500" />
              <span className="text-xs font-medium text-gray-600">Need:</span>
            </div>
            <p className="text-sm text-gray-700">{opportunity.need}</p>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1 mb-1">
              {opportunity.matchType === "profession" ? (
                <Briefcase className="h-3 w-3 text-blue-500" />
              ) : (
                <HandshakeIcon className="h-3 w-3 text-green-500" />
              )}
              <span className="text-xs font-medium text-gray-600">
                {opportunity.matchType === "profession" ? "Profession:" : "Offers:"}
              </span>
            </div>
            <p className="text-sm text-gray-700">{opportunity.offer}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <Badge variant="outline" className={opportunity.matchType === "profession" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"}>
            {opportunity.matchType === "profession" ? "Professional Match" : "Offer Match"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReferralMatches() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: opportunities = [], isLoading } = useQuery<ReferralOpportunity[]>({
    queryKey: ["/api/referral-opportunities"],
  });

  const filteredOpportunities = opportunities.filter(opp => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      opp.personWithNeed.name.toLowerCase().includes(query) ||
      opp.personWithOffer.name.toLowerCase().includes(query) ||
      opp.need.toLowerCase().includes(query) ||
      opp.offer.toLowerCase().includes(query)
    );
  });

  const professionMatches = filteredOpportunities.filter(o => o.matchType === "profession");
  const offerMatches = filteredOpportunities.filter(o => o.matchType === "offer");

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-500" />
              Referral Opportunities
            </h1>
            <p className="text-gray-500 mt-1">
              Connections between people in your network based on their needs and what they offer
            </p>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, need, or offer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="search-referrals"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{opportunities.length}</div>
              <div className="text-sm text-gray-500">Total Matches</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{professionMatches.length}</div>
              <div className="text-sm text-gray-500">Professional</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{offerMatches.length}</div>
              <div className="text-sm text-gray-500">Offer Matches</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {new Set([
                  ...opportunities.map(o => o.personWithNeed.id),
                  ...opportunities.map(o => o.personWithOffer.id)
                ]).size}
              </div>
              <div className="text-sm text-gray-500">People Involved</div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-600">No referral opportunities yet</h3>
              <p className="text-gray-400 mt-1 max-w-md mx-auto">
                As you log conversations and the AI extracts needs and offers from your contacts, 
                matching opportunities will appear here automatically.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {professionMatches.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-500" />
                  Professional Matches ({professionMatches.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {professionMatches.map(opp => (
                    <OpportunityCard key={opp.id} opportunity={opp} />
                  ))}
                </div>
              </div>
            )}

            {offerMatches.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <HandshakeIcon className="h-4 w-4 text-green-500" />
                  Offer Matches ({offerMatches.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {offerMatches.map(opp => (
                    <OpportunityCard key={opp.id} opportunity={opp} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
