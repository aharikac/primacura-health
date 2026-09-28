# Stage 1: Build environment
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies required by OpenAI Whisper
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('pritamdeka/S-PubMedBert-MS-MARCO').save('./models/S-PubMedBert-MS-MARCO')"
RUN python -c "import whisper; whisper.load_model('base')"

# Copy backend source code
COPY pchService.py pchCore.py ./

# The backend expects the dataset in a 'data' subdirectory relative to the repository root
COPY data/First_Aid_Dataset_Final.csv ./data/First_Aid_Dataset_Final.csv

# Expose the API port
EXPOSE 8000

# Run the FastAPI service on all network interfaces
CMD ["uvicorn", "pchService:app", "--host", "0.0.0.0", "--port", "8000"]