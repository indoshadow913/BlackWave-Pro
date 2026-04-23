# Usar imagen base de Node.js 20
FROM node:20-slim

# Instalar Python y dependencias necesarias para yt-dlp
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instalar yt-dlp globalmente
RUN pip3 install --no-cache-dir yt-dlp

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias de Node.js
RUN npm ci --only=production

# Copiar el resto del código
COPY . .

# Exponer puerto
EXPOSE 10000

# Comando para iniciar la aplicación
CMD ["node", "src/index.js"]
