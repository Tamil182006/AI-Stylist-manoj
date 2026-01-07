# AI-Based Personal Styling Assistant 🎨👔

A full-stack MERN application that serves as a personal stylist. It analyzes facial features (Face Shape & Skin Tone) using Computer Vision (Python + MediaPipe) and provides rule-based fashion recommendations for different occasions.

## 🚀 Technologies Used

*   **Frontend**: React JS (Vite)
*   **Backend**: Node.js, Express.js
*   **Database**: MongoDB
*   **AI/ML**: Python, MediaPipe, OpenCV
*   **Communication**: `child_process` (Node executes Python)

## 📂 Project Structure

```
ai-stylist-project/
├── backend/
│   ├── models/       # Mongoose Schemas
│   ├── python/       # ML Scripts (face_analysis.py)
│   ├── routes/       # API Routes
│   ├── uploads/      # Image storage
│   └── server.js     # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   └── App.jsx
│   └── package.json
└── README.md
```

## 🛠️ Setup Instructions

### Prerequisites
1.  Node.js installed
2.  Python 3.x installed
3.  MongoDB installed and running locally

### 1. Backend Setup
1.  Navigate to backend: `cd backend`
2.  Install Node dependencies:
    ```bash
    npm install
    ```
3.  Install Python dependencies:
    ```bash
    pip install opencv-python mediapipe numpy
    ```
4.  Start server:
    ```bash
    node server.js
    ```
    *Server runs on http://localhost:5000*

### 2. Frontend Setup
1.  Open a new terminal.
2.  Navigate to frontend: `cd frontend`
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Start React app:
    ```bash
    npm run dev
    ```
    *App runs on http://localhost:5173*

## 🧠 How It Works

1.  **Upload**: User uploads an image via React Frontend.
2.  **Process**: Node.js saves the image to `backend/uploads`.
3.  **Analyze**: Node.js calls `face_analysis.py` using `child_process`.
4.  **AI Logic**:
    *   **Face Detect**: MediaPipe FaceMesh detects landmarks.
    *   **Shape**: Ratios of Jaw width vs Face Length vs Forehead width determine if face is Oval, Round, Square, etc.
    *   **Skin Tone**: Average HSV color value of cheek area determines Fair, Medium, or Dark tone.
5.  **Recommend**: Python converts analysis into styling rules (e.g., "Round face needs height -> Pompadour").
6.  **Response**: JSON data is sent back to React to display results.

## 📸 Sample Output

**Input**: A photo of a person with an Oval face and Medium skin tone.
**Ouput**:
*   **Face Shape**: Oval
*   **Skin Tone**: Medium
*   **Recommendation**: "Navy blue suit" (Formal) or "Tan blazer" (Semi-Formal).

---
*Created for Final Year / Mini Project Submission*
