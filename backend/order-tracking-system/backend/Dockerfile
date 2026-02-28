# backend/Dockerfile
FROM node:18-alpine

# Install dependencies required for building packages
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    netcat-openbsd

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./

# First install PDFKit without canvas (to avoid the build issues)
RUN npm install pdfkit --no-save

# Then install everything else
RUN npm install

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5050

# Command to run the application
CMD ["npm", "start"]