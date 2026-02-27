# 设置 JDK
$env:JAVA_HOME = "C:\Users\fjk\.jdks\openjdk-25.0.2"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

# Maven 安装目录
$mavenDir = "$env:USERPROFILE\.maven\apache-maven-3.9.6"
$mavenZip = "$env:TEMP\apache-maven-3.9.6-bin.zip"
$mavenUrl = "https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip"

if (-not (Test-Path "$mavenDir\bin\mvn.cmd")) {
    Write-Host "正在下载 Apache Maven 3.9.6..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $mavenUrl -OutFile $mavenZip -UseBasicParsing
    Write-Host "正在解压..." -ForegroundColor Cyan
    Expand-Archive -Path $mavenZip -DestinationPath "$env:USERPROFILE\.maven" -Force
    Remove-Item $mavenZip
    Write-Host "Maven 安装完成: $mavenDir" -ForegroundColor Green
} else {
    Write-Host "Maven 已存在，跳过下载。" -ForegroundColor Green
}

$env:Path = "$mavenDir\bin;$env:Path"

Write-Host "Java 版本:" -ForegroundColor Cyan
java -version

Write-Host "Maven 版本:" -ForegroundColor Cyan
mvn -version

Write-Host ""
Write-Host "启动设备管理系统..." -ForegroundColor Cyan
Write-Host "启动后访问: http://localhost:8080" -ForegroundColor Yellow
Write-Host ""

Set-Location $PSScriptRoot
mvn spring-boot:run
