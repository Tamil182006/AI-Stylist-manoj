import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const DashboardHome = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalAnalyses: 0,
        totalOutfits: 0,
        savedColors: 0,
        faceShape: 'Not analyzed yet'
    });
    const [recentAnalyses, setRecentAnalyses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/dashboard/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setStats(response.data.stats);
                setRecentAnalyses(response.data.recentAnalyses || []);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const quickActions = [
        {
            title: 'Upload New Photo',
            description: 'Get AI-powered style analysis',
            icon: '',
            gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            path: '/dashboard/upload'
        },
        {
            title: 'Chat with AI',
            description: 'Ask style questions',
            icon: '',
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            path: '/dashboard/chat'
        },
        {
            title: 'Color Palette',
            description: 'Discover your colors',
            icon: '',
            gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            path: '/dashboard/colors'
        }
    ];

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loader">Loading your dashboard...</div>
            </div>
        );
    }

    return (
        <div className="dashboard-home">
            {/* Welcome Section */}
            <section className="welcome-section">
                <div className="welcome-content">
                    <h1 className="welcome-title">
                        Welcome back, <span className="highlight">{user?.name}</span>!
                    </h1>
                    <p className="welcome-subtitle">
                        Ready to discover your perfect style today?
                    </p>
                </div>
                <div className="welcome-actions">
                    <button
                        className="btn-primary-gradient"
                        onClick={() => navigate('/dashboard/upload')}
                    >
                        Start New Analysis
                    </button>
                    <button
                        className="btn-secondary-outline"
                        onClick={() => navigate('/dashboard/outfits')}
                    >
                        Explore Outfits
                    </button>
                </div>
            </section>

            {/* Stats Cards */}
            <section className="stats-section">
                <div className="stats-grid">
                    <div className="stat-card" data-color="purple">
                        <div className="stat-icon"></div>
                        <div className="stat-content">
                            <h3 className="stat-number">{stats.totalAnalyses}</h3>
                            <p className="stat-label">Analyses Done</p>
                        </div>
                        <div className="stat-glow"></div>
                    </div>

                    <div className="stat-card" data-color="pink">
                        <div className="stat-icon"></div>
                        <div className="stat-content">
                            <h3 className="stat-number">{stats.totalOutfits}</h3>
                            <p className="stat-label">Outfits Created</p>
                        </div>
                        <div className="stat-glow"></div>
                    </div>

                    <div className="stat-card" data-color="cyan">
                        <div className="stat-icon"></div>
                        <div className="stat-content">
                            <h3 className="stat-number">{stats.savedColors}</h3>
                            <p className="stat-label">Saved Colors</p>
                        </div>
                        <div className="stat-glow"></div>
                    </div>

                    <div className="stat-card" data-color="green">
                        <div className="stat-icon"></div>
                        <div className="stat-content">
                            <h3 className="stat-number">{stats.faceShape}</h3>
                            <p className="stat-label">Face Shape</p>
                        </div>
                        <div className="stat-glow"></div>
                    </div>
                </div>
            </section>

            {/* Quick Actions */}
            <section className="quick-actions-section">
                <h2 className="section-title">
                    <span className="title-icon"></span>
                    Quick Actions
                </h2>
                <div className="quick-actions-grid">
                    {quickActions.map((action, index) => (
                        <div
                            key={index}
                            className="quick-action-card"
                            onClick={() => navigate(action.path)}
                            style={{ '--card-gradient': action.gradient }}
                        >
                            <div className="action-icon">{action.icon}</div>
                            <h3 className="action-title">{action.title}</h3>
                            <p className="action-description">{action.description}</p>
                            <div className="action-arrow">→</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Recent Activity */}
            <section className="recent-activity-section">
                <div className="section-header">
                    <h2 className="section-title">
                        <span className="title-icon"></span>
                        Recent Analyses
                    </h2>
                    <button
                        className="view-all-btn"
                        onClick={() => navigate('/dashboard/history')}
                    >
                        View All →
                    </button>
                </div>

                {recentAnalyses.length > 0 ? (
                    <div className="activity-list">
                        {recentAnalyses.map((analysis, index) => (
                            <div key={index} className="activity-item">
                                <div className="activity-image">
                                    {analysis.imagePath ? (
                                        <img src={`http://localhost:5000${analysis.imagePath}`} alt="Analysis" />
                                    ) : (
                                        <div className="placeholder-image">📷</div>
                                    )}
                                </div>
                                <div className="activity-details">
                                    <p className="activity-date">
                                        {new Date(analysis.date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </p>
                                    <p className="activity-info">
                                        <span>Face: {analysis.faceShape}</span>
                                        <span className="separator">•</span>
                                        <span>Tone: {analysis.skinTone}</span>
                                    </p>
                                    <p className="activity-occasion">{analysis.occasion}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon"></div>
                        <h3>No analyses yet</h3>
                        <p>Upload your first photo to get started!</p>
                        <button
                            className="btn-primary-gradient"
                            onClick={() => navigate('/dashboard/upload')}
                        >
                            Upload Photo
                        </button>
                    </div>
                )}
            </section>

            {/* Style Insights (if user has data) */}
            {stats.totalAnalyses > 0 && (
                <section className="insights-section">
                    <h2 className="section-title">
                        <span className="title-icon"></span>
                        Your Style Insights
                    </h2>
                    <div className="insights-card">
                        <div className="insight-item">
                            <span className="insight-label">Dominant Face Shape:</span>
                            <span className="insight-value">{stats.faceShape}</span>
                        </div>
                        <div className="insight-item">
                            <span className="insight-label">Total Analyses:</span>
                            <span className="insight-value">{stats.totalAnalyses}</span>
                        </div>
                        <div className="insight-item">
                            <span className="insight-label">Outfits Created:</span>
                            <span className="insight-value">{stats.totalOutfits}</span>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

export default DashboardHome;
