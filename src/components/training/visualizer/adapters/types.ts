/**
 * adapter 之间的共享类型。
 *
 * 单独一个文件是为了避免循环引用：roles.ts 不依赖任何具体 adapter，
 * 而各 adapter 都要引 roles.ts 的工具函数。
 */

import type {Frame} from '../types';

export interface AdapterResult {
  frames: Frame[];
  /** 数组类渲染用 boxes（看清下标与指针），bars 是给排序的大小关系用的 */
  display: 'bars' | 'boxes';
}
