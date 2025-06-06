# Use Python 3.11 slim image as base
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    curl \
    git \
    nano \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Install common Python packages
RUN pip install --no-cache-dir \
    matplotlib \
    pandas \
    numpy \
    seaborn \
    plotly \
    scipy \
    scikit-learn \
    requests \
    pillow \
    opencv-python-headless \
    jupyter \
    ipython

# Create directories for user files
RUN mkdir -p /app/user_files /app/outputs

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Create a non-root user for security
RUN useradd -m -s /bin/bash codeuser && \
    chown -R codeuser:codeuser /app

USER codeuser

# Keep container running
CMD ["tail", "-f", "/dev/null"]
