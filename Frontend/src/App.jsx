import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import SessionManager from "./components/SessionManager";
import Nav from "./components/Nav";
import Explore from "./components/Explore";
import StocksBrowse from "./components/StocksBrowse";
import StockDetail from "./components/StockDetail";
import Dashboard from "./components/Dashboard";
import Profile from "./components/Profile";
import Settings from "./components/Settings";
import ProfilePage from "./components/ProfilePage";
import SettingsPage from "./components/SettingsPage";
import ActivityLog from "./components/ActivityLog";
import SecurityLogin from "./components/SecurityLogin";
import Logout from "./components/Logout";
import Footer from "./components/Footer";
import Login from "./components/Login";
import LandingPage from "./components/LandingPage";
import IndicesPage from "./components/IndicesPage";
import ETFsPage from "./components/ETFsPage";
import IPOsPage from "./components/IPOsPage";
import OptionsPage from "./components/OptionsPage";
import DayTradingPage from "./components/DayTradingPage";
import EarningsPage from "./components/EarningsPage";
import ScreenerPage from "./components/ScreenerPage";
import StockUniversePage from "./components/StockUniversePage";
import TradingPage from "./components/TradingPage";
import PortfolioPage from "./components/PortfolioPage";
import PortfolioAnalytics from "./components/PortfolioAnalytics";
import ChartDemo from "./components/ChartDemo";
import TitleBar from "./components/TitleBar";

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (
          error?.message?.includes("Authentication") ||
          error?.message?.includes("token")
        ) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      staleTime: 10000, // 10 seconds
    },
  },
});

function AppContent() {
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const isLogin = location.pathname === "/login";

  return (
    <ErrorBoundary>
      <div className="flex flex-col min-h-screen">
        <TitleBar />
        {!isLanding && !isLogin && <Nav />}
        <SessionManager />
        <div className="main-content flex-grow">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <PortfolioAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/market-indices"
              element={
                <ProtectedRoute>
                  <IndicesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/explore"
              element={
                <ProtectedRoute>
                  <Explore />
                </ProtectedRoute>
              }
            />
            <Route
              path="/explore/stocks"
              element={
                <ProtectedRoute>
                  <StocksBrowse />
                </ProtectedRoute>
              }
            />
            <Route
              path="/indices"
              element={
                <ProtectedRoute>
                  <IndicesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/etfs"
              element={
                <ProtectedRoute>
                  <ETFsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ipos"
              element={
                <ProtectedRoute>
                  <IPOsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/options"
              element={
                <ProtectedRoute>
                  <OptionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/day-trading"
              element={
                <ProtectedRoute>
                  <DayTradingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/earnings"
              element={
                <ProtectedRoute>
                  <EarningsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/screener"
              element={
                <ProtectedRoute>
                  <ScreenerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock-universe"
              element={
                <ProtectedRoute>
                  <StockUniversePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock-universe"
              element={
                <ProtectedRoute>
                  <StockUniversePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock/:symbol"
              element={
                <ProtectedRoute>
                  <StockDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/portfolio"
              element={
                <ProtectedRoute>
                  <PortfolioPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/portfolio/analytics"
              element={
                <ProtectedRoute>
                  <PortfolioAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/demo/charts"
              element={
                <ProtectedRoute>
                  <ChartDemo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trade/:symbol"
              element={
                <ProtectedRoute>
                  <TradingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trading"
              element={
                <ProtectedRoute>
                  <Explore />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/activity"
              element={
                <ProtectedRoute>
                  <ActivityLog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/security"
              element={
                <ProtectedRoute>
                  <SecurityLogin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/logout"
              element={
                <ProtectedRoute>
                  <Logout />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
        {!isLanding && !isLogin && <Footer />}
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <NotificationProvider>
              <Router>
                <AppContent />
              </Router>
            </NotificationProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
