# Video Editing AI Application

A web-based video editing platform powered by AI and LangGraph.  
Supports actions such as removing duplicates, adding captions, and overlaying music, with a modular backend and a responsive frontend.

---

[![Watch the video](https://img.youtube.com/vi/0Re9DLinMQc/hqdefault.jpg)](https://www.youtube.com/embed/0Re9DLinMQc)


## Features

- **Remove Duplicates:** Automatically detects and removes duplicate video segments.
- **Add Captions:** Generates and burns captions onto your videos using AI.
- **Add Music:** Overlays background music, with adjustable volume and seamless looping.
- **AI Edit:** Combine multiple actions in a single pipeline, orchestrated by an AI agent.
- **Add Broll clips:** Automatically add b-rolls by specifying the keywords and providing clips for those keywords.
- Instantly preview processed videos and download the results.

---

## Tech Stack

- **Backend:** Python, FastAPI, LangGraph, MoviePy, FFmpeg
- **Frontend:** HTML, JavaScript, Bootstrap
- **AI/LLM Integration:** Supports tool calling and Model Context Protocol (MCP)
- **Video Processing:** MoviePy, FFmpeg

---

## Getting Started

### Prerequisites
- Python 3.11+
- FFmpeg installed on your system
- Required Python packages (see requirements.txt)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd video-editor
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. **Set up environment variables**
    Create a `.env` file in the project root with your API keys:
    ```
    API_KEY=your_actual_api_key_here
    BASE_URL=your_base_url_here
    MODEL_NAME=your_model_name_here
    ```
    
    **Note:** Never commit your `.env` file to version control. The `.gitignore` file is configured to exclude it.

4. Run the application:
```bash
python app/main.py
```

5. Open your browser and navigate to `http://localhost:8000`

## UI Features

### Upload Interface
- **Drag & Drop Zone**: Large, visually appealing upload area
- **File Validation**: Automatic file type checking
- **Preview Player**: Immediate video preview after upload
- **Progress Indicators**: Visual feedback during upload process

### Processing Interface
- **Feature Cards**: Organized editing tools in card layout
- **AI Assistant**: Prominent AI editing section with natural language input
- **Real-time Controls**: Volume sliders and parameter inputs
- **Processing Overlay**: Animated loading screen with progress ring

### Output Interface
- **Enhanced Alerts**: Professional success/error messages with icons
- **Download Buttons**: Easy access to processed videos
- **Step Completion**: Visual confirmation of processing steps

## Usage

### Basic Workflow
1. **Upload**: Drag and drop or click to upload your video file
2. **Edit**: Choose from AI-powered editing or manual tools
3. **Process**: Wait for processing to complete
4. **Download**: Get your enhanced video

### AI Editing Examples
- "Add background music at 30% volume, then add captions with size 28 font"
- "Remove duplicate frames and add upbeat music"
- "Generate captions and insert nature B-roll footage"

### Manual Tools
- **Remove Duplicates**: Set threshold (0.01-0.99) for similarity detection
- **Add Captions**: Specify font size for auto-generated captions
- **Add Music**: Upload audio file and adjust volume (0-100%)
- **Add B-roll**: Enter keywords separated by commas

## Technical Details

### Frontend
- **Bootstrap 5**: Modern CSS framework
- **Bootstrap Icons**: Professional icon set
- **Google Fonts**: Inter font family for clean typography
- **CSS Custom Properties**: Consistent theming with CSS variables
- **Responsive Design**: Mobile-first approach

### Backend
- **FastAPI**: Modern Python web framework
- **FFmpeg**: Video processing engine
- **AI Integration**: Natural language processing for editing commands
- **File Management**: Organized upload and processing pipeline

### Design System
- **Color Palette**: Professional indigo/cyan gradient theme
- **Typography**: Inter font with proper hierarchy
- **Spacing**: Consistent 8px grid system
- **Shadows**: Subtle depth with CSS box-shadows
- **Animations**: Smooth transitions and hover effects

## 🚀 Deployment

### Option 1: Deploy to Railway (Recommended)

1. **Fork this repository** to your GitHub account

2. **Sign up for Railway** at [railway.app](https://railway.app)

3. **Connect your GitHub repository** to Railway

4. **Set up environment variables** in Railway:
   - `API_KEY`: Your API key
   - `BASE_URL`: Your API base URL
   - `MODEL_NAME`: Your model name

5. **Deploy automatically** - Railway will deploy on every push to main

### Option 2: Deploy to Render

1. **Sign up for Render** at [render.com](https://render.com)

2. **Create a new Web Service**

3. **Connect your GitHub repository**

4. **Configure the service:**
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

5. **Set environment variables** in Render dashboard

### Option 3: Deploy to Heroku

1. **Sign up for Heroku** at [heroku.com](https://heroku.com)

2. **Install Heroku CLI** and login

3. **Create a new Heroku app**:
   ```bash
   heroku create your-app-name
   ```

4. **Deploy**:
   ```bash
   git push heroku main
   ```

5. **Set environment variables**:
   ```bash
   heroku config:set API_KEY=your_api_key
   heroku config:set BASE_URL=your_base_url
   heroku config:set MODEL_NAME=your_model_name
   ```

## 🌐 Live Demo

Once deployed, your application will be available at:
- **Railway**: `https://your-app-name.railway.app`
- **Render**: `https://your-app-name.onrender.com`
- **Heroku**: `https://your-app-name.herokuapp.com`

---

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request


