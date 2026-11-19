# 歌词工坊

> 河图洛书专业插件，围绕固定作品组织歌词结构、逐句约束、备选和实际录音返工。

## 简介

从故事或已有歌词出发，由外部Agent通过河图稳定CLI/MCP操作；作者阅读结构、核对约束、试听实际录音和比较意见。字数、声明发音与真实听审分别判断，正文采纳与定稿由作者决定。

## 角色分流

- 使用与验收 → [用户用例](docs/04-用户用例与验收矩阵.md)
- 开发与发布 → [开发发布](docs/07-开发发布与维护.md)
- 维护专业能力 → [功能清单](CAPABILITIES.md)与[完整文档](docs/README.md)

## 快速上手

Node.js 25、npm和河图0.12.6或更新版本。执行：

```bash
npm ci
npm run build
npm run check
npm run test:unit
npm run package
```

正式制品验证由acceptance-lock.json和scripts/accept-installed.py固定；机器业务不要求运行桌面窗口。安装后通过河图发现本包Skill，不另装Codex插件。

## 边界

首版试听核验PCM16 WAV，不静默转码；LRC是逐句起始时间交换格式，不含完整专业工程。歌曲生成、演唱、声音权利、外发费用和正式选用分别决定。固定字数和韵尾标签不能认证作品质量。
