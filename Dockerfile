# Usar imagen base de Node.js 20
FROM node:20-slim

# Instalar Python y dependencias necesarias para yt-dlp
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Instalar yt-dlp globalmente y verificar
RUN pip3 install --no-cache-dir yt-dlp && \
    which yt-dlp && \
    yt-dlp --version

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias de Node.js
RUN npm ci --only=production

# Copiar el resto del código
COPY . .

# Crear directorio de descargas
RUN mkdir -p public/downloads && chmod 777 public/downloads

# Exponer puerto
EXPOSE 10000

# Verificar que yt-dlp está disponible antes de iniciar
RUN echo "yt-dlp location:" && which yt-dlp && yt-dlp --version

# Comando para iniciar la aplicación
CMD ["node", "src/index.js"]
