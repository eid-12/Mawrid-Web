# المرحلة الأولى: بناء التطبيق باستخدام Maven
FROM maven:3.8.4-openjdk-17 AS build
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

# المرحلة الثانية: تشغيل التطبيق
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
# نسخ ملف الـ jar الناتج من المرحلة الأولى
COPY --from=build /app/target/*.jar app.jar
# تشغيل التطبيق مباشرة
ENTRYPOINT ["java","-jar","app.jar"]
