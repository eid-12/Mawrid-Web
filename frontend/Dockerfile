# المرحلة الأولى: البناء
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# المرحلة الثانية: التشغيل على بورت 3000
FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 3000
# تشغيل السيرفر على بورت 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
