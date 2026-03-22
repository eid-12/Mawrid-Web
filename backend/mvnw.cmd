@REM Maven Wrapper script for Windows
@REM Run from project root: mvnw.cmd spring-boot:run

setlocal
set MAVEN_PROJECTBASEDIR=%~dp0
set WRAPPER_JAR="%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.jar"
set WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain

if not exist "%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.jar" (
  echo Downloading Maven Wrapper...
  powershell -NoProfile -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.3.2/maven-wrapper-3.3.2.jar' -OutFile '%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.jar' -UseBasicParsing }"
)

if not exist "%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.jar" (
  echo Failed to download Maven Wrapper. Please run from IDE or install Maven.
  exit /b 1
)

if "%JAVA_HOME%"=="" (
  echo JAVA_HOME is not set.
  exit /b 1
)

"%JAVA_HOME%\bin\java" -Dmaven.multiModuleProjectDirectory="%MAVEN_PROJECTBASEDIR%" -jar "%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.jar" %*
endlocal
