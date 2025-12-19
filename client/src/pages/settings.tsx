import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Plug, Palette, Workflow, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import paperBg from "@assets/generated_images/subtle_paper_texture_background.png";

const settingsLinks = [
  {
    title: "Brand Center",
    description: "Manage your headshot, logos, colors, and branding assets",
    href: "/brand-center",
    icon: Palette,
  },
  {
    title: "Integrations",
    description: "Connect Fathom, Granola, Todoist, and other services",
    href: "/integrations",
    icon: Plug,
  },
  {
    title: "Automation",
    description: "Configure automated workflows and triggers",
    href: "/automation",
    icon: Workflow,
  },
];

export default function SettingsPage() {
  return (
    <Layout>
      <div 
        className="min-h-screen p-6 md:p-8"
        style={{ backgroundImage: `url(${paperBg})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Settings className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-serif font-bold">Settings</h1>
            </div>
            <p className="text-muted-foreground">
              Configure your Ninja OS preferences and integrations.
            </p>
          </div>

          <div className="space-y-4">
            {settingsLinks.map((item) => (
              <Link key={item.href} href={item.href}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" data-testid={`card-settings-${item.href.slice(1)}`}>
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">Zapier Webhook</CardTitle>
              <CardDescription>
                Use this endpoint to send data from Granola or other services via Zapier.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-3 font-mono text-sm break-all">
                POST {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/conversation
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Send JSON with: type, title, summary, transcript, occurredAt, externalLink, externalId, source
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
