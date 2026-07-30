# Saber 动态素材生成方案

## 目标

在保持 Saber 面部、姿态、盔甲、剑和整体构图一致的前提下，只让布料、发梢和丝带产生克制、真实的微风响应。镜头、背景、身体和武器必须稳定，不再使用整块裙摆横向拉伸。

## 推荐路线

### 1. 保留静态母版

当前 `background.jpg` 继续作为正式静态主题和视觉基准。动态版本单独制作，未通过验收前不进入主题配置。

### 2. 生成干净背景板

以当前背景为编辑目标，移除右侧人物并补全天空、雪雾和冰面。这个背景板用于覆盖视频模型可能产生的背景漂移。

```text
Use case: precise-object-edit
Asset type: clean background plate for a locked-camera animation composite
Primary request: remove only the Saber character and her sword, then reconstruct the missing pale sky, blue-white snow mist, floating petals, and reflective ice surface naturally
Input images: Image 1 is the edit target and composition reference
Composition/framing: preserve the exact 2400x1350 canvas, horizon, empty left-side UI-safe area, perspective, and all existing background elements
Lighting/mood: preserve the original soft high-key winter daylight
Constraints: change only the character and sword area; keep every unaffected pixel and the full framing unchanged
Avoid: new characters, text, logos, UI, camera shift, crop, strong contrast, dark atmosphere, visible fill seams
```

### 3. 生成动画友好母版

先对人物做一次高保真局部编辑，让裙层的结构更清楚：腰部固定、左右裙片分层明确、剑和双腿之间留出可识别边界。此步骤只改善可动画性，不改变角色设计。

```text
Use case: identity-preserve
Asset type: animation-ready character master for a Codex desktop theme
Primary request: refine only the lower skirt construction so the heavy blue outer skirt, white underskirt, central cloth panel, lace hem, and side overskirt have clear natural separation suitable for subtle wind animation
Input images: Image 1 is the edit target and identity/composition reference
Subject: Saber, same face, hair, expression, body, pose, armor, sword, costume design, and proportions
Composition/framing: preserve the exact 2400x1350 locked composition and character placement
Materials/textures: heavy layered fabric with believable weight, crisp armor, delicate but coherent lace edges
Constraints: change only ambiguous skirt overlaps; preserve face, hands, sword, legs, armor, lighting, background, palette, and silhouette identity
Avoid: extra fabric, exposed anatomy, redesigned costume, floating cloth, exaggerated wind, duplicated lace, bent sword, camera movement, text, watermark
```

### 4. 使用图生视频生成运动源

以动画友好母版作为唯一首帧参考，生成 4 至 6 秒、锁定镜头的低风速循环候选。不要让模型生成大幅摆动，也不要同时移动身体。

```text
Locked camera and unchanged composition. Saber remains perfectly still: face, eyes, hands, torso, armor, sword, legs, and boots do not move. A very light steady winter breeze affects only the loose fabric: the heavy skirt responds slowly from the hem upward, separate skirt layers move with small phase delays, the lace follows with restrained secondary motion, and the blue ribbon and a few hair tips move slightly. Fabric has weight and inertia; no rubber deformation, breathing scale, morphing, body sway, camera motion, background motion, new particles, or lighting changes. End in the same physical state and velocity as the first frame for a seamless subtle loop.
```

至少生成三条候选，每次只调整一个变量：风向、裙边幅度或回弹延迟。不要通过一次提示同时重做构图、服装和运动。

### 5. 局部合成

从候选视频中只保留裙摆、丝带和少量发梢区域，其余区域全部使用静态母版。背景露出的部分使用干净背景板补齐。最终输出仍采用右下角局部覆盖，而不是整屏视频。

仓库提供本地合成工具：

```bash
tools/render-saber-motion-overlay.sh \
  --source /absolute/path/saber-loop-source.mp4 \
  --mask /absolute/path/saber-motion-mask.png \
  --output /absolute/path/saber-motion-candidate.webp
```

输入视频必须是已经无缝循环的 `2400×1350` 锁镜头素材；遮罩是对应右下角
`570×870` 裁片的灰度图。工具只生成透明 WebP，不会修改 `theme.json` 或启用动效。

## 验收标准

- 4 至 6 秒循环，首尾位置和速度连续。
- 腰部位移不超过 1 像素；裙边最大位移控制在 6 至 10 像素。
- 脸、手、剑、盔甲、腿、靴子和背景逐帧稳定。
- 左右裙片存在轻微相位差，但运动方向一致。
- 没有橡胶拉伸、周期性缩放、裙边融化、剑身弯曲或背景呼吸。
- 在 Codex 实际窗口尺寸下播放十分钟无明显接缝或注意力干扰。
- 动态资源未通过人工播放验收前，主题保持静态配置。

## 执行说明

当前内置图像生成适合先制作干净背景板和动画友好母版。复杂蕾丝和半透明边缘不适合普通色键抠图；如果后续需要模型原生透明分层，应先确认是否使用需要 `OPENAI_API_KEY` 的 CLI 透明输出路径。视频运动源需要另行选择支持参考图和锁定镜头的图生视频工具。
