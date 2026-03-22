# المرحلة الأولى: البناء
FROM node:20-alpine AS build 
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# السطر السحري: إعطاء صلاحية التنفيذ لمجلد node_modules
RUN chmod -R +x node_modules/.bin

RUN npm run build

# المرحلة الثانية: التشغيل عبر Nginx على بورت 3000
FROM nginx:alpine
WORKDIR /app
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
