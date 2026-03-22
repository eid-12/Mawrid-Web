# المرحلة الأولى: البناء
FROM node:20-alpine AS build 
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# السطر السحري: إعطاء صلاحية التنفيذ لمجلد node_modules
RUN chmod -R +x node_modules/.bin

RUN npm run build

# المرحلة الثانية: التشغيل على بورت 3000
FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
