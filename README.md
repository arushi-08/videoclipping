# Video Editing AI Application

A web-based video editing platform powered by AI and modern Python tools.  
Supports actions such as removing duplicates, adding captions, and overlaying music, with a modular backend and a responsive frontend.

---

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

- Python 3.12
- [FFmpeg](https://ffmpeg.org/) installed and available in your system PATH

### Installation

1. **Clone the repository**
    ```
    git clone https://github.com/yourusername/video-editing-ai.git
    cd video-editing-ai
    ```

2. **Install Python dependencies**
    ```
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```

### Running the Application

1. **Start the backend server**
    ```
    uvicorn app.main:app --reload
    ```

2. **Open the frontend**
    - Open `index.html` in your browser, or
    - If served via FastAPI, visit [http://localhost:8000](http://localhost:8000)

---

## Usage

1. **Upload a video** using the web interface.
2. **Choose an action** (Remove Duplicates, Add Captions, Add Music, or AI Edit).
3. **Preview the processed video** directly in the browser.
4. **Download the final result**.

---

## Troubleshooting

- **Video Freezes After Processing:**  
  Ensure you are not overwriting the input file during processing. Always write to a new output file.
- **Processing Loader Doesn’t Stop:**  
  Check the frontend JavaScript for proper hiding of spinner overlays in the `finally` block.
- **Captions Not Visible in Preview:**  
  Add a cache-busting query (e.g., `?t=timestamp`) to the video preview URL to force reload.
- **HTTP 416 Error:**  
  Indicates a corrupted or incomplete video file. Check your processing pipeline and output file handling.

---

## Development

- **Backend code:** See `app/` directory
- **Frontend code:** See `static/` and `templates/`
- **Processing logic:** See `app/video_processing.py`

### Running Tests

