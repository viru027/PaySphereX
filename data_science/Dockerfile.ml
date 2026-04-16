# data_science/Dockerfile.ml
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p models/saved_models etl/processed etl/raw_data
EXPOSE 8000
CMD ["uvicorn", "ml_api:app", "--host", "0.0.0.0", "--port", "8000"]
