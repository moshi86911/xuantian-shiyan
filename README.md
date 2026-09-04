# 玄天试炼

国风水墨 Roguelike 卡牌游戏

## 开发

```bash
npm install
npm run dev      # 启动开发服务器
npm test         # 运行测试
npm run build    # 构建生产版本
npm run typecheck
```

## 项目结构

```
src/
├── core/      # 核心引擎（无 DOM 依赖）
├── data/      # JSON 配置（卡牌、敌人、关卡）
├── ui/        # Canvas 渲染
├── levels/    # 关卡生成
├── utils/     # 工具函数
└── main.ts    # 入口
```

## 设计文档

- [设计规格](../e:/traeBulid/docs/superpowers/specs/2026-09-04-xuantian-shiyan-design.md)
- [实施计划](../e:/traeBulid/docs/superpowers/plans/2026-09-04-xuantian-shiyan.md)
