# MySQL 部署文件

本目录包含 MySQL Docker 部署和运维相关文件。

## 目录结构

```
deploy/mysql/
├── docker-compose.mysql.yml   # 独立 MySQL 部署（仅数据库）
├── conf/my.cnf                # MySQL 自定义配置
├── initdb/01-init.sql         # 首次启动初始化脚本
├── backup.sh                  # 数据库备份脚本
├── restore.sh                 # 数据库恢复脚本
├── backup/                    # 备份文件目录
├── .env                       # MySQL 独立部署环境变量
└── README.md                  # 本文件
```

## 快速启动

```bash
# 先在 .env 中设置镜像（国内网络建议）
# MYSQL_IMAGE=docker.m.daocloud.io/mysql:8.0

# 独立启动 MySQL
docker compose -f docker-compose.mysql.yml --env-file .env up -d

# 验证
docker exec -it cccode-mysql mysql -ucccode -p'CCcode@2024' cccode -e "SELECT 1"
```

## 完整文档

详细的升级流程、数据迁移、备份恢复、故障排查等请参阅：

**[docs/mysql-upgrade-guide.md](../../docs/mysql-upgrade-guide.md)**
