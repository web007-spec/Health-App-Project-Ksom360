import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppointmentTypesTab } from "@/components/scheduling/AppointmentTypesTab";
import { AvailabilityTab } from "@/components/scheduling/AvailabilityTab";
import { VacationsTab } from "@/components/scheduling/VacationsTab";
import { BookingSettingsTab } from "@/components/scheduling/BookingSettingsTab";
import { AppointmentsTab } from "@/components/scheduling/AppointmentsTab";
import { SchedulingCalendarTab } from "@/components/scheduling/SchedulingCalendarTab";
import { GroupClassesTab } from "@/components/scheduling/GroupClassesTab";

export default function Scheduling() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Scheduling</h1>
          <p className="text-muted-foreground">
            Manage your appointment types, availability, and bookings
          </p>
        </div>

        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="classes">Group Classes</TabsTrigger>
            <TabsTrigger value="types">Appointment Types</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="vacations">Vacations</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <SchedulingCalendarTab />
          </TabsContent>
          <TabsContent value="appointments">
            <AppointmentsTab />
          </TabsContent>
          <TabsContent value="classes">
            <GroupClassesTab />
          </TabsContent>
          <TabsContent value="types">
            <AppointmentTypesTab />
          </TabsContent>
          <TabsContent value="availability">
            <AvailabilityTab />
          </TabsContent>
          <TabsContent value="vacations">
            <VacationsTab />
          </TabsContent>
          <TabsContent value="settings">
            <BookingSettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
