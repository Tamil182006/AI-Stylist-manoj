import React, { useState } from 'react';
import axios from 'axios';
import TryOn from './TryOn';

const Result = ({ result, reset }) => {
    const [showTryOn, setShowTryOn] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const handleTryOnClick = (product) => {
        setSelectedProduct(product);
        setShowTryOn(true);
    };

    const handleBackToProducts = () => {
        setShowTryOn(false);
        setSelectedProduct(null);
    };

    // Show TryOn page if product selected
    if (showTryOn && selectedProduct) {
        return (
            <TryOn 
                product={selectedProduct}
                userImagePath={result.userImagePath}
                onBack={handleBackToProducts}
            />
        );
    }

    // Otherwise show normal result page
    return (
        <div className="result-card">
            <h2 style={{ marginBottom: '2rem', textAlign: 'center' }}>Your Style Profile</h2>

            <div className="content-wrapper">

                {/* Left Column: Analysis & Recommendations */}
                <div className="text-content">
                    <div className="analysis-grid">
                        <div className="analysis-item">
                            <span className="label">Face Shape</span>
                            <span className="value">{result.analysis.faceShape}</span>
                        </div>
                        <div className="analysis-item">
                            <span className="label">Skin Tone</span>
                            <span className="value">{result.analysis.skinTone}</span>
                        </div>
                    </div>

                    <div className="recommendations">
                        <h3 style={{ marginBottom: '1.5rem', color: '#fff' }}>Style Category</h3>
                        
                        <div className="rec-item">
                            <h4>Recommended Style</h4>
                            <p>{result.styleCategory}</p>
                        </div>

                        <div className="rec-item">
                            <h4>Best Colors for You</h4>
                            <div className="color-palette">
                                {result.recommendedColors.map((color, index) => (
                                    <div key={index} className="color-swatch">
                                        <div 
                                            className="color-circle" 
                                            style={{ 
                                                backgroundColor: color.toLowerCase().replace(' ', ''),
                                                border: '2px solid #ddd'
                                            }}
                                        ></div>
                                        <span className="color-name">{color}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rec-item">
                            <h4>Hairstyle</h4>
                            <p>{result.analysis.hairstyle}</p>
                        </div>

                        <div className="rec-item">
                            <h4>Beard Style</h4>
                            <p>{result.analysis.beardStyle}</p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Virtual Try-On Result (if available) */}
            </div>

            {/* Product Gallery Section */}
            <div className="products-section">
                <h3 style={{ marginBottom: '1.5rem', color: '#fff', textAlign: 'center' }}>
                    🛍️ Products That Match Your Style
                </h3>
                
                <div className="products-grid">
                    {result.products && result.products.map((product) => (
                        <div key={product.id} className="product-card">
                            <div className="product-image">
                                <img src={product.image} alt={product.name} />
                            </div>
                            <div className="product-info">
                                <h4>{product.name}</h4>
                                <p className="product-price">{product.price}</p>
                                <div className="product-actions">
                                    <button 
                                        className="btn-try-on"
                                        onClick={() => handleTryOnClick(product)}
                                    >
                                        👔 Try On Virtually
                                    </button>
                                    <a 
                                        href={product.buyLink} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="btn-buy"
                                    >
                                        🛒 Buy Now
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {(!result.products || result.products.length === 0) && (
                    <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
                        No products found. Try different occasion or style.
                    </p>
                )}
            </div>

            <button onClick={reset} className="btn-secondary" style={{ marginTop: '2rem' }}>
                Analyze Another Photo
            </button>
        </div>
    );
};

export default Result;