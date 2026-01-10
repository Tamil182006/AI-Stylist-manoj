import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './components/Login'
import Signup from './components/Signup'
import DashboardLayout from './components/Dashboard/DashboardLayout'
import DashboardHome from './components/Dashboard/DashboardHome'
import OutfitsPage from './components/Pages/OutfitsPage'
import SearchResults from './components/Pages/SearchResults'
import ChatPage from './components/Pages/ChatPage'
import ProfilePage from './components/Pages/ProfilePage'
import UploadForm from './components/UploadForm'
import Result from './components/Result'
import './App.css'

// Upload Page Component (wraps your existing functionality)
function UploadPage() {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    return (
        <div className="page-container">
            {!result && (
                <UploadForm
                    setResult={setResult}
                    setLoading={setLoading}
                    setError={setError}
                    loading={loading}
                />
            )}

            {loading && <div className="loader">Analyzing your style...</div>}

            {error && <div className="error-message">{error}</div>}

            {result && (
                <Result result={result} reset={() => setResult(null)} />
            )}
        </div>
    )
}

// Placeholder components for features (we'll build these next)

function ColorPalettePage() {
    return (
        <div className="page-container">
            <h1>Color Palette</h1>
            <p>Color Preview Tool coming soon! 🎨</p>
        </div>
    );
}

function HistoryPage() {
    return (
        <div className="page-container">
            <h1>Style History</h1>
            <p>Evolution Tracker coming soon! 📈</p>
        </div>
    );
}

function App() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Dashboard Routes */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <DashboardLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<DashboardHome />} />
                <Route path="search" element={<SearchResults />} />
                <Route path="upload" element={<UploadPage />} />
                <Route path="outfits" element={<OutfitsPage />} />
                <Route path="chat" element={<ChatPage />} />
                <Route path="colors" element={<ColorPalettePage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" />} />

            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
    )
}

export default App
