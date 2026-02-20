import { Shield, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg">KSOM360 Privacy Policy</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2">Last updated: February 20, 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Introduction</h2>
          <p className="text-muted-foreground leading-relaxed">
            Welcome to KSOM360 ("we," "our," or "us"). KSOM360 is a fitness coaching platform
            designed to connect coaches and clients for personalized training, nutrition guidance,
            and health tracking. This Privacy Policy explains how we collect, use, disclose, and
            safeguard your information when you use our platform.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            By using KSOM360, you agree to the terms of this Privacy Policy. If you do not agree,
            please discontinue use of the platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Information We Collect</h2>
          <h3 className="font-medium">Account Information</h3>
          <p className="text-muted-foreground leading-relaxed">
            When you register, we collect your name, email address, and account credentials. Trainers
            may also provide business information.
          </p>
          <h3 className="font-medium mt-4">Health & Fitness Data</h3>
          <p className="text-muted-foreground leading-relaxed">
            With your consent, we collect health and fitness data including:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
            <li>Body metrics (weight, measurements, progress photos)</li>
            <li>Workout performance and history</li>
            <li>Nutrition logs and macro targets</li>
            <li>Heart rate and activity data (when connected via Apple Health or Google Health Connect)</li>
            <li>Fasting and eating window data</li>
            <li>Goals and progress milestones</li>
          </ul>
          <h3 className="font-medium mt-4">Usage Data</h3>
          <p className="text-muted-foreground leading-relaxed">
            We automatically collect information about how you interact with the platform, including
            pages visited, features used, and device/browser information.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2">
            <li>To provide, operate, and improve the KSOM360 platform</li>
            <li>To enable communication between coaches and clients</li>
            <li>To display your progress and health data to your assigned coach</li>
            <li>To send workout reminders and push notifications (with your permission)</li>
            <li>To personalize your coaching experience and recommendations</li>
            <li>To ensure platform security and prevent misuse</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Health Data & Your Trainer</h2>
          <p className="text-muted-foreground leading-relaxed">
            When you connect a health device (Apple Watch, Garmin, etc.) or manually log health
            metrics, your assigned trainer will be able to view this data to optimize your training
            program. This sharing is an essential part of the coaching relationship.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            You may disconnect your health data integration at any time from your Health settings
            page, which will stop further data sharing with your trainer.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Data Sharing & Third Parties</h2>
          <p className="text-muted-foreground leading-relaxed">
            We do <strong>not</strong> sell your personal data. We may share data with:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2">
            <li><strong>Your Coach:</strong> Health, nutrition, and workout data as part of the coaching service</li>
            <li><strong>Cloud Infrastructure:</strong> Secure backend hosting and database services to operate the platform</li>
            <li><strong>Push Notification Services:</strong> To deliver workout reminders and alerts to your device</li>
            <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Data Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            We implement industry-standard security measures including encrypted data transmission
            (TLS/HTTPS), encrypted storage, and strict access controls. Health data is encrypted
            during transfer and at rest. However, no method of electronic transmission is 100%
            secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Data Retention</h2>
          <p className="text-muted-foreground leading-relaxed">
            We retain your data for as long as your account is active or as needed to provide services.
            Upon account deletion, we will remove your personal data within 30 days, except where
            retention is required by law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Your Rights</h2>
          <p className="text-muted-foreground leading-relaxed">
            Depending on your location, you may have the right to:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Withdraw consent for health data sharing at any time</li>
            <li>Object to certain processing of your data</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-2">
            To exercise any of these rights, please contact us at the email below.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Children's Privacy</h2>
          <p className="text-muted-foreground leading-relaxed">
            KSOM360 is not intended for children under the age of 13. We do not knowingly collect
            personal information from children under 13. If you believe a child has provided us
            with personal data, please contact us immediately.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">10. Changes to This Policy</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of any
            significant changes by email or through the platform. Continued use of KSOM360 after
            changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">11. Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have any questions or concerns about this Privacy Policy or how we handle your data, please contact us at:
          </p>
          <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">KSOM360</p>
            <p>Email: <a href="mailto:privacy@ksom360.com" className="text-primary underline">privacy@ksom360.com</a></p>
            <p>Website: <a href="https://everfit-stride-cloud.lovable.app" className="text-primary underline">ksom360.com</a></p>
          </div>
        </section>

        <div className="border-t border-border pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} KSOM360. All rights reserved.
        </div>
      </div>
    </div>
  );
}
