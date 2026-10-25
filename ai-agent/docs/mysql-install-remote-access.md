# Ubuntu 云服务器安装 MySQL 并从本地电脑远程连接

适用环境：

| 项目 | 值 |
| --- | --- |
| 服务器系统 | Ubuntu 20.04 / 22.04 / 24.04（apt 安装的是 MySQL 8.0） |
| SSH 登录用户 | `test001`（已验证具备 sudo 权限，见 `.github/workflows/deploy.yml` 中的 `sudo nginx -t`） |
| 服务器公网 IP | 见 GitHub 环境 Secret `SSH_HOST`（本文用 `<SERVER_IP>` 代替） |
| 本地电脑 | Windows 11 |

---

## 0. 先选连接方案

| 方案 | 安全性 | 改动量 | 适用 |
| --- | --- | --- | --- |
| **A. SSH 隧道**（推荐） | 高，3306 不暴露公网 | 只建数据库用户 | 日常开发、Navicat/DBeaver 调试 |
| B. 直接暴露 3306 | 低，公网可扫描 | 改 bind-address + 防火墙 + 云安全组 | 有明确来源 IP 且必须直连时 |

**建议先按方案 A 做。** 它跳过第 4 节的大部分步骤，服务器 MySQL 保持只监听 `127.0.0.1`，公网扫不到端口。你已经有可用的 SSH 访问（GitHub Actions 在用），不需要额外配置服务端。

---

## 1. 安装 MySQL

用 `test001` SSH 登录服务器后执行。

```bash
# 1.1 更新索引
sudo apt update

# 1.2 确认没有残留的 MariaDB（与 MySQL 冲突，装过就得先卸）
dpkg -l | grep -Ei 'mariadb|mysql-server' || echo "干净，可以继续"

# 1.3 安装
sudo apt install -y mysql-server
```

安装过程**不会**弹出设置 root 密码的界面（Ubuntu 的打包方式如此），root 走 `auth_socket` 插件，靠系统用户身份免密登录。这是正常的，不是安装失败。

```bash
# 1.4 确认服务已启动并设为开机自启
sudo systemctl status mysql --no-pager
sudo systemctl enable mysql
```

`status` 里看到 `active (running)` 即成功。

---

## 2. 基础安全加固

```bash
sudo mysql_secure_installation
```

按提示逐项回答：

| 提示 | 建议 |
| --- | --- |
| `VALIDATE PASSWORD COMPONENT`? | 生产环境输入 `y` 并选等级 1 或 2；只是练手可 `n` |
| 设置 root 密码 | 可设。注意设了之后 `sudo mysql` 仍能免密进（auth_socket 优先） |
| `Remove anonymous users`? | **y** |
| `Disallow root login remotely`? | **y** |
| `Remove test database`? | **y** |
| `Reload privilege tables now`? | **y** |

---

## 3. 创建专用的远程用户

**不要用 root 做远程连接。** 新建一个业务账号。

```bash
sudo mysql
```

进入 MySQL 提示符后（把 `YourPasswordHere` 换成你自己的强密码）：

```sql
-- 建库（按需修改库名）
CREATE DATABASE IF NOT EXISTS myapp
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

-- 建用户
-- '%' 表示允许任意来源 IP；方案 A 用不到它，但先建好，方案 B 可直接复用
CREATE USER IF NOT EXISTS 'appuser'@'%'
    IDENTIFIED BY 'YourPasswordHere';

-- 只授权到需要的库，不要 ALL ON *.*
GRANT ALL PRIVILEGES ON myapp.* TO 'appuser'@'%';

FLUSH PRIVILEGES;

-- 核对
SELECT user, host, plugin FROM mysql.user WHERE user = 'appuser';
```

退出：`EXIT;`

### 关于认证插件（连不上时先看这里）

上面 `SELECT` 的 `plugin` 列若为 `caching_sha2_password`（MySQL 8 默认），新版 Navicat / DBeaver / DataGrip 都支持，无需改动。

只有当客户端报 `Authentication plugin 'caching_sha2_password' cannot be loaded` 时，才降级：

```sql
ALTER USER 'appuser'@'%'
    IDENTIFIED WITH mysql_native_password BY 'YourPasswordHere';
FLUSH PRIVILEGES;
```

注意 `mysql_native_password` 在 MySQL 8.4+ 已默认禁用。优先升级客户端，而不是降级认证方式。

---

## 4. 开放远程访问

### 方案 A：SSH 隧道（推荐，服务端零改动）

MySQL 继续只监听 `127.0.0.1`。在**本地 Windows** 的 PowerShell 或 Git Bash 里建隧道：

```bash
ssh -N -L 3306:127.0.0.1:3306 test001@<SERVER_IP>
```

参数含义：`-N` 不执行远端命令、`-L 本地端口:目标地址:目标端口`。这个窗口保持开着别关。

然后本地工具连：

```
主机 127.0.0.1   端口 3306   用户 appuser   密码 YourPasswordHere
```

如果 3306 在本地已被占用（比如本机也装了 MySQL），把本地端口换掉即可，例如 `-L 13306:127.0.0.1:3306`，工具里填 `13306`。

GUI 工具里也有等价入口，不用开命令行：

- Navicat：连接属性 → **SSH** 标签页 → 勾选「使用 SSH 隧道」，填 `SSH 主机 = <SERVER_IP>`、端口 22、用户名 `test001`、认证方式选公钥并指向你的私钥文件
- DBeaver：连接设置 → **SSH** 标签页 → 勾选「Use SSH Tunnel」，同上

> 本地用的私钥就是 GitHub Secret `SSH_PRIVATE_KEY` 对应的那一把。若不确定本地有没有，看 `C:\Users\12512\.ssh\` 目录。

### 方案 B：直接暴露 3306

**必须同时完成下面 3 步，缺一连不上。**

**B-1 修改监听地址**

```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

找到 `[mysqld]` 段里的 `bind-address`，改为：

```ini
[mysqld]
bind-address = 0.0.0.0
```

保存退出（nano 里 `Ctrl+O` 回车、`Ctrl+X`）。

```bash
sudo systemctl restart mysql

# 验证：应显示 0.0.0.0:3306，而不是 127.0.0.1:3306
sudo ss -tlnp | grep 3306
```

**B-2 服务器防火墙**

先确认 ufw 状态：

```bash
sudo ufw status
```

- 显示 `inactive`：跳过本步。
- 显示 `active`：**优先只放行你自己的 IP**，不要直接对全网开：

  ```bash
  # 查你本地的公网 IP
  # 本地浏览器打开 https://ip.cn 或执行 curl ifconfig.me

  sudo ufw allow from <你的本地公网IP> to any port 3306 proto tcp
  ```

  家庭宽带通常是动态 IP，变了要重新加规则。嫌麻烦可以 `sudo ufw allow 3306/tcp`，但等于对全网开放，务必配合强密码 + 限制用户 host。

**B-3 云厂商安全组（最容易漏）**

Ubuntu 里的防火墙和云安全组是**两道独立的门**，只开前者照样连不上。

阿里云 ECS 控制台 → 实例 → 安全组 → 配置规则 → **入方向** → 手动添加：

| 端口范围 | 授权对象 | 说明 |
| --- | --- | --- |
| `3306/3306` | `<你的本地公网IP>/32` | 推荐，精确到单机 |
| `3306/3306` | `0.0.0.0/0` | 不推荐，公网会持续被扫描爆破 |

腾讯云 / AWS 同理，找「安全组 / 防火墙」的入方向规则。

---

## 5. 本地电脑连接

### 命令行

Windows 11 自带 OpenSSH 客户端，但 **MySQL 客户端要单独装**：

```powershell
winget install Oracle.MySQLClient
```

装完新开一个终端：

```bash
# 方案 A（走了 SSH 隧道，所以连 127.0.0.1）
mysql -h 127.0.0.1 -P 3306 -u appuser -p

# 方案 B
mysql -h <SERVER_IP> -P 3306 -u appuser -p
```

`-p` 后不带值，回车后交互输密码，避免密码进 shell 历史。

### GUI

Navicat / DBeaver / DataGrip 均可，参数：

```
主机    127.0.0.1（方案 A）或 <SERVER_IP>（方案 B）
端口    3306
数据库  myapp
用户    appuser
密码    YourPasswordHere
```

---

## 6. 故障排查

先分清是哪一层的问题，从服务器往外逐层验证：

```bash
# ① 服务活着吗
sudo systemctl status mysql --no-pager

# ② 监听地址对不对
sudo ss -tlnp | grep 3306

# ③ 服务器上自查，能连说明 MySQL 本身和账号密码没问题
mysql -u appuser -p -h 127.0.0.1

# ④ 服务器自己的防火墙有没有放行
sudo ufw status verbose

# ⑤ 看实时日志，本地一发起连接就有反应
sudo journalctl -u mysql -f
```

按现象定位：

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `Can't connect to MySQL server (10060/10061)` | 网络层不通 | 依次查 ufw（B-2）、云安全组（B-3）、`bind-address`（B-1） |
| `Connection timed out` | 大概率云安全组没开 | 回到 B-3 |
| `Connection refused` | 端口没监听或被防火墙 REJECT | 查 `ss -tlnp` 和 ufw |
| `Access denied for user 'appuser'@'<某个IP>'` | 网络已通，是授权问题 | host 不匹配，见下方说明 |
| `Host 'x.x.x.x' is not allowed to connect` | 该 host 没授权 | 见下方说明 |

**`Access denied` 的关键点**：MySQL 的权限是 `用户名 + 来源host` 组合。报错信息里会把**它实际看到的你的 IP** 打出来，照着它建用户最省事：

```sql
CREATE USER 'appuser'@'<报错里的那个IP>' IDENTIFIED BY 'YourPasswordHere';
GRANT ALL PRIVILEGES ON myapp.* TO 'appuser'@'<报错里的那个IP>';
FLUSH PRIVILEGES;
```

注意：如果同时存在 `'appuser'@'localhost'` 和 `'appuser'@'%'`，从服务器本机连接时 MySQL 优先匹配 `localhost` 那条，容易出现"密码明明对却进不去"。用 `SELECT user, host FROM mysql.user;` 检查。

---

## 7. 安全清单

- [ ] 已关闭 root 远程登录（第 2 节选了 y）
- [ ] 远程用的是专用账号 `appuser`，不是 root
- [ ] 授权范围限定到具体库，不是 `GRANT ALL ON *.*`
- [ ] 密码足够长且随机，不是 `123456` / `test001`
- [ ] 若走方案 B，安全组授权对象精确到 `/32` 而不是 `0.0.0.0/0`
- [ ] 数据库密码没有提交进 Git

最后一条要留意：本项目有 `.env.production`。数据库连接串属于敏感信息，应放在服务器上或 CI 的 Secrets 里，不要写进会提交的文件。参考现有做法——`SSH_HOST` 等就是配在 GitHub Environment Secrets 而不是仓库里。

---

## 8. 常用运维命令速查

```bash
sudo systemctl start|stop|restart|status mysql   # 服务控制
sudo mysql -e "SELECT VERSION();"                # 查版本
sudo du -sh /var/lib/mysql                        # 数据目录占用
crontab -e                                        # 编辑定时任务（做备份用）
```

备份单个库：

```bash
mysqldump -u appuser -p --single-transaction --default-character-set=utf8mb4 \
    myapp > myapp_$(date +%Y%m%d).sql
```

恢复：

```bash
mysql -u appuser -p myapp < myapp_20240101.sql
```
