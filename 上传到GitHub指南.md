# 上传到 GitHub 指南

## 第一步：安装 Git

### 下载 Git

1. 访问 Git 官网：https://git-scm.com/download/win
2. 点击 "Click here to download" 下载安装包
3. 运行下载的 `.exe` 安装文件

### 安装选项

安装过程中选择以下选项：

- ✅ **推荐选项全部勾选**
- ✅ 添加 Git Bash 到 Windows Terminal（可选）
- ✅ 使用 Nano 作为默认编辑器（更容易使用）
- ✅ 覆盖系统 Git 配置（推荐）

### 验证安装

安装完成后，打开新的 PowerShell 窗口，输入：

```powershell
git --version
```

应该显示类似：`git version 2.40.0.windows.1`

---

## 第二步：配置 Git

### 设置用户名和邮箱

打开 PowerShell，输入：

```powershell
git config --global user.name "你的GitHub用户名"
git config --global user.email "你的GitHub邮箱"
```

### 生成 SSH 密钥（推荐）

```powershell
ssh-keygen -t rsa -C "你的GitHub邮箱"
```

按回车3次，会在 `C:\Users\你的用户名\.ssh\` 生成：
- `id_rsa`（私钥）
- `id_rsa.pub`（公钥）

### 添加 SSH 公钥到 GitHub

1. 打开 GitHub：https://github.com
2. 点击右上角头像 → **Settings**
3. 左侧菜单点击 **SSH and GPG keys**
4. 点击 **New SSH key**
5. 标题随意填写（如：`我的电脑`）
6. 打开 `C:\Users\你的用户名\.ssh\id_rsa.pub` 文件，复制全部内容
7. 粘贴到 Key 框中
8. 点击 **Add SSH key**

---

## 第三步：创建 GitHub 仓库

### 在线创建

1. 打开 GitHub：https://github.com
2. 点击右上角 **+** → **New repository**
3. 填写信息：
   - **Repository name**: `LYSHLbot`
   - **Description**: `OneBot 协议 QQ 机器人框架`
   - **Public** 或 **Private**（公开/私有）
   - ✅ **Initialize this repository with a README**
4. 点击 **Create repository**

### 复制仓库地址

创建成功后，页面会显示仓库地址，类似：
```
https://github.com/你的用户名/LYSHLbot.git
```

---

## 第四步：上传代码

### 打开项目目录

```powershell
cd d:\ST\LYSHLbot
```

### 初始化 Git 仓库

```powershell
git init
```

### 添加远程仓库

```powershell
git remote add origin https://github.com/你的用户名/LYSHLbot.git
```

### 创建 .gitignore 文件

项目已经包含 `.gitignore`，会排除 `node_modules` 等文件。

### 添加所有文件

```powershell
git add .
```

### 提交代码

```powershell
git commit -m "Initial commit - LYSHLbot v1.0.0"
```

### 推送到 GitHub

```powershell
git branch -M main
git push -u origin main
```

如果是第一次推送，可能需要输入 GitHub 用户名和密码（或 Access Token）。

---

## 第五步：验证上传

1. 打开 https://github.com/你的用户名/LYSHLbot
2. 应该能看到所有代码文件

---

## 常见问题

### 问题 1：提示需要登录

如果推送时提示需要登录，使用以下方法：

1. 在 GitHub 生成 Personal Access Token：
   - GitHub → Settings → Developer settings → Personal access tokens → Generate new token
   - 勾选 `repo` 权限
   - 生成后复制 token

2. 推送时使用 token 代替密码：
   - 用户名：你的 GitHub 用户名
   - 密码：粘贴 token

### 问题 2：Permission denied

检查 SSH 公钥是否正确添加，或者改用 HTTPS 方式：

```powershell
git remote set-url origin https://github.com/你的用户名/LYSHLbot.git
```

### 问题 3：文件过大

确保 `.gitignore` 正确排除了 `node_modules`。

---

## 后续更新代码

以后更新代码使用：

```powershell
cd d:\ST\LYSHLbot

# 添加更改
git add .

# 提交
git commit -m "更新说明"

# 推送
git push
```

---

## 恭喜！

你的 LYSHLbot 已经上传到 GitHub 了！

记得：
- 在项目描述中添加徽章和说明
- 保持 README.md 更新
- 添加 LICENSE（MIT）文件
