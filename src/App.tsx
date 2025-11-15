import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import TrainerDashboard from "./pages/TrainerDashboard";
import Workouts from "./pages/Workouts";
import WorkoutDetail from "./pages/WorkoutDetail";
import CreateWorkout from "./pages/CreateWorkout";
import EditWorkout from "./pages/EditWorkout";
import Exercises from "./pages/Exercises";
import Clients from "./pages/Clients";
import Messages from "./pages/Messages";
import Analytics from "./pages/Analytics";
import Goals from "./pages/Goals";
import TaskLibrary from "./pages/TaskLibrary";
import Auth from "./pages/Auth";
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientWorkouts from "./pages/client/ClientWorkouts";
import ClientProgress from "./pages/client/ClientProgress";
import ClientNutrition from "./pages/client/ClientNutrition";
import ClientCalendar from "./pages/client/ClientCalendar";
import ClientSettings from "./pages/client/ClientSettings";
import ClientGoals from "./pages/client/ClientGoals";
import ClientTasks from "./pages/client/ClientTasks";
import ClientResourceHub from "./pages/client/ClientResourceHub";
import ClientWorkoutHub from "./pages/client/ClientWorkoutHub";
import ResourceLibrary from "./pages/ResourceLibrary";
import ResourceCollections from "./pages/ResourceCollections";
import OndemandWorkouts from "./pages/OndemandWorkouts";
import WorkoutCollections from "./pages/WorkoutCollections";
import WorkoutLabels from "./pages/WorkoutLabels";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          
          {/* Trainer Routes */}
          <Route path="/" element={<ProtectedRoute><TrainerDashboard /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/workouts" element={<ProtectedRoute><Workouts /></ProtectedRoute>} />
          <Route path="/workouts/create" element={<ProtectedRoute><CreateWorkout /></ProtectedRoute>} />
          <Route path="/workouts/edit/:id" element={<ProtectedRoute><EditWorkout /></ProtectedRoute>} />
          <Route path="/workouts/:id" element={<ProtectedRoute><WorkoutDetail /></ProtectedRoute>} />
          <Route path="/exercises" element={<ProtectedRoute><Exercises /></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><TaskLibrary /></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute><ResourceLibrary /></ProtectedRoute>} />
          <Route path="/resource-collections" element={<ProtectedRoute><ResourceCollections /></ProtectedRoute>} />
          <Route path="/ondemand-workouts" element={<ProtectedRoute><OndemandWorkouts /></ProtectedRoute>} />
          <Route path="/workout-collections" element={<ProtectedRoute><WorkoutCollections /></ProtectedRoute>} />
          <Route path="/workout-labels" element={<ProtectedRoute><WorkoutLabels /></ProtectedRoute>} />
          
          {/* Client Routes */}
          <Route path="/client" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
          <Route path="/client/workouts" element={<ProtectedRoute><ClientWorkouts /></ProtectedRoute>} />
          <Route path="/client/progress" element={<ProtectedRoute><ClientProgress /></ProtectedRoute>} />
          <Route path="/client/nutrition" element={<ProtectedRoute><ClientNutrition /></ProtectedRoute>} />
          <Route path="/client/calendar" element={<ProtectedRoute><ClientCalendar /></ProtectedRoute>} />
          <Route path="/client/settings" element={<ProtectedRoute><ClientSettings /></ProtectedRoute>} />
          <Route path="/client/goals" element={<ProtectedRoute><ClientGoals /></ProtectedRoute>} />
          <Route path="/client/tasks" element={<ProtectedRoute><ClientTasks /></ProtectedRoute>} />
          <Route path="/client/resources" element={<ProtectedRoute><ClientResourceHub /></ProtectedRoute>} />
          <Route path="/client/workouts-hub" element={<ProtectedRoute><ClientWorkoutHub /></ProtectedRoute>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
