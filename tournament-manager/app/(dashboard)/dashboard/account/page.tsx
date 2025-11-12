// app/(dashboard)/dashboard/account/page.tsx
import React from "react";

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Account settings</h1>
      <p className="text-sm text-muted-foreground">
        This is your account area. You can wire up profile, password, billing,
        etc. here later.
      </p>
    </div>
  );
}
