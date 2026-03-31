import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@workspace/replit-auth-web";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Landing from "@/pages/Landing";
import HowItWorks from "@/pages/HowItWorks";
import Modalities from "@/pages/Modalities";
import ForProviders from "@/pages/ForProviders";
import Pricing from "@/pages/Pricing";
import FAQ from "@/pages/FAQ";
import Legal from "@/pages/Legal";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Contact from "@/pages/Contact";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";

import Dashboard from "@/pages/Dashboard";
import Onboarding from "@/pages/Onboarding";
import Plan from "@/pages/Plan";
import Providers from "@/pages/Providers";
import Bookmarks from "@/pages/Bookmarks";
import Progress from "@/pages/Progress";
import Profile from "@/pages/Profile";

import ProviderDashboard from "@/pages/provider/Dashboard";
import ProviderSignup from "@/pages/provider/Signup";
import ProviderProfile from "@/pages/provider/Profile";
import ProviderPreview from "@/pages/provider/Preview";
import ProviderLeads from "@/pages/provider/Leads";

import AdminDashboard from "@/pages/admin/Dashboard";
import AdminUsers from "@/pages/admin/Users";
import AdminProviders from "@/pages/admin/Providers";
import AdminModalities from "@/pages/admin/Modalities";
import AdminSettings from "@/pages/admin/Settings";
import AdminEmployers from "@/pages/admin/Employers";

import EmployerPortal from "@/pages/employer/EmployerPortal";
import EmployerDashboard from "@/pages/employer/EmployerDashboard";
import EmployerMembers from "@/pages/employer/EmployerMembers";
import EmployerSettings from "@/pages/employer/EmployerSettings";

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

const base = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

function AppRoutes() {
  return (
    <Routes>
      {/* Public / marketing */}
      <Route path="/" element={<Layout><Landing /></Layout>} />
      <Route path="/how-it-works" element={<Layout><HowItWorks /></Layout>} />
      <Route path="/modalities" element={<Layout><Modalities /></Layout>} />
      <Route path="/for-providers" element={<Layout><ForProviders /></Layout>} />
      <Route path="/pricing" element={<Layout><Pricing /></Layout>} />
      <Route path="/faq" element={<Layout><FAQ /></Layout>} />
      <Route path="/legal" element={<Layout><Legal /></Layout>} />
      <Route path="/privacy" element={<Layout><Privacy /></Layout>} />
      <Route path="/terms" element={<Layout><Terms /></Layout>} />
      <Route path="/contact" element={<Layout><Contact /></Layout>} />

      {/* Auth */}
      <Route path="/sign-in" element={<Layout hideFooter><SignIn /></Layout>} />
      <Route path="/sign-up" element={<Layout hideFooter><SignUp /></Layout>} />

      {/* Member app */}
      <Route path="/dashboard" element={<Layout><ProtectedRoute><Dashboard /></ProtectedRoute></Layout>} />
      {/* PUBLIC lead-capture pages — intentionally no auth or Layout wrapper.
          Unauthenticated users complete onboarding → see their plan → then sign up.
          Auth gate is deferred to pay-per-reveal unlock (Stripe) and provider booking. */}
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/plan" element={<Plan />} />
      <Route path="/providers" element={<Layout><ProtectedRoute><Providers /></ProtectedRoute></Layout>} />
      <Route path="/bookmarks" element={<Layout><ProtectedRoute><Bookmarks /></ProtectedRoute></Layout>} />
      <Route path="/progress" element={<Layout><ProtectedRoute><Progress /></ProtectedRoute></Layout>} />
      <Route path="/profile" element={<Layout><ProtectedRoute><Profile /></ProtectedRoute></Layout>} />

      {/* Provider routes — protected */}
      <Route path="/provider/dashboard" element={<Layout><ProtectedRoute role="provider"><ProviderDashboard /></ProtectedRoute></Layout>} />
      <Route path="/provider/signup" element={<Layout><ProviderSignup /></Layout>} />
      <Route path="/provider/profile" element={<Layout><ProtectedRoute role="provider"><ProviderProfile /></ProtectedRoute></Layout>} />
      <Route path="/provider/preview" element={<Layout><ProtectedRoute role="provider"><ProviderPreview /></ProtectedRoute></Layout>} />
      <Route path="/provider/leads" element={<Layout><ProtectedRoute role="provider"><ProviderLeads /></ProtectedRoute></Layout>} />

      {/* Admin routes — protected */}
      <Route path="/admin/dashboard" element={<Layout><ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute></Layout>} />
      <Route path="/admin/users" element={<Layout><ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute></Layout>} />
      <Route path="/admin/providers" element={<Layout><ProtectedRoute role="admin"><AdminProviders /></ProtectedRoute></Layout>} />
      <Route path="/admin/modalities" element={<Layout><ProtectedRoute role="admin"><AdminModalities /></ProtectedRoute></Layout>} />
      <Route path="/admin/settings" element={<Layout><ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute></Layout>} />
      <Route path="/admin/employers" element={<Layout><ProtectedRoute role="admin"><AdminEmployers /></ProtectedRoute></Layout>} />

      {/* Employer routes */}
      <Route path="/employer" element={<Layout><EmployerPortal /></Layout>} />
      <Route path="/employer/dashboard" element={<Layout><ProtectedRoute><EmployerDashboard /></ProtectedRoute></Layout>} />
      <Route path="/employer/members" element={<Layout><ProtectedRoute><EmployerMembers /></ProtectedRoute></Layout>} />
      <Route path="/employer/settings" element={<Layout><ProtectedRoute><EmployerSettings /></ProtectedRoute></Layout>} />

      {/* 404 */}
      <Route path="*" element={<Layout><NotFound /></Layout>} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <BrowserRouter basename={base}>
            <AppRoutes />
          </BrowserRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
