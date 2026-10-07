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
COPY pchService.py pchCore.py pchTriage.py pchLLM.py pchGate.py ./

# The backend expects the dataset in a 'data' subdirectory relative to the repository root
COPY data/First_Aid_Dataset_Final.csv ./data/First_Aid_Dataset_Final.csv
# Everyday phrasings the condition classifier (pchTriage) trains on at startup
COPY data/master-training-examples.csv ./data/master-training-examples.csv
# Nonsense filter (pchGate): junk / real examples and the emergency words
COPY data/master-gate-examples.csv ./data/master-gate-examples.csv
COPY data/emergency-words.txt ./data/emergency-words.txt

# Expose the API port
EXPOSE 8000

# Run the FastAPI service on all network interfaces
CMD ["uvicorn", "pchService:app", "--host", "0.0.0.0", "--port", "8000"]