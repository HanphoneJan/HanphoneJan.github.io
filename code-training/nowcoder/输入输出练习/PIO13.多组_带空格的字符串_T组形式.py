# @nc app=nowcoder id=cff28a28d7f54419a640a8bb19f4275f topic=372 question=10979388 lang=Python3
# 2026-10-15 20:10:36
# https://www.nowcoder.com/practice/cff28a28d7f54419a640a8bb19f4275f?tpId=372&tqId=10979388
# [PIO13] 多组_带空格的字符串_T组形式

# @nc code=start

import sys

for line in sys.stdin:
    a = line.split()
    print(int(a[0]) + int(a[1]))


# @nc code=end
