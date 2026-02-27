@REM ----------------------------------------------------------------------------
@REM Maven Wrapper startup batch script
@REM ----------------------------------------------------------------------------
@IF "%__MVNW_ARG0_NAME__%"=="" (SET "MVN_CMD=mvn.cmd") ELSE (SET "MVN_CMD=%__MVNW_ARG0_NAME__%")
@SET WRAPPER_JAR="%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar"
@SET WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain
@SET DOWNLOAD_URL="https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar"

@FOR /F "usebackq tokens=1,2 delims==" %%A IN ("%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.properties") DO (
    @IF "%%A"=="wrapperUrl" SET DOWNLOAD_URL=%%B
)

@SET JAVA_HOME=%USERPROFILE%\.jdks\openjdk-25.0.2
@SET JAVA_CMD="%JAVA_HOME%\bin\java.exe"

@IF NOT EXIST %WRAPPER_JAR% (
    @echo Downloading Maven Wrapper...
    %JAVA_CMD% -classpath "%JAVA_HOME%\lib" ^
        -Dmaven.multiModuleProjectDirectory="%MAVEN_PROJECTBASEDIR%" ^
        -classpath "%JAVA_HOME%\lib" ^
        org.apache.maven.wrapper.DownloadFile %DOWNLOAD_URL% %WRAPPER_JAR% 2>NUL
    @IF ERRORLEVEL 1 (
        powershell -Command "Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%WRAPPER_JAR%'"
    )
)

%JAVA_CMD% ^
  -classpath %WRAPPER_JAR% ^
  "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" ^
  %WRAPPER_LAUNCHER% %MAVEN_CONFIG% %*
