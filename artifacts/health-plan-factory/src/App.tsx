import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import NotFound from "@/pages/not-found";

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
import ProviderLeads from "@/pages/provider/Leads";

import AdminDashboard from "@/pages/admin/Dashboard";
import AdminUsers from "@/pages/admin/Users";
import AdminProviders from "@/pages/admin/Providers";
import AdminModalities from "@/pages/admin/Modalities";
import AdminSettings from "@/pages/admin/Settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Public / marketing */}
      <Route path="/" component={() => <Layout><Landing /></Layout>} />
      <Route path="/how-it-works" component={() => <Layout><HowItWorks /></Layout>} />
      <Route path="/modalities" component={() => <Layout><Modalities /></Layout>} />
      <Route path="/for-providers" component={() => <Layout><ForProviders /></Layout>} />
      <Route path="/pricing" component={() => <Layout><Pricing /></Layout>} />
      <Route path="/faq" component={() => <Layout><FAQ /></Layout>} />
      <Route path="/legal" component={() => <Layout><Legal /></Layout>} />
      <Route path="/privacy" component={() => <Layout><Privacy /></Layout>} />
      <Route path="/terms" component={() => <Layout><Terms /></Layout>} />
      <Route path="/contact" component={() => <Layout><Contact /></Layout>} />

      {/* Auth */}
      <Route path="/sign-in" component={() => <Layout hideFooter><SignIn /></Layout>} />
      <Route path="/sign-up" component={() => <Layout hideFooter><SignUp /></Layout>} />

      {/* Member app */}
      <Route path="/dashboard" component={() => <Layout><Dashboard /></Layout>} />
      <Route path="/onboarding" component={() => <Layout hideFooter><Onboarding /></Layout>} />
      <Route path="/plan" component={() => <Layout><Plan /></Layout>} />
      <Route path="/providers" component={() => <Layout><Providers /></Layout>} />
      <Route path="/bookmarks" component={() => <Layout><Bookmarks /></Layout>} />
      <Route path="/progress" component={() => <Layout><Progress /></Layout>} />
      <Route path="/profile" component={() => <Layout><Profile /></Layout>} />

      {/* Provider routes */}
      <Route path="/provider/dashboard" component={() => <Layout><ProviderDashboard /></Layout>} />
      <Route path="/provider/signup" component={() => <Layout><ProviderSignup /></Layout>} />
      <Route path="/provider/profile" component={() => <Layout><ProviderProfile /></Layout>} />
      <Route path="/provider/leads" component={() => <Layout><ProviderLeads /></Layout>} />

      {/* Admin routes */}
      <Route path="/admin/dashboard" component={() => <Layout><AdminDashboard /></Layout>} />
      <Route path="/admin/users" component={() => <Layout><AdminUsers /></Layout>} />
      <Route path="/admin/providers" component={() => <Layout><AdminProviders /></Layout>} />
      <Route path="/admin/modalities" component={() => <Layout><AdminModalities /></Layout>} />
      <Route path="/admin/settings" component={() => <Layout><AdminSettings /></Layout>} />

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
