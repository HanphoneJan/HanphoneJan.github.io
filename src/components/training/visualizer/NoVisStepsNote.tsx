/**
 * 「这篇录到轨迹了，但没有可视化步骤」的一行说明。
 *
 * ## 为什么要有这一行
 *
 * 不显示等于撒谎：读者会以为这个功能是按题目难度/类型挑的，而实际上是
 * 「算法形态不在已实现的八种之内」—— HJ31 单词倒排、HJ33 整数与 IP 转换、
 * HJ96 表示数字、KY4 反序输出都是一行正则替换或一行切片，
 * 局部变量里根本没有逐步推进的痕迹，硬画只会是一张静止的画面。
 *
 * ## 为什么挂在「完整代码实现」那一节里
 *
 * 它说的是「**这段**代码画不出来」，所以要出现在那一节里 ——
 * 与播放器同一个位置（`@theme/MDXComponents` 的 `h2` 认到那一节的标题时），
 * 读者才会把它理解成对上面这段代码的说明，而不是页脚的一句闲话。
 *
 * 收录范围见 `plugins/vis-traces` 的 `VisTracesData.noVisual`：
 * 只有「录到了轨迹但没被 adapter 认领」的题解，录制就失败的题解不在其中 ——
 * 那连轨迹都没有，说成「算法本身画不出来」是另一回事。
 */

import React from 'react';
import styles from './styles.module.css';

export default function NoVisStepsNote(): React.ReactElement {
  return (
    <p className={styles.noVisNote}>
      本题无可视化步骤：代码里没有可逐帧展示的过程（执行轨迹已经录下来，
      但局部变量里找不到推进中的中间状态 —— 比如全篇就是一次正则替换或一次切片）。
    </p>
  );
}