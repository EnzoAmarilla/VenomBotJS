# Imagen base
FROM node:18

# Instalar Chromium (que Venom necesita)
RUN apt-get update && apt-get install -y chromium

# Definir directorio de trabajo
WORKDIR /app

# Copiar package.json y lock primero (para cache de dependencias)
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer un puerto (Render necesita que escuche algo)
EXPOSE 3000

# Comando por defecto
CMD ["npm", "start"]