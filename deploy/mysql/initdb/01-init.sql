-- 初始化脚本：MySQL 首次启动时自动执行
-- 确保数据库使用 utf8mb4 编码
ALTER DATABASE cccode CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 授予应用用户完整权限
GRANT ALL PRIVILEGES ON cccode.* TO 'cccode'@'%';
FLUSH PRIVILEGES;
