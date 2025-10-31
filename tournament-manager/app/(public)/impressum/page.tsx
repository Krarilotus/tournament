import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from '@/components/ui/separator';

export default function ImpressumPage() {
  return (
    // We use the Card structure for a consistent, clean look
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-3xl">Impressum (Legal Notice)</CardTitle>
        <CardDescription>
          Information pursuant to § 5 TMG (German Telemedia Act)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Contact & Operator:</h2>
          <p className="text-muted-foreground">
            A project by unofficialcrusaderpatch.com
          </p>
          <p className="text-muted-foreground">
            Johannes Mitschunas
            <br />
            Paradiesstr. 2
            <br />
            07743 Jena, Germany
          </p>
          <p className="text-muted-foreground">
            <strong>Email:</strong> shc.aicontest@gmail.com
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Disclaimer:</h2>
          
          <h3 className="text-lg font-medium">Liability for Contents</h3>
          <p className="text-muted-foreground">
            As service providers, we are liable for own contents of these websites
            according to Sec. 7, paragraph 1 TMG. However, according to Sec. 8 to
            10 TMG, service providers are not obligated to permanently monitor
            submitted or stored information or to search for evidences that
            indicate illegal activities.
          </p>

          <h3 className="text-lg font-medium pt-2">Liability for Links</h3>
          <p className="text-muted-foreground">
            Our offer contains links to external websites of third parties, on
            whose contents we have no influence. Therefore, we cannot assume any
            liability for these external contents. The respective provider or
            operator of the pages is always responsible for the contents of the
            linked pages.
          </p>

          <h3 className="text-lg font-medium pt-2">Copyright</h3>
          <p className="text-muted-foreground">
            The contents and works on these pages created by the site operators
            are subject to German copyright law. The reproduction, processing,
            distribution, and any kind of exploitation outside the limits of
            copyright require the written consent of the respective author or
            creator.
          </p>
        </div>

      </CardContent>
    </Card>
  );
}