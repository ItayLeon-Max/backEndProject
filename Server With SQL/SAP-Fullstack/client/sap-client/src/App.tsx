import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Stock from "./pages/Stock";
import Orders from "./pages/Orders";
import Transfers from "./pages/Transfers";
import Warehouses from "./pages/Warehouses"; // ✅ חדש
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Items from "./pages/Itemes";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/stock"
        element={
          <ProtectedRoute>
            <Layout>
              <Stock />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <Layout>
              <Orders />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/transfers"
        element={
          <ProtectedRoute>
            <Layout>
              <Transfers />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/warehouses"
        element={
          <ProtectedRoute>
            <Layout>
              <Warehouses />
            </Layout>
          </ProtectedRoute>
        }
      />

          <Route
      path="/items"
      element={
        <ProtectedRoute>
          <Layout>
            <Items />
          </Layout>
        </ProtectedRoute>
      }
    />

      <Route path="/" element={<Navigate to="/stock" replace />} />
      <Route path="*" element={<Navigate to="/stock" replace />} />
    </Routes>
  );
}