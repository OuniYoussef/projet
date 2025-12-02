import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './Global.css'
import Signup from './Signup';
import Login from './Login';
import Layout from "./components/Layout";
import PrivateRoute from "./components/PrivateRoute";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Dashboard from "./pages/Dashboard";
import Checkout from "./pages/Checkout";
import DriverDashboard from "./pages/DriverDashboard";
import DriverCalendar from "./pages/DriverCalendar";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import { CartFavoritesProvider } from './context/CartFavoritesContext';
import { NotificationProvider } from './context/NotificationContext';

function App() {
  const handleSignup = (user) => {
    console.log('user signed up', user);
    // redirection possible, ex: location.href = '/dashboard'
  }

  return (
    <NotificationProvider>
      <CartFavoritesProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/signup" element={<Signup onSignup={handleSignup} />} />
              <Route path="/login" element={<Login />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/checkout"
                element={
                  <PrivateRoute>
                    <Checkout />
                  </PrivateRoute>
                }
              />
              <Route
                path="/driver-dashboard"
                element={<DriverDashboard />}
              />
              <Route
                path="/driver-calendar"
                element={<DriverCalendar />}
              />
            </Routes>
          </Layout>
        </Router>
      </CartFavoritesProvider>
    </NotificationProvider>
  )
}

export default App
