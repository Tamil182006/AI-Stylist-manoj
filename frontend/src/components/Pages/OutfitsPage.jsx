import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import './Outfit.css';

const OutfitsPage = () => {
    const location = useLocation();
    const [outfitItems, setOutfitItems] = useState({
        top: null,
        bottom: null,
        shoes: null,
        accessories: null
    });
    const [savedOutfits, setSavedOutfits] = useState([]);
    const [outfitName, setOutfitName] = useState('');
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchCategory, setSearchCategory] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // Handle pre-selected product from search results
    useEffect(() => {
        if (location.state?.preSelected) {
            const product = location.state.preSelected;
            setOutfitItems(prev => ({
                ...prev,
                [product.category]: product
            }));
            // Clear the navigation state
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // Load saved outfits
    useEffect(() => {
        loadSavedOutfits();
    }, []);

    const loadSavedOutfits = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/outfits', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setSavedOutfits(response.data.outfits);
            }
        } catch (error) {
            console.error('Error loading outfits:', error);
        }
    };

    const openSearchModal = (category) => {
        setSearchCategory(category);
        setShowSearchModal(true);
        setSearchQuery('');
        setSearchResults([]);
    };

    const closeSearchModal = () => {
        setShowSearchModal(false);
        setSearchCategory('');
        setSearchQuery('');
        setSearchResults([]);
    };

    const searchProducts = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        try {
            setSearching(true);
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/outfits/search', {
                params: {
                    query: searchQuery,
                    category: searchCategory,
                    limit: 12
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setSearchResults(response.data.products);
            }
        } catch (error) {
            console.error('Search error:', error);
            alert('Failed to search products');
        } finally {
            setSearching(false);
        }
    };

    const selectProduct = (product) => {
        setOutfitItems(prev => ({
            ...prev,
            [searchCategory]: product
        }));
        closeSearchModal();
    };

    const removeItem = (category) => {
        setOutfitItems(prev => ({
            ...prev,
            [category]: null
        }));
    };

    const clearOutfit = () => {
        setOutfitItems({
            top: null,
            bottom: null,
            shoes: null,
            accessories: null
        });
        setOutfitName('');
    };

    const calculateTotal = () => {
        let total = 0;
        Object.values(outfitItems).forEach(item => {
            if (item && item.price) {
                // Extract number from price string (₹1,299 -> 1299)
                const priceNum = parseInt(item.price.replace(/[^\d]/g, ''));
                if (!isNaN(priceNum)) {
                    total += priceNum;
                }
            }
        });
        return total;
    };

    const saveOutfit = async () => {
        if (!outfitName.trim()) {
            alert('Please enter an outfit name!');
            return;
        }

        const itemCount = Object.values(outfitItems).filter(item => item !== null).length;
        if (itemCount === 0) {
            alert('Please add at least one item to your outfit!');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const outfitData = {
                name: outfitName,
                items: outfitItems,
                totalPrice: calculateTotal(),
                itemCount: itemCount
            };

            const response = await axios.post('http://localhost:5000/api/outfits/save', outfitData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                alert('Outfit saved successfully! 🎉');
                loadSavedOutfits();
                setShowSaveModal(false);
                clearOutfit();
            }
        } catch (error) {
            console.error('Error saving outfit:', error);
            alert('Failed to save outfit. Please try again.');
        }
    };

    const loadOutfit = (outfit) => {
        setOutfitItems(outfit.items);
        setOutfitName(outfit.name);
    };

    const deleteOutfit = async (outfitId) => {
        if (!confirm('Are you sure you want to delete this outfit?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await axios.delete(`http://localhost:5000/api/outfits/${outfitId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                alert('Outfit deleted!');
                loadSavedOutfits();
            }
        } catch (error) {
            console.error('Error deleting outfit:', error);
            alert('Failed to delete outfit.');
        }
    };

    const categoryLabels = {
        top: 'Shirt/Top',
        bottom: 'Pants/Bottoms',
        shoes: 'Shoes',
        accessories: 'Accessories'
    };

    return (
        <div className="outfits-page">
            {/* Header */}
            <div className="outfit-header">
                <h1>Outfit Builder</h1>
                <p>Mix and match to create your perfect look</p>
            </div>

            {/* Main Builder */}
            <div className="outfit-builder-v2">
                {/* Mannequin Canvas */}
                <div className="mannequin-section">
                    <h2 className="canvas-title">Your Outfit Preview</h2>

                    <div className="mannequin-canvas">
                        {/* Mannequin Silhouette */}
                        <svg className="mannequin-silhouette" viewBox="0 0 200 400" xmlns="http://www.w3.org/2000/svg">
                            {/* Head */}
                            <ellipse cx="100" cy="30" rx="20" ry="25" fill="#E0E0E0" opacity="0.3" />
                            {/* Neck */}
                            <rect x="95" y="50" width="10" height="15" fill="#E0E0E0" opacity="0.3" />
                            {/* Torso */}
                            <path d="M 70 65 L 70 180 L 80 190 L 120 190 L 130 180 L 130 65 Z"
                                fill="#E0E0E0" opacity="0.3" />
                            {/* Arms */}
                            <rect x="50" y="70" width="20" height="100" rx="10" fill="#E0E0E0" opacity="0.3" />
                            <rect x="130" y="70" width="20" height="100" rx="10" fill="#E0E0E0" opacity="0.3" />
                            {/* Legs */}
                            <rect x="75" y="190" width="20" height="180" rx="8" fill="#E0E0E0" opacity="0.3" />
                            <rect x="105" y="190" width="20" height="180" rx="8" fill="#E0E0E0" opacity="0.3" />
                        </svg>

                        {/* Top Layer */}
                        {outfitItems.top && (
                            <div className="outfit-layer top-layer">
                                <img
                                    src={outfitItems.top.image}
                                    alt={outfitItems.top.name}
                                />
                                <button className="remove-layer-btn" onClick={() => removeItem('top')}>×</button>
                            </div>
                        )}

                        {/* Bottom Layer */}
                        {outfitItems.bottom && (
                            <div className="outfit-layer bottom-layer">
                                <img
                                    src={outfitItems.bottom.image}
                                    alt={outfitItems.bottom.name}
                                />
                                <button className="remove-layer-btn" onClick={() => removeItem('bottom')}>×</button>
                            </div>
                        )}

                        {/* Empty State Messages */}
                        {!outfitItems.top && (
                            <div className="empty-slot-indicator top-indicator">
                                <span>👔 Add Top</span>
                            </div>
                        )}
                        {!outfitItems.bottom && (
                            <div className="empty-slot-indicator bottom-indicator">
                                <span>👖 Add Bottom</span>
                            </div>
                        )}
                    </div>

                    {/* Selection Buttons */}
                    <div className="item-selector-buttons">
                        <button
                            className={`selector-btn ${outfitItems.top ? 'has-item' : ''}`}
                            onClick={() => openSearchModal('top')}
                        >
                            {outfitItems.top ? (
                                <>
                                    <img src={outfitItems.top.image} alt="" className="mini-thumb" />
                                    <span>Change Top</span>
                                </>
                            ) : (
                                <>
                                    <span className="btn-icon">👔</span>
                                    <span>Select Top</span>
                                </>
                            )}
                        </button>

                        <button
                            className={`selector-btn ${outfitItems.bottom ? 'has-item' : ''}`}
                            onClick={() => openSearchModal('bottom')}
                        >
                            {outfitItems.bottom ? (
                                <>
                                    <img src={outfitItems.bottom.image} alt="" className="mini-thumb" />
                                    <span>Change Bottom</span>
                                </>
                            ) : (
                                <>
                                    <span className="btn-icon">👖</span>
                                    <span>Select Bottom</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Item Details Panel */}
                    <div className="outfit-items-details">
                        {outfitItems.top && (
                            <div className="detail-item">
                                <span className="detail-label">Top:</span>
                                <span className="detail-name">{outfitItems.top.name}</span>
                                <span className="detail-price">{outfitItems.top.price}</span>
                            </div>
                        )}
                        {outfitItems.bottom && (
                            <div className="detail-item">
                                <span className="detail-label">Bottom:</span>
                                <span className="detail-name">{outfitItems.bottom.name}</span>
                                <span className="detail-price">{outfitItems.bottom.price}</span>
                            </div>
                        )}
                    </div>

                    {/* Summary & Actions */}
                    <div className="outfit-summary">
                        <div className="total-price">
                            <span>Total:</span>
                            <span className="price-value">₹{calculateTotal().toLocaleString()}</span>
                        </div>
                        <div className="outfit-actions">
                            <button className="btn-clear" onClick={clearOutfit}>
                                Clear All
                            </button>
                            <button
                                className="btn-save"
                                onClick={() => setShowSaveModal(true)}
                                disabled={calculateTotal() === 0}
                            >
                                Save Outfit
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Saved Outfits */}
            {savedOutfits.length > 0 && (
                <div className="saved-outfits-section">
                    <h2 className="section-title">Your Saved Outfits</h2>
                    <div className="saved-outfits-grid">
                        {savedOutfits.map(outfit => (
                            <div key={outfit.id} className="saved-outfit-card">
                                <div className="outfit-card-header">
                                    <h3>{outfit.name}</h3>
                                    <button className="delete-btn" onClick={() => deleteOutfit(outfit.id)}>🗑️</button>
                                </div>
                                <div className="outfit-preview-images">
                                    {Object.values(outfit.items).filter(item => item).map((item, idx) => (
                                        <img key={idx} src={item.image} alt={item.name} className="mini-preview" />
                                    ))}
                                </div>
                                <p className="outfit-total">₹{outfit.totalPrice?.toLocaleString() || 0}</p>
                                <button className="btn-load" onClick={() => loadOutfit(outfit)}>
                                    Load Outfit
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Search Modal */}
            {showSearchModal && (
                <div className="modal-overlay" onClick={closeSearchModal}>
                    <div className="modal-content-search" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Search {categoryLabels[searchCategory]}</h2>
                            <button className="close-modal-btn" onClick={closeSearchModal}>×</button>
                        </div>

                        <form className="modal-search-form" onSubmit={searchProducts}>
                            <input
                                type="text"
                                placeholder={`Search for ${categoryLabels[searchCategory].toLowerCase()}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                            <button type="submit" disabled={searching}>
                                {searching ? 'Searching...' : 'Search'}
                            </button>
                        </form>

                        <div className="modal-results">
                            {searching && <div className="modal-loading">Searching products...</div>}

                            {!searching && searchResults.length === 0 && searchQuery && (
                                <div className="modal-empty">
                                    <p>No products found. Try different keywords.</p>
                                </div>
                            )}

                            {!searching && searchResults.length > 0 && (
                                <div className="modal-products-grid">
                                    {searchResults.map(product => (
                                        <div
                                            key={product.id}
                                            className="modal-product-card"
                                            onClick={() => selectProduct(product)}
                                        >
                                            <img src={product.image} alt={product.name} />
                                            <div className="modal-product-info">
                                                <p className="modal-product-name">{product.name}</p>
                                                <p className="modal-product-price">{product.price}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Save Modal */}
            {showSaveModal && (
                <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Save Your Outfit</h2>
                        <input
                            type="text"
                            placeholder="Enter outfit name (e.g., Summer Casual)"
                            value={outfitName}
                            onChange={(e) => setOutfitName(e.target.value)}
                            className="outfit-name-input"
                        />
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowSaveModal(false)}>
                                Cancel
                            </button>
                            <button className="btn-confirm" onClick={saveOutfit}>
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OutfitsPage;
