@echo off
REM تشغيل الباكند - يستخدم JDK 17 و Maven Wrapper (mvnw)
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "%~dp0"
mvnw.cmd spring-boot:run
pause
