# Dockerfile для развертывания платформы «Управленческие кадры Кузбасса»
FROM node:22-alpine

WORKDIR /app

# Копируем описание зависимостей и устанавливаем
COPY package*.json ./
RUN npm ci --only=production

# Копируем исходный код приложения
COPY . .

# Создаем директории для постоянного хранения данных и файлов
RUN mkdir -p data uploads

# Порт по умолчанию
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Запуск приложения
CMD ["npm", "start"]
