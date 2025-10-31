import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    // We replace the generic `div` with a structured Card component
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-3xl">Privacy Policy</CardTitle>
        <CardDescription>
          For the project shc-tournaments (tournament.unofficialcrusaderpatch.com)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <p>
          We are very delighted that you have shown interest in our project,
          shc-tournaments. Data protection is of a particularly high priority for
          the operators of unofficialcrusaderpatch.com.
        </p>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">1. Data Collection on Our Website</h2>
          <p className="text-muted-foreground">
            The processing of data on this website is carried out by the website
            operator. You can find the legally responsible party's contact
            details in the Impressum.
          </p>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">2. Collection and Storage of Personal Data</h2>
          <p className="text-muted-foreground">
            When you register for an account on shc-tournaments, we collect the
            following information to provide the service:
          </p>
          <ul className="list-disc list-inside text-muted-foreground pl-4">
            <li>Email address (for verification and password resets)</li>
            <li>Name (for display)</li>
            <li>Hashed password (we never store your plain-text password)</li>
          </ul>
          <p className="text-muted-foreground">
            This data is collected to provide you with a user account, to allow
            you to create and manage your tournaments, and to ensure the
            security of our service. The legal basis for this processing is
            Art. 6 (1) (b) GDPR.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">3. Public Tournament Pages</h2>
          <p className="text-muted-foreground">
            As a core feature, you can choose to "publish" a tournament. This
            will generate a public, read-only link (e.g.,
            /tournaments/[your-tournament-id]) that anyone can view. Any data
            you enter into that tournament (participant names, scores, etc.)
            will be publicly visible on that page. Do not enter private
            information into a tournament you intend to publish.
          </p>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">4. Your Rights as a Data Subject</h2>
          <p className="text-muted-foreground">
            You have the right to request information about your personal data
            stored by us, and you have the right to request correction, deletion,
            or blocking of your data. You may delete your account and all
            associated data at any time (this feature will be available in the
            "Account Settings" page).
          </p>
        </div>
        
      </CardContent>
    </Card>
  );
}