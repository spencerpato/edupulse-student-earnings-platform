import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import Dashboard from "./pages/Dashboard";
import Surveys from "./pages/Surveys";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import PaymentInvoice from "./pages/auth/PaymentInvoice";
import PaymentPending from "./pages/auth/PaymentPending";
import ReferralRedirect from "./pages/ReferralRedirect";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageSurveys from "./pages/admin/ManageSurveys";
import ManageWithdrawals from "./pages/admin/ManageWithdrawals";
import TakeSurvey from "./pages/TakeSurvey";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Auth Routes */}
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/signup" element={<Signup />} />
            <Route path="/auth/payment-invoice" element={<PaymentInvoice />} />
            <Route path="/auth/payment-pending" element={<PaymentPending />} />
            
            {/* Referral Route */}
            <Route path="/ref/:code" element={<ReferralRedirect />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/surveys"
              element={
                <ProtectedRoute>
                  <Surveys />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallet"
              element={
                <ProtectedRoute>
                  <Wallet />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/edit"
              element={
                <ProtectedRoute>
                  <EditProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/surveys/:id"
              element={
                <ProtectedRoute>
                  <TakeSurvey />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/surveys"
              element={
                <ProtectedRoute requireAdmin>
                  <ManageSurveys />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/withdrawals"
              element={
                <ProtectedRoute requireAdmin>
                  <ManageWithdrawals />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
