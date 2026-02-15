import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { InstallPrompt } from "@/components/InstallPrompt";
import Dashboard from "./pages/Dashboard";
import TrainerDashboard from "./pages/TrainerDashboard";
import Workouts from "./pages/Workouts";
import WorkoutDetail from "./pages/WorkoutDetail";
import CreateWorkout from "./pages/CreateWorkout";
import EditWorkout from "./pages/EditWorkout";
import WorkoutTemplates from "./pages/WorkoutTemplates";
import Exercises from "./pages/Exercises";
import Clients from "./pages/Clients";
import Messages from "./pages/Messages";
import Analytics from "./pages/Analytics";
import Goals from "./pages/Goals";
import TaskLibrary from "./pages/TaskLibrary";
import Auth from "./pages/Auth";
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientOnboarding from "./pages/client/ClientOnboarding";
import ClientWorkouts from "./pages/client/ClientWorkouts";
import ClientProgress from "./pages/client/ClientProgress";
import ClientNutrition from "./pages/client/ClientNutrition";
import ClientNutritionDashboard from "./pages/client/ClientNutritionDashboard";
import ClientCalendar from "./pages/client/ClientCalendar";
import ClientSettings from "./pages/client/ClientSettings";
import ClientGoals from "./pages/client/ClientGoals";
import ClientTasks from "./pages/client/ClientTasks";
import ClientResourceHub from "./pages/client/ClientResourceHub";
import ClientWorkoutHub from "./pages/client/ClientWorkoutHub";
import ResourceLibrary from "./pages/ResourceLibrary";
import ResourceCollections from "./pages/ResourceCollections";
import ResourceCollectionDetail from "./pages/ResourceCollectionDetail";
import OndemandWorkouts from "./pages/OndemandWorkouts";
import WorkoutCollections from "./pages/WorkoutCollections";
import WorkoutCollectionDetail from "./pages/WorkoutCollectionDetail";
import WorkoutLabels from "./pages/WorkoutLabels";
import Recipes from "./pages/Recipes";
import RecipeBooks from "./pages/RecipeBooks";
import RecipeBookDetail from "./pages/RecipeBookDetail";
import MealPlans from "./pages/MealPlans";
import MealPlanDetail from "./pages/MealPlanDetail";
import MacroCalculator from "./pages/MacroCalculator";
import MacroTracking from "./pages/MacroTracking";
import TrainerClientHealth from "./pages/TrainerClientHealth";
import ClientsHealth from "./pages/ClientsHealth";
import NotFound from "./pages/NotFound";
import ClientHealth from "./pages/client/ClientHealth";
import ClientHealthConnect from "./pages/client/ClientHealthConnect";
import ClientBadges from "./pages/client/ClientBadges";
import ClientMealPlan from "./pages/client/ClientMealPlan";
import ClientHabits from "./pages/client/ClientHabits";
import ClientHabitDetail from "./pages/client/ClientHabitDetail";
import ClientMacroSetup from "./pages/client/ClientMacroSetup";
import ClientLogMeal from "./pages/client/ClientLogMeal";
import ClientCoaching from "./pages/client/ClientCoaching";
import ClientProfile from "./pages/client/ClientProfile";
import ClientWorkoutHistory from "./pages/ClientWorkoutHistory";
import ClientCommandCenter from "./pages/ClientCommandCenter";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <InstallPrompt />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          
          {/* Trainer Routes */}
          <Route path="/" element={<ProtectedRoute allowedRoles={["trainer"]}><TrainerDashboard /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["trainer"]}><Dashboard /></ProtectedRoute>} />
          <Route path="/workouts" element={<ProtectedRoute allowedRoles={["trainer"]}><Workouts /></ProtectedRoute>} />
          <Route path="/workouts/create" element={<ProtectedRoute allowedRoles={["trainer"]}><CreateWorkout /></ProtectedRoute>} />
          <Route path="/workouts/edit/:id" element={<ProtectedRoute allowedRoles={["trainer"]}><EditWorkout /></ProtectedRoute>} />
          <Route path="/workouts/:id" element={<ProtectedRoute allowedRoles={["trainer"]}><WorkoutDetail /></ProtectedRoute>} />
          <Route path="/workout-templates" element={<ProtectedRoute allowedRoles={["trainer"]}><WorkoutTemplates /></ProtectedRoute>} />
          <Route path="/exercises" element={<ProtectedRoute allowedRoles={["trainer"]}><Exercises /></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute allowedRoles={["trainer"]}><Clients /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute allowedRoles={["trainer"]}><Messages /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute allowedRoles={["trainer"]}><Analytics /></ProtectedRoute>} />
          <Route path="/goals" element={<ProtectedRoute allowedRoles={["trainer"]}><Goals /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute allowedRoles={["trainer"]}><TaskLibrary /></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute allowedRoles={["trainer"]}><ResourceLibrary /></ProtectedRoute>} />
          <Route path="/resource-collections" element={<ProtectedRoute allowedRoles={["trainer"]}><ResourceCollections /></ProtectedRoute>} />
          <Route path="/resource-collections/:id" element={<ProtectedRoute allowedRoles={["trainer"]}><ResourceCollectionDetail /></ProtectedRoute>} />
          <Route path="/ondemand-workouts" element={<ProtectedRoute allowedRoles={["trainer"]}><OndemandWorkouts /></ProtectedRoute>} />
          <Route path="/workout-collections" element={<ProtectedRoute allowedRoles={["trainer"]}><WorkoutCollections /></ProtectedRoute>} />
          <Route path="/workout-collections/:id" element={<ProtectedRoute allowedRoles={["trainer"]}><WorkoutCollectionDetail /></ProtectedRoute>} />
          <Route path="/workout-labels" element={<ProtectedRoute allowedRoles={["trainer"]}><WorkoutLabels /></ProtectedRoute>} />
          <Route path="/recipes" element={<ProtectedRoute allowedRoles={["trainer"]}><Recipes /></ProtectedRoute>} />
          <Route path="/recipe-books" element={<ProtectedRoute allowedRoles={["trainer"]}><RecipeBooks /></ProtectedRoute>} />
          <Route path="/recipe-books/:id" element={<ProtectedRoute allowedRoles={["trainer"]}><RecipeBookDetail /></ProtectedRoute>} />
          <Route path="/meal-plans" element={<ProtectedRoute allowedRoles={["trainer"]}><MealPlans /></ProtectedRoute>} />
          <Route path="/meal-plans/:id" element={<ProtectedRoute allowedRoles={["trainer"]}><MealPlanDetail /></ProtectedRoute>} />
          <Route path="/macro-calculator" element={<ProtectedRoute allowedRoles={["trainer"]}><MacroCalculator /></ProtectedRoute>} />
          <Route path="/macro-tracking" element={<ProtectedRoute allowedRoles={["trainer"]}><MacroTracking /></ProtectedRoute>} />
          <Route path="/clients/:clientId/health" element={<ProtectedRoute allowedRoles={["trainer"]}><TrainerClientHealth /></ProtectedRoute>} />
          <Route path="/clients/:clientId" element={<ProtectedRoute allowedRoles={["trainer"]}><ClientCommandCenter /></ProtectedRoute>} />
          <Route path="/clients/:clientId/workout-history" element={<ProtectedRoute allowedRoles={["trainer"]}><ClientWorkoutHistory /></ProtectedRoute>} />
          <Route path="/clients-health" element={<ProtectedRoute allowedRoles={["trainer"]}><ClientsHealth /></ProtectedRoute>} />
          
          {/* Client Routes */}
          <Route path="/client/dashboard" element={<ProtectedRoute allowedRoles={["client"]}><ClientDashboard /></ProtectedRoute>} />
          <Route path="/client/coaching" element={<ProtectedRoute allowedRoles={["client"]}><ClientCoaching /></ProtectedRoute>} />
          <Route path="/client/profile" element={<ProtectedRoute allowedRoles={["client"]}><ClientProfile /></ProtectedRoute>} />
          <Route path="/client/onboarding" element={<ProtectedRoute allowedRoles={["client"]}><ClientOnboarding /></ProtectedRoute>} />
          <Route path="/client/workouts" element={<ProtectedRoute allowedRoles={["client"]}><ClientWorkouts /></ProtectedRoute>} />
          <Route path="/client/progress" element={<ProtectedRoute allowedRoles={["client"]}><ClientProgress /></ProtectedRoute>} />
          <Route path="/client/meal-plan" element={<ProtectedRoute allowedRoles={["client"]}><ClientMealPlan /></ProtectedRoute>} />
          <Route path="/client/nutrition" element={<ProtectedRoute allowedRoles={["client"]}><ClientNutrition /></ProtectedRoute>} />
          <Route path="/client/nutrition-dashboard" element={<ProtectedRoute allowedRoles={["client"]}><ClientNutritionDashboard /></ProtectedRoute>} />
          <Route path="/client/calendar" element={<ProtectedRoute allowedRoles={["client"]}><ClientCalendar /></ProtectedRoute>} />
          <Route path="/client/settings" element={<ProtectedRoute allowedRoles={["client"]}><ClientSettings /></ProtectedRoute>} />
          <Route path="/client/goals" element={<ProtectedRoute allowedRoles={["client"]}><ClientGoals /></ProtectedRoute>} />
          <Route path="/client/tasks" element={<ProtectedRoute allowedRoles={["client"]}><ClientTasks /></ProtectedRoute>} />
          <Route path="/client/resource-hub" element={<ProtectedRoute allowedRoles={["client"]}><ClientResourceHub /></ProtectedRoute>} />
          <Route path="/client/workout-hub" element={<ProtectedRoute allowedRoles={["client"]}><ClientWorkoutHub /></ProtectedRoute>} />
          <Route path="/client/health" element={<ProtectedRoute allowedRoles={["client"]}><ClientHealth /></ProtectedRoute>} />
          <Route path="/client/health-connect" element={<ProtectedRoute allowedRoles={["client"]}><ClientHealthConnect /></ProtectedRoute>} />
          <Route path="/client/badges" element={<ProtectedRoute allowedRoles={["client"]}><ClientBadges /></ProtectedRoute>} />
          <Route path="/client/habits" element={<ProtectedRoute allowedRoles={["client"]}><ClientHabits /></ProtectedRoute>} />
          <Route path="/client/habits/:id" element={<ProtectedRoute allowedRoles={["client"]}><ClientHabitDetail /></ProtectedRoute>} />
          <Route path="/client/macro-setup" element={<ProtectedRoute allowedRoles={["client"]}><ClientMacroSetup /></ProtectedRoute>} />
          <Route path="/client/log-meal" element={<ProtectedRoute allowedRoles={["client"]}><ClientLogMeal /></ProtectedRoute>} />
          <Route path="/client/workouts/:id" element={<ProtectedRoute allowedRoles={["client"]}><WorkoutDetail /></ProtectedRoute>} />
          <Route path="/client/messages" element={<ProtectedRoute allowedRoles={["client"]}><Messages /></ProtectedRoute>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
