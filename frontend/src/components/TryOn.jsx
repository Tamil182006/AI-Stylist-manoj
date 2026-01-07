import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TryOn.css';

const TryOn = ({ product, userImagePath, onBack }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Auto-start try-on when component loads
        handleTryOn();
    }, []);

    // Simulate progress for better UX
    useEffect(() => {
        if (loading) {
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) return prev;
                    return prev + Math.random() * 10;
                });
            }, 500);
            return () => clearInterval(interval);
        }
    }, [loading]);

    const handleTryOn = async () => {
        setLoading(true);
        setError(null);
        setProgress(10);

        try {
            console.log('🎨 Starting virtual try-on...');
            console.log('User Image:', userImagePath);
            console.log('Product:', product.name);

            const response = await axios.post('http://localhost:5000/api/virtual-tryon', {
                userImagePath: userImagePath,
                productImageUrl: product.image
            });

            if (response.data.success) {
                console.log('✅ Virtual try-on successful!');
                setProgress(100);
                setTimeout(() => {
                    setResult(response.data.resultImageBase64);
                    setLoading(false);
                }, 500);
            } else {
                throw new Error(response.data.error || 'Try-on failed');
            }

        } catch (err) {
            console.error('❌ Try-on error:', err);
            setError(err.response?.data?.error || err.message || 'Virtual try-on failed');
            setLoading(false);
            setProgress(0);
        }
    };

    return (
        <div className="tryon-container">
            <div className="tryon-header">
                <button onClick={onBack} className="back-button">
                    ← Back to Products
                </button>
                <h2>Virtual Try-On</h2>
                <p className="product-name">{product.name} - {product.price}</p>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="tryon-loading">
                    <div className="loading-animation">
                        <div className="spinner"></div>
                        <h3>Creating Your Virtual Try-On...</h3>
                        <p>This takes about 10-15 seconds</p>
                        <div className="progress-bar">
                            <div 
                                className="progress-fill" 
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="progress-text">{Math.round(progress)}%</p>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && !loading && (
                <div className="tryon-error">
                    <div className="error-card">
                        <span className="error-icon">⚠️</span>
                        <h3>Oops! Something went wrong</h3>
                        <p>{error}</p>
                        <div className="error-actions">
                            <button onClick={handleTryOn} className="retry-button">
                                🔄 Try Again
                            </button>
                            <button onClick={onBack} className="back-button-alt">
                                ← Back to Products
                            </button>
                        </div>
                        <div className="error-help">
                            <p><strong>Troubleshooting:</strong></p>
                            <ul>
                                <li>Make sure your Google Colab notebook is running</li>
                                <li>Check if the Colab URL is correct in .env file</li>
                                <li>The first try-on might take longer (model warming up)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Result State */}
            {result && !loading && (
                <div className="tryon-result">
                    <div className="result-grid">
                        {/* Product Image */}
                        <div className="comparison-item">
                            <h3>Selected Product</h3>
                            <div className="image-card">
                                <img src={product.image} alt={product.name} />
                            </div>
                            <p className="image-label">Original Product</p>
                        </div>

                        {/* Arrow */}
                        <div className="comparison-arrow">
                            <span>→</span>
                        </div>

                        {/* Result Image */}
                        <div className="comparison-item">
                            <h3>You Wearing It! 🎉</h3>
                            <div className="image-card result-card">
                                <img 
                                    src={`data:image/jpeg;base64,${result}`} 
                                    alt="Virtual Try-On Result" 
                                />
                            </div>
                            <p className="image-label">Virtual Try-On Result</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="result-actions">
                        <button onClick={handleTryOn} className="try-again-button">
                            🔄 Try Again
                        </button>
                        <a 
                            href={product.buyLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="buy-button"
                        >
                            🛒 Buy This Product
                        </a>
                        <button onClick={onBack} className="back-button-primary">
                            ← Try Other Products
                        </button>
                    </div>

                    {/* Download Option */}
                    <div className="download-section">
                        <a 
                            href={`data:image/jpeg;base64,${result}`} 
                            download={`tryon-${product.name}.jpg`}
                            className="download-button"
                        >
                            💾 Download Image
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TryOn;