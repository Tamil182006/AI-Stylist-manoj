import { useState } from 'react';
import axios from 'axios';

const UploadForm = ({ setResult, setLoading, setError, loading }) => {
    const [file, setFile] = useState(null);
    const [occasion, setOccasion] = useState('Casual');
    const [preview, setPreview] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        if (selectedFile) {
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        setError('');
        const formData = new FormData();
        formData.append('image', file);
        formData.append('occasion', occasion);

        try {
            const response = await axios.post('http://localhost:5000/api/analyze', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setResult(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="upload-card">
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Select Occasion:</label>
                    <select value={occasion} onChange={(e) => setOccasion(e.target.value)}>
                        <option value="Casual">Casual</option>
                        <option value="Semi-Formal">Semi-Formal</option>
                        <option value="Formal">Formal</option>
                    </select>
                </div>

                <div className="drop-zone">
                    <input type="file" accept="image/*" onChange={handleFileChange} />
                    {preview ? (
                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                            <img src={preview} alt="Preview" className="image-preview" />
                            <div style={{ position: 'absolute', bottom: '10px', left: '0', right: '0', textAlign: 'center', background: 'rgba(0,0,0,0.7)', padding: '5px', borderRadius: '4px' }}>Click to Change</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: '#aaa' }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            <p style={{ margin: 0 }}>Tap to Upload or Drag Photo</p>
                        </div>
                    )}
                </div>

                <button type="submit" disabled={loading || !file} className="btn-primary">
                    {loading ? 'Analyzing your look...' : 'Start Stylist Analysis'}
                </button>
            </form>
        </div>
    );
};

export default UploadForm;
